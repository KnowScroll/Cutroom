import type { ModelCall, ModelRole } from './model.ts'

// A model answer that could not be read, as it is KEPT (docs/features/ask-again.md, Gate 2 "What
// is kept"; S-156): one `refused_answer` row, so a person can read what the model wrote. Nothing in
// the engine reads it back.
//
// Two writers, one table. An answer the ADAPTER could not read travels on its `Spent` and is written
// by the worker's recording port; a value a GATE refused — a witness's observation, a narration's
// word timings — is handed by the pipeline to the `refusals` port its stage is given.

export interface RefusedAnswer {
  /** A model call, or a narration's word timings. */
  port: 'model' | 'speech'
  /** The model's role and call; null for a timing. */
  role: ModelRole | null
  call: ModelCall | null
  /** The picture, take or narration ids the answer was about, as its receipt names them. */
  about: readonly string[]
  /** 1 for a first ask; 2 for the ask after a refusal. */
  ask: 1 | 2
  /** Why it was refused, one reason a line. */
  reasons: readonly string[]
  /** What the model answered: its text, or the refused value as JSON. Redacted and capped when kept. */
  answer: string
}

/** Where a stage hands each refusal a gate made, to be kept (S-156). */
export interface RefusalRecorder {
  keep(answer: RefusedAnswer): Promise<void>
}
