import type { Plan, PlanSettings } from '@cutroom/contracts'

// What the reel would cost to generate as planned, in integer cents (D-083). Both rates are
// settings. Every shot costs the same video with or without a keyframe (I-3), so the video term
// does not depend on the ranking.

/** `planned image calls × image rate + total shot seconds × video rate per second`, rounded up. */
export function estimate(
  plan: Pick<Plan, 'shots' | 'plannedImageCalls'>,
  settings: Pick<PlanSettings, 'imageRateCents' | 'videoRateCentsPerSecond'>,
): number {
  const seconds = plan.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0)
  return Math.ceil(
    plan.plannedImageCalls * settings.imageRateCents + seconds * settings.videoRateCentsPerSecond,
  )
}
