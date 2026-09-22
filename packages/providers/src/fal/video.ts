import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { LostCall, MediaPort, VideoAnswer, VideoPort, VideoRequest } from '@cutroom/contracts'
import { artifactPath } from '../artifacts.ts'
import { Spent, isUnavailable, messageOf } from '../transient.ts'
import {
  CLIP_EXTENSION,
  DEFAULT_VIDEO_WAIT_MS,
  EXPANSION_MODE_FIELD,
  H3_TURBO,
  videoCostCents,
  type VideoEntry,
} from './h3.ts'
import {
  DEFAULT_FAL_POLL_MS,
  DEFAULT_FAL_TIMEOUT_MS,
  FAL_BASE_URL,
  FalFault,
  baseOf,
  json,
  runQueued,
  send,
} from './queue.ts'
import { uploadReference } from './upload.ts'

// THE FAL VIDEO ADAPTER — the fourth real adapter and the second on fal's queue
// (docs/features/paid-path.md, Gate 2 "The video"; checks 14, 15, 16 and 17).
//
// IT DRIVES THE SAME QUEUE THE IMAGE ADAPTER DRIVES, through the same `runQueued` (S-124): submit
// to `<base>/<slug>`, poll the request's own status, fetch the result. What differs is the wire it
// speaks, the file it downloads, the wait it allows and the CARRIER of its classification.
//
// FOUR THINGS ON EVERY REQUEST, AND EACH OF THEM FAILS SILENTLY IF IT IS WRONG.
//
//  1. **768P ALWAYS** (D-007, D-014). `resolution` is `480P|768P` and the official endpoint
//     defaults elsewhere, so it is sent explicitly and anything but 768P is refused BEFORE the
//     request — two verified features assert 768P on every receipt, and a 480P clip is a cheaper,
//     worse reel, which Gate 1 forbids outright.
//  2. **WHOLE SECONDS, 5 TO 15** (D-019, read live from fal's own schema). A fractional or
//     out-of-range duration is refused before the request: a call fal would reject is not one to
//     pay to have rejected.
//  3. **THE SEED IS THE CALLER'S** (D-018, D-019). `text-to-video` and `image-to-video` return NO
//     seed at all, so reproducibility depends entirely on the caller generating the integer and
//     persisting it — the engine makes it the take id's CRC-32. This adapter sends that integer and
//     never reads a `seed` out of the answer.
//  4. **NO `aspect_ratio` ON `image-to-video`** — "the trap that would have shipped a 16:9 clip
//     into a 9:16 product" (D-019). The field does not exist on that endpoint; the output ratio
//     follows the keyframe, which is why the image adapter asserts 9:16 on the produced frame
//     (S-124). `text-to-video` is the only endpoint that takes the ratio, and it always carries it.
//
// `prompt_expansion_mode` IS REQUIRED and the value is the caller's (D-019, D-072). The answer's
// `expanded_prompt` goes on the receipt and is shown to NO GATE: the gates judge the output against
// criteria authored before generation, and letting an expansion into that comparison would let a
// generous rewrite argue for its own output (D-072, I-8, I-9; `reel-render`'s check 24 holds the
// gate side, verified).
//
// WHY A TRANSIENT IS ANSWERED AND NOT THROWN (S-125, reading S-123's rule). `VideoAnswer` has the
// `{ kind: 'unavailable' }` arm S-096 built and `reel-takes` verified, and `apps/worker`'s guarded
// video port is what sends the call again, with backoff, on the transient counter that is never the
// take counter. Throwing would propagate past `sentUntilAvailable`, fail a whole reel on one 429,
// and leave that mechanism dead code behind the one adapter that can use it. The SPLIT is the image
// adapter's exactly (S-124) — only the carrier differs, and it differs because the ports do.
//
// **NAMED LIMIT: a transient after fal has accepted the job RE-BUYS THE CLIP.** A 429 or 5xx on the
// status poll or on the file download, and a job still queued when the wait runs out, are all
// answered `unavailable` — and the guarded port then sends the whole `generate` again, so a clip
// fal may already have made and billed is bought a second time. It is a limit, not an oversight: an
// adapter may not retry a call of its own (S-096, D-024), every re-send is budget-guarded so the cap
// still holds (S-095), there are at most three sends, and Slice 8 measures what it actually cost
// against the provider's own figures. Unlike T2A's re-buy (S-123) this one costs real money, and
// the owner was shown that and chose it over failing a reel that every earlier shot had been paid
// for.
//
// **THE RE-BUY STANDS, AND THE CLIP IT REPLACES IS NOW ON THE RECORD** (docs/features/paid-failures.md,
// S-142). A transient on the DOWNLOAD comes after the job completed, so fal made that clip and
// billed for it: the unavailable answer carries a `spent`, the worker writes the row and adds the
// cost before it sends again, and what used to be a second payment the budget guard could not see
// is now one it counts. Every failure after a completed job that is NOT transient — a result body
// that does not parse, a download that fails for any other reason, a file ffprobe cannot read as a
// clip — is `Spent`, which is thrown, carries the same row, and is never sent again.
//
// FILES, NOT BYTES, AND NEVER THE PROVIDER'S URL. The clip is downloaded under the one artifact
// root, PROBED before the answer returns, and the answer carries its local path. A fal result URL
// expires and is not ours: it reaches no receipt, no row, no message and no log line (D-022, D-086,
// D-087).
//
// A KEY REACHES ONE PLACE: the Authorization header of a call to fal's own queue and storage — never
// a URL fal handed back, and never a message (S-109).

/** What a finished clip job answers (D-019: `video, timings, expanded_prompt` — and no seed). */
const produced = z.object({
  video: z.object({
    url: z.string().min(1),
    content_type: z.string().optional(),
    file_size: z.number().optional(),
  }),
  // "Null on routes that do not report backend timings" (D-018), so it is optional AND nullable.
  timings: z.object({ inference: z.number().optional() }).nullable().optional(),
  // D-019 saw it on both endpoints. It is NOT required: a clip that is made and paid for must not
  // be thrown away over a field of metadata, and a receipt says plainly when none came back.
  expanded_prompt: z.string().optional(),
})

/** What a receipt records when the provider returned no expansion at all. Never an empty string. */
export const NO_EXPANSION = 'the provider returned no expanded_prompt'

export interface FalVideoOptions {
  /** Read by `packages/providers` and nowhere else (S-109). Sent in one header, written nowhere. */
  key: string
  /** The ONE artifact root every file goes under (D-086, D-087). */
  artifactRoot: string
  /**
   * How the downloaded clip is probed before the answer returns (check 15).
   *
   * It is the ffmpeg `MediaPort`'s own probe, handed in rather than built here (S-125): one
   * implementation of "what does ffprobe say of this file" for the whole engine, `fal/` free of
   * ffmpeg, and `packages/providers` still the only place a process is started
   * (`processes-only-in-providers`, S-075).
   */
  probe: MediaPort['probe']
  /** The one video path (D-007). Injectable so a test can prove no figure is at a call site. */
  entry?: VideoEntry
  /** Where fal's queue is. Defaults to its own; a test points it at recorded wire (S-111). */
  baseUrl?: string
  /** Where fal's storage is — a DIFFERENT host, so its own setting (S-124). */
  storageBaseUrl?: string
  fetch?: typeof globalThis.fetch
  /** How long ONE HTTP call may take. */
  timeoutMs?: number
  /** How long the whole job may sit on the queue. A clip takes minutes, an image seconds (S-125). */
  waitMs?: number
  /** How long between polls. A test sets it to nothing so a queued answer costs no wall clock. */
  pollMs?: number
}

/** Why a request may not be sent at all, or nothing. Refused BEFORE the queue, so nothing is paid. */
function requestRefusal(request: VideoRequest, entry: VideoEntry): string | undefined {
  const { resolution, durationSeconds, mode, seed } = request as {
    resolution?: unknown
    durationSeconds?: unknown
    mode?: unknown
    seed?: unknown
  }
  if (resolution !== entry.resolution) {
    return (
      `it asks for ${String(resolution)}, and this engine's clips are ${entry.resolution} always: ` +
      `the resolution is hard-locked and two verified features assert it on every receipt ` +
      `(D-007, D-014)`
    )
  }
  if (
    typeof durationSeconds !== 'number' ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < entry.minSeconds ||
    durationSeconds > entry.maxSeconds
  ) {
    return (
      `it asks for ${String(durationSeconds)} seconds, and the endpoint takes whole seconds ` +
      `${entry.minSeconds} to ${entry.maxSeconds} (D-019)`
    )
  }
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    return (
      `it carries the seed ${String(seed)}, and neither endpoint returns one — a seed that is not ` +
      `a whole number made by the caller cannot be reproduced from anything (D-018, D-019)`
    )
  }
  if (mode === 'image-to-video') {
    if (typeof request.image?.path !== 'string' || request.image.path === '') {
      return `it is image-to-video with no picture, which a provider handles as text-to-video at its own ratio (D-019, D-036)`
    }
    return undefined
  }
  if (mode === 'text-to-video') {
    if (request.aspectRatio !== '9:16') {
      return `it is text-to-video without aspectRatio 9:16, so the provider would make its default ratio (D-019, S-080)`
    }
    return undefined
  }
  return `its mode is ${String(mode)}, and this engine calls image-to-video and text-to-video only (D-007, D-026, D-037)`
}

export function falVideo(options: FalVideoOptions): VideoPort {
  const entry = options.entry ?? H3_TURBO
  const base = baseOf(options.baseUrl, FAL_BASE_URL)
  const fetch = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_FAL_TIMEOUT_MS
  const waitMs = options.waitMs ?? DEFAULT_VIDEO_WAIT_MS
  const pollMs = options.pollMs ?? DEFAULT_FAL_POLL_MS

  return {
    async generate(request): Promise<VideoAnswer> {
      const what = `the clip ${request.takeId}`
      const refused = requestRefusal(request, entry)
      if (refused !== undefined) {
        throw new FalFault(`${what} is refused before any request is made: ${refused}`)
      }

      try {
        return await made(request, what)
      } catch (error) {
        // THE ONE PLACE THE CARRIER DIFFERS FROM THE IMAGE ADAPTER'S (S-125). The classification is
        // the queue driver's and is identical; what happens to it is the port's, and this port has
        // the arm S-096 built. A fault is thrown on, as everywhere else.
        if (isUnavailable(error)) return { kind: 'unavailable', detail: error.message }
        throw error
      }
    },
  }

  /** The whole call: upload if it needs one, submit, wait, download, probe, record. */
  async function made(request: VideoRequest, what: string): Promise<VideoAnswer> {
    // image-to-video needs a picture FAL CAN FETCH, and ours is a file under the artifact root.
    // The ONE function that gets it there is `uploadReference` (Gate 2, S-114, check 15) — the same
    // one every image reference goes through, and there is no second one anywhere.
    const slug = request.mode === 'image-to-video' ? entry.imageToVideoSlug : entry.textToVideoSlug
    const image_url =
      request.mode === 'image-to-video'
        ? await uploadReference(request.image.path, {
            key: options.key,
            storageBaseUrl: options.storageBaseUrl,
            fetch,
            timeoutMs,
          })
        : undefined

    const answered = await runQueued({
      slug,
      what,
      base,
      pollMs,
      timeoutMs,
      waitMs,
      fetch,
      key: options.key,
      input: {
        prompt: request.prompt,
        duration: request.durationSeconds,
        resolution: entry.resolution,
        [EXPANSION_MODE_FIELD]: request.promptExpansionMode,
        // THE CALLER'S, never the provider's and never a fresh one (D-018).
        seed: request.seed,
        // The spike's own field, on the wire D-019 drove live on 2026-09-03.
        enable_safety_checker: true,
        // `image-to-video` HAS NO `aspect_ratio` FIELD AT ALL, and `text-to-video` is the only
        // endpoint that takes it — so the ratio rides with the picture, or with the words, and
        // never with both (D-018's schema fact 1, D-019).
        ...(image_url === undefined ? { aspect_ratio: '9:16' } : { image_url }),
      },
    })
    // EVERYTHING BELOW THIS LINE IS PAID FOR (docs/features/paid-failures.md, Gate 2, S-142). The
    // job COMPLETED: fal made the clip and billed for it — the most expensive single call this
    // engine makes — so a failure in our reading of it is `Spent`, carrying the row the call owes,
    // and never a plain fault that leaves the budget guard reading the spend as zero (S-133).
    // The cost is the same arithmetic the receipt below uses, computed once.
    const costCents = videoCostCents(entry, request.durationSeconds)
    const lost = (detail: string): LostCall => ({ port: 'video', model: slug, costCents, detail })

    let result: z.infer<typeof produced>
    try {
      result = json(answered.body, produced, `${what}'s result`)
    } catch (error) {
      throw new Spent(lost(messageOf(error)))
    }

    // The file, fetched from the URL fal keeps it at. NO KEY on this call: it is fal's own file
    // host, with its own authorisation, and ours has no business there (S-109, D-022).
    //
    // A TRANSIENT HERE STILL RE-BUYS THE CLIP (S-125, check 15) — and the clip fal has already
    // made goes on the record before the second one is bought, or this run pays twice and the
    // guard sees one of them. That is what `spent` on the unavailable answer carries.
    let bytes: Uint8Array
    try {
      bytes = await (
        await send(result.video.url, `${what}'s file`, { method: 'GET', timeoutMs, fetch })
      ).bytes()
    } catch (error) {
      if (isUnavailable(error)) {
        return { kind: 'unavailable', detail: error.message, spent: lost(error.message) }
      }
      throw new Spent(lost(messageOf(error)))
    }

    const path = artifactPath(
      options.artifactRoot,
      { runId: request.runId, id: request.takeId, what: 'takeId' },
      CLIP_EXTENSION,
      'the fal video adapter',
    )
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, bytes)

    // PROBED BEFORE THE ANSWER RETURNS (check 15). ffprobe has to read a path, so the file is
    // written first and REMOVED if it is not a clip — nothing that failed is left under the root
    // for a restart to find, which is the shape S-124 gave the image adapter's frame check.
    //
    // It asks one question only: is this a readable file with a picture in it. Duration, frame
    // rate, streams and the rest are Gate 2's, judged on the same probe by a verified feature
    // (reel-render), and an adapter that judged them would be a gate in the wrong place.
    const probed = await options.probe({ id: request.takeId, path })
    if (!probed.readable || probed.video === null) {
      rmSync(path, { force: true })
      throw new Spent(
        lost(
          `${what} downloaded ${bytes.length} bytes that ffprobe cannot read as a clip with a ` +
            `picture in it, so the file is not what the provider said it made`,
        ),
      )
    }

    return {
      kind: 'made',
      clip: { takeId: request.takeId, path },
      receipt: {
        model: slug,
        requestId: answered.requestId,
        // THE CONFIGURED RATE APPLIED TO THE SECONDS ASKED FOR, rounded up as the guard rounds —
        // fal's answer carries no price at all (S-059, D-083, the gate review's finding 6).
        costCents,
        fake: false,
        // D-072: recorded on the receipt, and shown to no gate.
        expandedPrompt: result.expanded_prompt ?? NO_EXPANSION,
      },
    }
  }
}
