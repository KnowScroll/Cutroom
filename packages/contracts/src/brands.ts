// The two brands a second ask's reasons carry (docs/features/ask-again.md, Gate 2 "What the second
// ask says"; S-156). TYPES ONLY, AND THIS FILE IMPORTS NOTHING: `failures.ts` and `model.ts` name
// them, and `no-circular` counts type imports, so a brand declared anywhere that imports back into
// either would be a cycle (the review's round 2, finding 2).
//
// A brand is a `readonly string[]` no string array can be assigned to without a cast. Only
// `refusals.ts` builds them, and `ask-again`'s check 6 finds no cast to either anywhere else.

declare const refusals: unique symbol
declare const witnessRefusals: unique symbol

/**
 * Why a `structured` answer was refused, one reason a line: its schema's issues as `<path>:
 * <message>`, or one of two fixed sentences — built only by `refusalsOf` and `answerRefusal`. A
 * schema's message may quote the brief (the planning, reconcile and timings schemas do), which is
 * harmless here: a `structured` call's prompt already carries the whole brief.
 */
export type Refusals = readonly string[] & { readonly [refusals]: true }

/**
 * Why a WITNESS's answer was refused: the issues of the witness's own two schemas over the answer it
 * just gave, as `<path>: <message>` — built only by `witnessRefusalsOf`. It is the one text a call
 * carrying a picture or a clip may take beside it, on a second ask only, and it cannot hold the
 * brief: those two schemas have no refinement and quote no value (I-8, S-037, S-072, S-156).
 */
export type WitnessRefusals = readonly string[] & { readonly [witnessRefusals]: true }
