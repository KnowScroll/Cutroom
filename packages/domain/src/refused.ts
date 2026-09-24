import type { RefusedAnswer } from '@cutroom/contracts'
import type { Db } from './db.ts'
import { refusedAnswer } from './schema.ts'

// A model answer that could not be read, KEPT (docs/features/ask-again.md, Gate 2 "What is kept";
// S-156, D-022). The one function both writers call — the worker's recording port, for an answer
// the adapter could not read, and the stages' `refusals` port, for a value a gate refused — so the
// redaction D-022 asks for sits at ONE recording boundary.

/** An answer longer than this is cut, after it is redacted, with a marker naming its full length. */
export const REFUSED_ANSWER_CAP = 32_000

/** D-022's credential-shaped names — the spike recorder's list — for a key whose value is masked. */
const CREDENTIAL_KEY = /key|token|secret|signature|sig|credential|password|auth/i

/**
 * What a provider handed back, with anything shaped like someone's secret taken out (D-022). A model's
 * answer holds no key of ours — none is ever in a prompt — so this is the rule for a THIRD party's:
 *
 * - every URL loses its whole query string, where a presigned credential sits — `\/`-escaped URLs
 *   too, since an answer is JSON text;
 * - `sk-…`, `sd_live_…` and JWT-shaped strings are masked;
 * - the string value of a JSON key with a credential-shaped name is masked, whatever it looks like.
 */
export function redacted(text: string): string {
  return text
    .replace(/(https?:(?:\\?\/){2}[^\s"'<>?]*)\?[^\s"'<>]*/g, '$1')
    .replace(
      /\b(?:sk-|sd_live_)[A-Za-z0-9_-]{8,}/g,
      (secret) => `<redacted ${secret.length}-char secret>`,
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      (secret) => `<redacted ${secret.length}-char secret>`,
    )
    .replace(
      /"((?:[^"\\]|\\.)*)"(\s*:\s*)"((?:[^"\\]|\\.)*)"/g,
      (whole, key: string, colon: string, value: string) =>
        CREDENTIAL_KEY.test(key) && value.length > 12
          ? `"${key}"${colon}"<redacted ${value.length}-char value>"`
          : whole,
    )
}

/** Redacted FIRST, then cut — so a secret straddling the cap is masked whole, never half-kept. */
export function kept(answer: string): string {
  const clean = redacted(answer)
  return clean.length <= REFUSED_ANSWER_CAP
    ? clean
    : `${clean.slice(0, REFUSED_ANSWER_CAP)}… [cut at ${REFUSED_ANSWER_CAP} of ${clean.length} characters]`
}

/** One refused answer, one row: the run, what was asked, which ask, why, and what came back. */
export function recordRefusedAnswer(
  db: Db,
  entry: { runId: string; refusal: RefusedAnswer },
  now: Date = new Date(),
): void {
  const { runId, refusal } = entry
  db.insert(refusedAnswer)
    .values({
      runId,
      port: refusal.port,
      role: refusal.role,
      call: refusal.call,
      about: JSON.stringify(refusal.about),
      ask: refusal.ask,
      reasons: JSON.stringify(refusal.reasons.map(redacted)),
      answer: kept(refusal.answer),
      at: now.toISOString(),
    })
    .run()
}
