// THE ONLY READ OF A KEY in this repository (S-109). One function per key name, and nothing else
// anywhere names an environment variable of a key's shape. The twentieth boundary rule,
// `keys-only-in-providers`, is what holds that once it exists (paid-path's Slice 2); until then
// this file is the only place to look, which is the point of there being one.
//
// A key is never written anywhere: not into a receipt, a row, an event, a question, a log line or
// a fault's message. Nothing here returns a key in an error, and nothing here logs. What a caller
// gets is the key or `undefined` — enough to refuse, and never enough to leak (D-022).

/** Where a key is read from. `process.env`'s shape, so a caller may pass a loaded `.env`. */
export type Env = Readonly<Record<string, string | undefined>>

/** The model and the narration adapters, which are both MiniMax (D-006, D-008, D-019). */
export const MINIMAX_KEY = 'MINIMAX_API_KEY'
/** The image and the video adapters, which are both fal (D-007, D-018, D-028). */
export const FAL_KEY = 'FAL_KEY'

/**
 * A key, or `undefined`. White space is not a key: a variable set to nothing is the same absence
 * as one never set, and a service that started on `FAL_KEY=""` would fail at its first paid call
 * instead of before its database was opened.
 */
function key(env: Env, name: string): string | undefined {
  const value = env[name]
  return value === undefined || value.trim() === '' ? undefined : value
}

export function minimaxKey(env: Env = process.env): string | undefined {
  return key(env, MINIMAX_KEY)
}

export function falKey(env: Env = process.env): string | undefined {
  return key(env, FAL_KEY)
}
