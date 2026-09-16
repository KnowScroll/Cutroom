import type { StillsRecorder } from '@cutroom/contracts'
import { upsertPicture, type Db } from '@cutroom/domain'

/**
 * The stills stage's one way to make its progress durable (docs/features/reel-stills.md, Gate 2
 * "How a stills run ends"; S-046): each time a picture's check, score or Gate 1S verdict completes,
 * its row is updated, and its observation and reconciliation are written once there is one. So a
 * run that stops, fails or is killed keeps every picture made with the checks it reached.
 */
export function stillsRecorder(db: Db, runId: string): StillsRecorder {
  return {
    async record(picture) {
      upsertPicture(db, runId, picture)
    },
  }
}
