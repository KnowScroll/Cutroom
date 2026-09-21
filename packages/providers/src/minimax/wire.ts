import { z } from 'zod'

// WHAT THE TWO MINIMAX ADAPTERS SHARE (S-114, S-123). One provider, one host, one key, and one
// answer to "did the provider refuse, and would asking again help?" — so these live in one file
// rather than once per adapter, where a later slice could correct one copy and leave the other.
//
// What is NOT here is the classification's CARRIER, because the two ports differ: the model port
// has no `unavailable` arm and its adapter throws a typed `Unavailable` (S-122), while
// `NarrationAnswer` has one and its adapter answers with it (S-096, S-123). The facts are shared;
// how each adapter reports them is the port's business.

/** The provider's own, and the default of the base-URL setting every real adapter takes (Gate 2). */
export const MINIMAX_BASE_URL = 'https://api.minimax.io'

/**
 * MiniMax reports its own outcome in `base_resp`, even under HTTP 200, so a busy provider can
 * arrive either way and both adapters read it.
 */
export const baseResp = z.object({ status_code: z.number(), status_msg: z.string() })

/**
 * The `base_resp` codes that mean "busy", and nothing else. 1002 is the rate limit the 429
 * fixtures carry; every other code — 1004 an invalid key, 1008 no balance, 1013 bad parameters —
 * is a fault, because sending the same request again cannot change any of them.
 */
const TRANSIENT_CODES = new Set([1002])

/** Whether a `base_resp` code is the provider saying it is busy. */
export function transientCode(code: number): boolean {
  return TRANSIENT_CODES.has(code)
}

/** A base URL as an adapter holds it: no trailing slash, so a path can be appended to it. */
export function baseOf(url: string | undefined): string {
  return (url ?? MINIMAX_BASE_URL).replace(/\/+$/, '')
}

/** As much of a body as a message may carry. Enough to recognise, never enough to be a payload. */
export function summary(text: string): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length <= 200 ? one : `${one.slice(0, 200)}…`
}
