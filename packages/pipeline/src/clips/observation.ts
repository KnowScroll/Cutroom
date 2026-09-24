// What a witness's answer on a clip must be before anything reads it (D-041, D-044, D-053, S-072).
// The model port types an `observe` answer `unknown`; Gate 4 is the boundary where it is parsed, and
// an answer that does not parse finishes the run failed (S-042).
//
// The schema itself lives in `packages/contracts/src/observation.ts` since `ask-again`'s Slice 1
// (S-156): ONE copy, which the gate parses under and the MiniMax adapter asks with. A clip's
// observation is a still's fields and the temporal block, required, strict as a still's is. This
// file keeps the pipeline's import path.
export { clipObservation } from '@cutroom/contracts'
