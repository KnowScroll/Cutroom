import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { ImageAnswer, ImagePort } from '@cutroom/contracts'
import { artifactPath } from '../artifacts.ts'
import { Spent, messageOf } from '../transient.ts'
import { PICTURE_EXTENSION, pictureFrame } from './frame.ts'
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
import {
  PICTURE_MIN_SHORT_SIDE,
  admitEntry,
  imageCostCents,
  wireFor,
  type Frame,
  type ImageEntry,
} from './registry.ts'
import { uploadReference } from './upload.ts'

// THE FAL IMAGE ADAPTER — the third real adapter, and the first on a second provider and a second
// key (docs/features/paid-path.md, Gate 2 "The image"; checks 11, 12 and 13).
//
// IT RESOLVES ITS MODEL FROM D-028'S CLOSED REGISTRY. No slug is spelled here; the entry is handed
// in, already admitted, and every figure the call is charged is that entry's own data. `fetch` and
// `zod`, no SDK and no new npm package (S-114).
//
// AN ENTRY HAS TWO WIRES, AND THE CALL PICKS ONE (S-128). D-027's ladder makes the canonical
// picture from NOTHING — `makeStills` passes `references: []`, because it is the first picture of
// the reel — and every picture after it is derived from that one. fal's published schemas make
// `image_urls` a REQUIRED field on three of the four admitted edit wires, so an entry with one
// wire could not make the picture every other picture is made from. A call carrying no reference
// goes to the entry's text wire and one carrying a reference to its edit wire; the receipt records
// whichever was called.
//
// TWO REQUIREMENTS FAIL SILENTLY, AND BOTH ARE ASSERTED RATHER THAN TRUSTED.
//
//  1. **The entry takes reference pictures** (D-026). Without them there is no way to carry
//     identity across shots and D-027's derive step has no mechanism — and the failure is silent,
//     because the pictures still arrive and only the identity drifts. Asserted at construction,
//     before the database is opened: the service refuses to start.
//  2. **The produced picture is 9:16** (D-028, D-019). `image-to-video` has no `aspect_ratio`
//     field, so a landscape keyframe yields a LANDSCAPE CLIP WITH NO ERROR that no downstream gate
//     catches. Asserted ON THE FRAME — the bytes that came back — and never on the width and
//     height fal reports beside them, which is what "not trusted" means. A picture that fails it
//     fails the CALL, naming the entry, so it never reaches image-to-video at all.
//
// The frame is also held to 768P on its short side: 576 × 1024 is exactly 9:16 and below the
// resolution D-007 hard-locks, so a clip made from it would be upscaled — and the keyframe is what
// the viewer sees at t=0 (D-014, D-026). It passes the ratio test, which is why it is named here.
//
// WHY A TRANSIENT IS THROWN AND NOT ANSWERED (S-124). `ImageAnswer` has two arms — `made`, and the
// `refused` the worker's guarded port answers when a call would breach a budget, which a provider
// adapter may never construct (S-035). There is no `unavailable` arm, and S-096 says plainly that
// image calls are not covered by the guarded retry. So the classification is carried by the
// error's TYPE, exactly as the model adapter carries it (S-122), and the split is identical:
// 429, 5xx, 408, a connection error and our own timeout are `Unavailable`; 400, 401, 403, 422, a
// body that does not parse and a job fal accepted and then failed are faults. **The adapter only
// classifies**: it never sends again, waits between sends or counts.
//
// AND A THIRD CLASS, ONCE THE JOB HAS COMPLETED (docs/features/paid-failures.md, S-142). From that
// point fal has made the picture and billed for it, so every failure after it — a result body that
// does not parse, no picture in it, a download that fails, bytes that are no picture, a frame this
// entry refuses — is `Spent`, carrying the row that call owes the record. A plain fault there is
// spend the budget guard reads as zero, which is what happened twice on the first real reel
// (S-133). A transient status on the DOWNLOAD is `Spent` too, and not `Unavailable`: nothing
// retries an image call, so calling it transient would buy no second send and only lose the row.
//
// FILES, NOT BYTES, AND NEVER THE PROVIDER'S URL. The picture is downloaded under the one artifact
// root and the answer carries its local path. fal's result URL expires and is not ours: it reaches
// no receipt, no row, no message and no log line (D-022, D-086, D-087).
//
// A KEY REACHES ONE PLACE: the Authorization header of a call to fal itself — never a URL fal
// handed back, and never a message (S-109).

/**
 * What a finished image job answers. `width` and `height` are recorded and trusted for nothing.
 *
 * **EVERY FIELD THIS ADAPTER DOES NOT READ ADMITS `null` AS WELL AS ABSENT** (S-133). Measured
 * 2026-09-22, on the first real reel's canonical picture: the seedream text wire answered **200
 * with `width: null` and `height: null`**, and `z.number().optional()` refuses a null — so a
 * picture fal had already made, and had already billed for, was thrown away by a field nothing
 * reads.
 *
 * `url` is NOT among them. It is the one field here the adapter uses, it was not null, and a
 * schema that admitted a null url would turn a missing picture into a fetch of nothing.
 */
const untrusted = <T extends z.ZodType>(of: T) => of.nullish()

const produced = z.object({
  images: z.array(
    z.object({
      url: z.string().min(1),
      width: untrusted(z.number()),
      height: untrusted(z.number()),
      content_type: untrusted(z.string()),
    }),
  ),
  seed: untrusted(z.number()),
  prompt: untrusted(z.string()),
})

export interface FalImageOptions {
  /** Read by `packages/providers` and nowhere else (S-109). Sent in one header, written nowhere. */
  key: string
  /** The admitted entry this port is configured with (D-028). Already looked up; never a slug. */
  entry: ImageEntry
  /** The ONE artifact root every file goes under (D-086, D-087). */
  artifactRoot: string
  /** Where fal's queue is. Defaults to its own; a test points it at recorded wire (S-111). */
  baseUrl?: string
  /** Where fal's storage is — a DIFFERENT host, so its own setting (S-124). */
  storageBaseUrl?: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  /** How long between polls. A test sets it to nothing so a queued answer costs no wall clock. */
  pollMs?: number
}

/** How the entry's wire is asked for the frame: its pixels, or an aspect ratio and a tier. */
function frameInput(entry: ImageEntry): Record<string, unknown> {
  if (entry.ask === 'size') {
    return { image_size: { width: entry.frame.width, height: entry.frame.height } }
  }
  return { aspect_ratio: '9:16', resolution: entry.tier }
}

/**
 * Why a produced frame is not one this engine may hand on, or nothing. It names **the wire that
 * was called**, not the entry's edit slug, because a canonical is made on the text wire and an
 * operator reading the refusal needs the slug that produced the frame (S-128).
 */
function frameRefusal(frame: Frame, slug: string): string | undefined {
  if (frame.width * 16 !== frame.height * 9) {
    return (
      `'${slug}' produced a ${frame.width}x${frame.height} picture, which is not 9:16. ` +
      `image-to-video has no aspect_ratio field, so this picture would yield a clip of its own ` +
      `shape with no error at all (D-019, D-028)`
    )
  }
  if (Math.min(frame.width, frame.height) < PICTURE_MIN_SHORT_SIDE) {
    return (
      `'${slug}' produced a ${frame.width}x${frame.height} picture, whose short side is ` +
      `below ${PICTURE_MIN_SHORT_SIDE}: a clip is 768P always, so this keyframe would be ` +
      `upscaled into the frame the viewer sees at t=0 (D-007, D-014, D-026)`
    )
  }
  return undefined
}

export function falImage(options: FalImageOptions): ImagePort {
  // D-026's admission gate, thrown where the port is built — before the database is opened, before
  // a job is claimed and before a file is written (S-075's form, D-028's startup assertion).
  admitEntry(options.entry)

  const entry = options.entry
  const base = baseOf(options.baseUrl, FAL_BASE_URL)
  const fetch = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_FAL_TIMEOUT_MS
  const pollMs = options.pollMs ?? DEFAULT_FAL_POLL_MS

  return {
    // What `apps/worker` reads before its own database is opened (D-026, S-077). It is the entry's
    // own data, never a constant: an entry that took none would not have built this port at all.
    acceptsReferences: entry.maxReferences >= 1,

    async generate(request): Promise<ImageAnswer> {
      // WHICH OF THE ENTRY'S TWO WIRES THIS CALL GOES TO (S-128). A call carrying a reference
      // picture is an edit; one carrying none is the canonical, the first picture of the reel,
      // which there is nothing to derive from — and three of the four admitted edit wires make
      // `image_urls` a required field, so the canonical sent to an edit wire is refused 422
      // before anything is made. The branch is the registry's, beside the data, so there is one
      // answer to "which slug is this call's" and the receipt records what was actually called.
      const slug = wireFor(entry, request.references.length)
      const what = `the picture ${request.pictureId} on '${slug}'`

      if (request.references.length > entry.maxReferences) {
        throw new FalFault(
          `${what} carries ${request.references.length} reference pictures, and the entry takes ` +
            `${entry.maxReferences} (D-028)`,
        )
      }

      // Every reference is a file on this machine, and fal cannot read one. The ONE function that
      // gets it there is `uploadReference` (Gate 2, S-114) — and it is the only thing in this
      // adapter that talks to fal's storage rather than its queue.
      const image_urls: string[] = []
      for (const reference of request.references) {
        image_urls.push(
          await uploadReference(reference.path, {
            key: options.key,
            storageBaseUrl: options.storageBaseUrl,
            fetch,
            timeoutMs,
          }),
        )
      }

      const answered = await runQueued({
        slug,
        what,
        base,
        pollMs,
        timeoutMs,
        // An image job answers in seconds, so its whole-job wait IS its per-request timeout —
        // the one figure this adapter has always used. A clip takes minutes and takes its own
        // (S-125); nothing about the image path moved when the two were split.
        waitMs: timeoutMs,
        fetch,
        key: options.key,
        input: {
          prompt: request.prompt,
          ...(image_urls.length > 0 ? { image_urls } : {}),
          ...frameInput(entry),
          num_images: 1,
        },
      })

      // EVERYTHING BELOW THIS LINE IS PAID FOR (docs/features/paid-failures.md, Gate 2). The job
      // COMPLETED: fal made the picture, and what fails now is our reading of it, not its making.
      // So each of these is `Spent`, carrying the row the call owes the record — a plain fault
      // here leaves the budget guard reading the spend as zero, which is what happened twice on
      // the first real reel (S-133, S-142). The cost is the same arithmetic the receipt below
      // uses, computed once, so a lost call and a made one cannot be priced differently.
      const costCents = imageCostCents(entry, {
        frame: entry.frame,
        references: request.references.map(() => entry.frame),
      })
      const spent = (detail: string) => new Spent({ port: 'image', model: slug, costCents, detail })

      let result: z.infer<typeof produced>
      try {
        result = json(answered.body, produced, `${what}'s result`)
      } catch (error) {
        throw spent(messageOf(error))
      }

      const made = result.images[0]
      if (made === undefined) {
        throw spent(`${what} finished and carried no picture at all`)
      }

      // The file, fetched from the URL fal keeps it at. NO KEY on this call: it is fal's own file
      // host, with its own authorisation, and ours has no business there (S-109, D-022).
      //
      // A FAILURE HERE IS `Spent` AND NOT `Unavailable`, although the same status would be
      // transient before the job completed: nothing retries an image call (S-096, S-122), so
      // classifying it as transient buys no second send and only loses the row.
      let bytes: Uint8Array
      try {
        bytes = await (
          await send(made.url, `${what}'s file`, { method: 'GET', timeoutMs, fetch })
        ).bytes()
      } catch (error) {
        throw spent(messageOf(error))
      }

      // THE FRAME IS READ OFF THE BYTES. `made.width` and `made.height` are the provider's account
      // of what it made, and D-028 says this requirement is checked on the produced frame because
      // it fails silently — so they are never read here.
      const frame = pictureFrame(bytes)
      if (frame === undefined) {
        throw spent(
          `${what} answered ${bytes.length} bytes that are no picture this adapter can read`,
        )
      }
      const refused = frameRefusal(frame, slug)
      // Thrown BEFORE the file is written, so a picture that failed its frame is not left under
      // the artifact root for anything to pick up.
      if (refused !== undefined) throw spent(refused)

      const path = artifactPath(
        options.artifactRoot,
        { runId: request.runId, id: request.pictureId, what: 'pictureId' },
        PICTURE_EXTENSION[frame.format],
        'the fal image adapter',
      )
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, bytes)

      return {
        kind: 'made',
        picture: { pictureId: request.pictureId, path },
        receipt: {
          // THE WIRE THAT WAS ACTUALLY CALLED, which is what a receipt is a record of — and what
          // D-028's bake-off compares gate pass rates across. Never `entry.slug` whatever was
          // sent: a canonical made on the text wire and recorded as an edit is a row that cannot
          // be reconciled with the provider's own (S-128, D-028).
          model: slug,
          // The CONFIGURED ENTRY'S RATE applied to this call, in whole cents rounded up as the
          // guard rounds (S-059, D-083). Never a constant: the same arithmetic feeds admission's
          // estimate, so a reel cannot be priced by one model and bought from another.
          costCents,
          fake: false,
        },
      }
    },
  }
}
