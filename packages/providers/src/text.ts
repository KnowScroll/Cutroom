import { z } from 'zod'

// THE ANSWER GATE 1'S TEXT STEP ASKS FOR (docs/features/paid-path.md, Gate 2 "The sensor"; S-112,
// S-126). It lives here, above both folders, for one reason: the MiniMax adapter asks for this
// shape through `response_format` and the ffmpeg sensor parses what comes back, and two
// declarations of one shape disagree the first time either moves — the same reason D-028's rates
// are a registry and D-007's video path is data (S-124, S-125).
//
// It is not in `packages/contracts`, because it is not a contract: the pipeline never sees it. A
// sensor answers `string[]`, and this is how a model's answer becomes one.

/**
 * What a picture's readable text comes back as: every string that is legible in the picture, in
 * no particular order, and an empty list when there is none.
 *
 * `strict()` is deliberate. An answer with extra fields is an answer to a different question, and
 * a text step that quietly accepted one would drift back towards always passing (S-112).
 */
export const visibleText = z.object({ text: z.array(z.string()) }).strict()

export type VisibleText = z.infer<typeof visibleText>
