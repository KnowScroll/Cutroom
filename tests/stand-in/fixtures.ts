import type { SubmitRequest } from '@cutroom/reel-contract'

/** A request the contract accepts, named by `requestId`. Every call returns a fresh copy. */
export function validRequest(requestId: string): SubmitRequest {
  return {
    contractVersion: 1,
    requestId,
    worldId: 'world-1',
    narration: [
      { text: 'In 1215 a charter was sealed at Runnymede.', claimIds: ['c1'] },
      { text: 'It bound a king to the law of the land.', claimIds: ['c1', 'c2'] },
      { text: 'Most of its clauses were repealed within decades.', claimIds: ['c2'] },
      { text: 'Three of them are still law in England today.', claimIds: ['c3'] },
    ],
    claims: [
      { id: 'c1', role: 'main' },
      { id: 'c2', role: 'supporting' },
      { id: 'c3', role: 'supporting' },
    ],
    criteria: {
      mustShow: [{ id: 'm1', text: 'a wax seal on parchment', type: 'presence', claimId: 'c1' }],
      mustNotShow: [{ id: 'n1', text: 'any real living person', type: 'presence' }],
      depictionPolicyVersion: 'policy-3',
    },
    style: { id: 'style-1', version: 2, text: 'quiet, precise, natural light' },
    options: { until: 'plan', budgetCents: 300 },
  }
}
