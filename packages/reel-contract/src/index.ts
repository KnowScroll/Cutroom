// The public surface of the reel engine's contract (docs/features/reel-contract.md).
// Types, schemas and the version — nothing else (D-094).

export { CONTRACT_VERSION, ContractVersion } from './version.ts'
export {
  ClaimId,
  ClaimRef,
  Criteria,
  Criterion,
  NarrationSentence,
  PlanVaryOn,
  RunOptions,
  StyleContract,
  SubmitRequest,
} from './request.ts'
export { ResultStatus, RunEvent } from './events.ts'
export {
  Degradation,
  EventsPage,
  RunResult,
  RunStatus,
  StillRef,
  SubmitResponse,
  VideoRef,
} from './responses.ts'
export { RunRecord } from './record.ts'
export { Piece, ResumeRequest, ResumeResponse } from './resume.ts'
export { ErrorResponse } from './errors.ts'
export type { Routes } from './routes.ts'
