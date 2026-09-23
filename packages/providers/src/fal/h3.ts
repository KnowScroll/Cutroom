// THE ONE VIDEO PATH, AS DATA (D-007, D-018, D-019; docs/features/paid-path.md, Gate 2 "The
// video"). `fal-ai/minimax-h3-turbo/{image-to-video,text-to-video}` and nothing else.
//
// WHY THIS IS NOT A REGISTRY, AND IS STILL A FILE OF ITS OWN. D-028 makes the image model a closed
// registry because four candidates are admitted and the axis that separates them has never been
// measured. D-007 does the opposite for video: it HARD-LOCKS one alias at one resolution, because
// MiniMax's token plan excludes H3 and fal is the only path the owner's keys reach. So there is
// nothing to choose — and the figures still have to live somewhere that both the receipt a call
// writes and the estimate admission makes can read, or a rate becomes a constant at a call site
// and every pre-flight estimate is wrong in the direction that overspends the moment it moves
// (D-014, I-1, and S-124's reading of it for the image side).
//
// THE SLUGS ARE SPELLED HERE AND NOWHERE ELSE, as D-028 requires of the image slugs: a test reads
// this repository's own source and fails if an adapter, a composition root or a stage names one.
//
// THE RATE IS BUDGET.md'S $0.04/s FOR H3 TURBO AT 768P, AND IT IS STILL UNREAD. D-007: "The alias
// page renders no price. Confirm the observed rate from the fal dashboard after the first job" —
// its open Q9, which Slice 8 closes. It is the same figure `DEFAULT_PLAN_SETTINGS` already plans
// with, so nothing moves today; when the dashboard is read, one line here moves and both the
// receipt and the estimate follow.

/** The one video path, as data. Injectable so a test can prove no figure is spelled at a call site. */
export interface VideoEntry {
  /** From the shot's chosen picture: the workhorse (D-007). */
  imageToVideoSlug: string
  /** From words, for an establishing shot or a degraded one (D-007, D-050). */
  textToVideoSlug: string
  /** Cents a second of clip: a wide margin over fal's own billing, read in S-154 (S-155, D-007's Q9). */
  rateCentsPerSecond: number
  /** 768P ALWAYS. 480P exists in the schema and D-007 hard-locks it out (D-014). */
  resolution: '768P'
  /** D-019, read live from fal's own schema: `duration` is 5..15, whole seconds, default 5. */
  minSeconds: number
  maxSeconds: number
}

/**
 * The alias the owner chose and holds a key for, at the only resolution D-007 admits.
 *
 * `reference-to-video` is deliberately absent: D-018 prices it at twice the workhorse and no stage
 * asks for it (S-091 makes every take its shot's own way), so no adapter is built for it — named
 * in this feature's deferral list rather than left as an unused branch.
 */
export const H3_TURBO: VideoEntry = {
  imageToVideoSlug: 'fal-ai/minimax-h3-turbo/image-to-video',
  textToVideoSlug: 'fal-ai/minimax-h3-turbo/text-to-video',
  // 0.5 cents a second (S-155): at least 16x the most fal billed a second of clip (S-154),
  // so a clip that computes far longer than any seen is still over-priced, never under (D-014).
  rateCentsPerSecond: 0.5,
  resolution: '768P',
  minSeconds: 5,
  maxSeconds: 15,
}

/**
 * `prompt_expansion_mode` is REQUIRED on every H3 call (D-019, read live from the schema). The
 * VALUE is the caller's — `RenderSettings.promptExpansionMode`, D-072's least-rewriting mode, still
 * `balanced` until O-20 is read — and this adapter never substitutes one of its own.
 */
export const EXPANSION_MODE_FIELD = 'prompt_expansion_mode'

/** The extension every clip is written with, under the artifact root (D-086, D-087). */
export const CLIP_EXTENSION = '.mp4'

/**
 * HOW LONG ONE CLIP MAY SIT ON FAL'S QUEUE before the adapter calls the provider unavailable.
 *
 * **This is not the per-request timeout**, and the two were deliberately split in `runQueued` when
 * this adapter was written. An image job answers in seconds, so one figure served both; a real clip
 * takes MINUTES (S-113), and a shared 120 s would have declared a job fal was still working on
 * `unavailable` — which sends the whole `generate` again and BUYS A SECOND CLIP. The per-request
 * figure stays `DEFAULT_FAL_TIMEOUT_MS`: it bounds one HTTP call, not the wait.
 *
 * **Ten minutes is a declared default and a guess until Slice 8 measures a real reel**, as the
 * lease floor is (S-113). The one measurement that exists is D-019's spike: a 5-second 768P clip
 * came back in **7 seconds of wall clock**, so ten minutes is about 85x the only figure anyone has.
 * Too long costs only the time a genuinely stuck job waits; too short costs a clip.
 */
export const DEFAULT_VIDEO_WAIT_MS = 600_000

/**
 * The most clips one clips job can ask for: every shot of the largest fork, at the full ladder
 * (D-024, D-112, S-090). It is what the lease floor is computed from — `apps/service` reads it —
 * so the floor and the wait can never drift apart into a job that outlives its own lease and is
 * claimed again, paying a second time for the take in flight (S-113, S-092, D-014).
 *
 * It is stated as the arithmetic rather than as 18, so a settings change that admits a longer reel
 * raises the floor with it.
 */
export function clipsAJob(shotCountUnits: readonly number[], takesAShot: number): number {
  return Math.max(...shotCountUnits) * takesAShot
}

/**
 * What one clip is charged, **in whole cents, rounded up** — the receipt's figure.
 *
 * fal's answer carries no price at all (Gate 2, and the gate review's finding 6), so the cost is
 * the configured rate applied to **the seconds asked for**, not to the seconds that came back: the
 * spike's 5-second request returned a 5.184-second file, and paying for what a provider rounded to
 * would make every receipt a number nothing else can reproduce. Rounded up because
 * `generation_receipt.cost_cents` is an integer column and because the budget guard rounds up
 * (S-059): a cost rounded the other way understates spend against a cap.
 */
export function videoCostCents(entry: VideoEntry, seconds: number): number {
  return Math.ceil(entry.rateCentsPerSecond * seconds)
}
