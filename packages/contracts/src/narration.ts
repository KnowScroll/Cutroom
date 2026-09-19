import type { RunResult } from '@cutroom/reel-contract'

// The narration shapes and the port that speaks (docs/features/reel-render.md, Gate 3; S-070). Types
// only. A narration's record lives in clip.ts beside a take's, where the recorder that takes both is
// declared, so this file imports nothing from it (S-079).

/** One word of a narration, in milliseconds from the start of its own audio. */
export interface WordTiming {
  word: string
  startMs: number
  endMs: number
}

export interface NarrationRequest {
  runId: string
  /** `a<attempt>-shot-<unit>-narration` — the attempt is in the id, so a restart reuses none (S-076). */
  narrationId: string
  /** The unit's sentences, in order, joined by one space (S-070). */
  text: string
  /** A setting (S-070). */
  voice: string
}

export interface NarrationReceipt {
  model: string
  characters: number
  /** 0 from the stand-in unless a test scripts a cost on it (S-036). */
  costCents: number
  fake: boolean
}

export type NarrationAnswer =
  | {
      kind: 'made'
      audio: { narrationId: string; path: string }
      /** Typed `unknown`: the pipeline parses the timings at the stage's boundary (S-070, S-042). */
      timings: unknown
      receipt: NarrationReceipt
    }
  | {
      /** Only the worker's guarded port refuses; a provider adapter never reads a budget (S-035). */
      kind: 'refused'
      limit: Extract<RunResult, { reason: 'budget' }>['limit']
      estimateCents: number
    }
  /** The provider made nothing and may if asked again: sent again by the worker's guarded port (S-096). */
  | { kind: 'unavailable'; detail: string }

/** One call a shot, in plan order, just before that shot's clip (S-070). */
export interface NarrationPort {
  speak(request: NarrationRequest): Promise<NarrationAnswer>
}
