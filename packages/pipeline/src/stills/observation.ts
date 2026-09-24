// What a witness's answer on a still must be before anything reads it (D-041, as amended by D-044).
// The model port types an `observe` answer `unknown`; Gate 1 is the boundary where it is parsed, and
// an answer that does not parse reaches no consumer (S-042).
//
// The schema itself lives in `packages/contracts/src/observation.ts` since `ask-again`'s Slice 1
// (S-156): ONE copy, which the gate parses under and the MiniMax adapter asks with, so the witness
// is shown exactly the rule it is judged by. This file keeps the pipeline's import path.
export { witnessObservation } from '@cutroom/contracts'
