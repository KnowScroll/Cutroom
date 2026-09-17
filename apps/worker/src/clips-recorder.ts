import type { ClipsRecorder } from '@cutroom/contracts'
import { upsertNarration, upsertTake, type Db } from '@cutroom/domain'

/**
 * The clips stage's one way to make its progress durable (docs/features/reel-render.md, Gate 2 "How
 * a video run ends"; S-070 to S-072): each time a narration is measured or parsed, or a take's measure
 * or gate completes, its row is updated, and a take's observation and reconciliation are written once
 * there is one. So a run that stops, fails or is killed keeps every narration and take made with the
 * gates it reached.
 */
export function clipsRecorder(db: Db, runId: string): ClipsRecorder {
  return {
    async take(take) {
      upsertTake(db, runId, take)
    },
    async narration(narration) {
      upsertNarration(db, runId, narration)
    },
  }
}
