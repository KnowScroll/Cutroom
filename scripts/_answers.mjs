// One input, one read, one line per question.
//
// The spending script (S-111, paid-path check 20) is the only thing in this repository that
// spends money; paid-path's check 20 holds the script unreachable from anything automatic, by
// way of a test that reads its source rather than running it. resume-failed, Slice 6, adds
// questions the script asks for itself — a confirmation for the resume's printed figure, and the
// question on a run still waiting when the script starts (the owner, on 2026-09-25 in
// PROMPTS/052's session 52 step 2: "if we retry a run we should be able to tell the system to
// regenerate the asset"). Every answer must come from one read of redirected input, in the order
// the questions ask, so a person typing at a terminal still works (the script's prelude reads
// redirected input once, splits it on newlines, and yields successive lines to successive
// questions).
//
// THIS MODULE IS PURE: it imports nothing, it reads nothing but the input it is handed, and it
// returns a generator — the test `tests/resume-failed-script.test.ts` check 42 hands it one
// input of three lines and watches three questions receive one line each. paid-path's check 20
// reads every other script in this folder for the spending script's name; this file and its
// declaration deliberately do not name it.

/**
 * Handed the whole redirected input, hand one line to each question in source order. The
 * terminal path is unchanged: a person typing enters lines on a stream a test reads and feeds
 * here. The yield's value is the line, trimmed of its trailing newline and carriage return —
 * a question never sees the line ending the shell adds. Past the input, every question
 * receives an empty string; the caller may treat that as "no answer" and exit before spending.
 *
 * @param {string} input The redirected input, in full.
 * @returns {Generator<string>} One line per `next()`, in order, then `''` forever.
 */
export function* answers(input) {
  const lines = input.split(/\r?\n/)
  for (const line of lines) yield line
  while (true) yield ''
}
