import type { z } from 'zod'

// The one port for model calls (D-006), carrying one call here: `structured` (D-084). The call is a
// shape ON this port and never a port of its own, so there is exactly one seam a stand-in replaces
// and one place every call's receipt comes from (D-005). Vision and `observe` are reel-stills'.

/** Which job a call does. The model each role is routed to is a setting (D-006). */
export type ModelRole = 'planner' | 'reconciler'

/** What every call returns beside its value, and what becomes its `model_receipt` row (D-005). */
export interface ModelReceipt {
  model: string
  role: ModelRole
  temperature: number
  usage: { inputTokens: number; outputTokens: number }
  /** True when the stand-in answered, never a real model. */
  fake: boolean
}

export interface LanguageModelPort {
  /** Prompt, schema, role and temperature in; the value parsed under that schema, and a receipt, out. */
  structured<T>(call: {
    prompt: string
    schema: z.ZodType<T>
    role: ModelRole
    temperature: 0
  }): Promise<{ value: T; receipt: ModelReceipt }>
}
