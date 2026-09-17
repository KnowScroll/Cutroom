import type {
  ClipRef,
  ClipScan,
  MediaPort,
  MediaProbe,
  RenderSettings,
  TakeVerdict,
} from '@cutroom/contracts'

// Gate 2, technical, on a take (docs/features/reel-render.md, Gate 2 "Gates 2 to 5 on each take";
// S-072, I-7, I-17). The file is MEASURED: the media port probes its streams and shape, and scans it
// once for black and frozen stretches — handed the shortest stretch each is failed for — and for
// silence and loudness. What a real clip is conformed for later is recorded and fails nothing: its
// length, its frame rate, its sample rate and channels, a missing sound, silence and loudness.

/** The measures Gate 2 records on a take, as each is taken. */
export type Gate2Progress = { probe: MediaProbe } | { scan: ClipScan }

const at = (seconds: number) => Number(seconds.toFixed(3))

/** Why a measured clip fails Gate 2, or nothing. `scan` is null when the file could not be scanned. */
export function technicalFailures(
  probe: MediaProbe,
  scan: ClipScan | null,
  technical: RenderSettings['technical'],
): string[] {
  if (!probe.readable) return ['the file is not readable']
  if (probe.video === null) return ['the file has no video stream']
  const failed: string[] = []
  const { width, height } = probe.video
  const ratio = height > 0 ? width / height : Infinity
  // D-019's trap: a 16:9 clip in a 9:16 reel.
  if (!(Math.abs(ratio - 9 / 16) <= technical.aspectTolerance)) {
    failed.push(
      `its picture is ${width}x${height}, whose width over its height differs from 9/16 by more than ${technical.aspectTolerance}`,
    )
  }
  for (const stretch of scan?.black ?? []) {
    if (stretch.seconds >= technical.blackSeconds) {
      failed.push(
        `it is black for ${at(stretch.seconds)} s from ${at(stretch.startSeconds)} s, at least ${technical.blackSeconds} s`,
      )
    }
  }
  for (const stretch of scan?.frozen ?? []) {
    if (stretch.seconds >= technical.frozenSeconds) {
      failed.push(
        `it is frozen for ${at(stretch.seconds)} s from ${at(stretch.startSeconds)} s, at least ${technical.frozenSeconds} s`,
      )
    }
  }
  return failed
}

/**
 * Measures a take and decides Gate 2. `progress` is handed each measure as it is taken, so what was
 * measured is durable before the next call. A file that is not readable, or has no video stream, is
 * not scanned: there is no picture to scan. A thrown call rejects, and the stage fails the run.
 */
export async function gate2(
  clip: ClipRef,
  media: MediaPort,
  technical: RenderSettings['technical'],
  progress: (fields: Gate2Progress) => Promise<void>,
): Promise<TakeVerdict> {
  const ref: ClipRef = { takeId: clip.takeId, path: clip.path }
  const probe = await media.probe({ id: ref.takeId, path: ref.path })
  await progress({ probe })
  let scan: ClipScan | null = null
  if (probe.readable && probe.video !== null) {
    scan = await media.scan(ref, {
      blackSeconds: technical.blackSeconds,
      frozenSeconds: technical.frozenSeconds,
    })
    await progress({ scan })
  }
  const reasons = technicalFailures(probe, scan, technical)
  return {
    gate: '2',
    outcome: reasons.length === 0 ? 'accept' : 'fail',
    reasons,
    coverage: { strategy: 'whole file' },
  }
}
