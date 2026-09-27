// The declaration `_answers.mjs` ships: the file itself is JavaScript so the script can run under
// `--experimental-strip-types` without a build, but tsc reads this file for typecheck. It declares
// exactly the one export, hands back its type, and imports nothing — paid-path's check 20 holds
// the answers module's whole text free of a way past it.

export function answers(input: string): Generator<string, never>
