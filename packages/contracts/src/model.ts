import type { z } from 'zod'
import type { PictureRef } from './picture.ts'

// The one port for model calls (D-006, D-084), carrying three: `structured`, `observe` and
// `compare`. Each is a shape ON this port and never a port of its own, so there is exactly one
// seam a stand-in replaces and one place every call's receipt comes from (D-005).
//
// PICTURES ENTER THROUGH `observe` AND `compare` ONLY (S-037). Review 4 of reel-engine found the
// witness could be sighted by another route: a `structured` call that accepts an image, a free
// prompt and any schema lets a Gate 1 step show the brief to a vision call. So `structured`
// carries no picture and cannot be the witness, and neither picture call carries a prompt, a
// schema or a criterion — their questions are fixed inside the adapter (I-8, D-042).

/** Which job a call does. The model each role is routed to is a setting (D-006). */
export type ModelRole = 'planner' | 'reconciler' | 'witness' | 'judge'

/** Which of the port's three calls a receipt came from (S-037). */
export type ModelCall = 'structured' | 'observe' | 'compare'

/** What every call returns beside its value, and what becomes its `model_receipt` row (D-005). */
export interface ModelReceipt {
  model: string
  role: ModelRole
  call: ModelCall
  temperature: number
  usage: { inputTokens: number; outputTokens: number }
  /** True when the stand-in answered, never a real model. */
  fake: boolean
  /**
   * The pictures this call was about. An observation is tied to the one `observe` receipt whose
   * `pictureIds` is its picture's, and a reconciliation to the one `reconciler` receipt whose
   * `pictureIds` is its picture's — by key, with no receipt id stored (S-037, S-046).
   */
  pictureIds: readonly string[]
}

export interface LanguageModelPort {
  /** Prompt, schema, role and temperature in; the value parsed under that schema, and a receipt, out. */
  structured<T>(call: {
    prompt: string
    schema: z.ZodType<T>
    role: 'planner' | 'reconciler'
    temperature: 0
    /** Ids for the receipt; never a picture (S-037). */
    pictureIds?: readonly string[]
  }): Promise<{ value: T; receipt: ModelReceipt }>

  /**
   * A picture and a temperature, and nothing else: role `witness`. The question and the answer
   * shape are fixed inside the adapter, so there is no field a brief could be written into (I-8).
   * The value is `unknown` and is parsed by the pipeline at the gate boundary (D-041, S-042).
   */
  observe(call: { picture: PictureRef; temperature: 0 }): Promise<{
    value: unknown
    receipt: ModelReceipt
  }>

  /**
   * Gate 1S's adjudication, role `judge` (D-049, S-045): two pictures and the names of the
   * subjects their shots share. It records no observation, so the one record of what a picture
   * shows is still its one `observe` (I-15).
   */
  compare(call: {
    /** The canonical, then the derived picture. */
    pictures: readonly [PictureRef, PictureRef]
    subjects: readonly string[]
    temperature: 0
  }): Promise<{ value: unknown; receipt: ModelReceipt }>
}
