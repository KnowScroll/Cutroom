import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  CONTRACT_VERSION,
  ClaimRef,
  Criteria,
  Criterion,
  Degradation,
  ErrorResponse,
  EventsPage,
  NarrationSentence,
  Piece,
  ResumeRequest,
  ResumeResponse,
  RunEvent,
  RunOptions,
  RunRecord,
  RunResult,
  RunStatus,
  StillRef,
  StyleContract,
  SubmitRequest,
  SubmitResponse,
  VideoRef,
} from '@cutroom/reel-contract'
import { REPO } from './_repo.ts'

// reel-contract, Slice 1 — the shape checks (docs/features/reel-contract.md, checks 1–9).
//
// These examine the schemas and the package themselves and need no service. Each one was
// written and run against a package with no schema code before any schema existed, and failed.

const V = CONTRACT_VERSION

// ---------------------------------------------------------------- fixtures

const sentences = [
  { text: 'In 1215 a charter was sealed at Runnymede.', claimIds: ['c1'] },
  { text: 'It bound a king to the law of the land.', claimIds: ['c1', 'c2'] },
  { text: 'Most of its clauses were repealed within decades.', claimIds: ['c2'] },
  { text: 'Three of them are still law in England today.', claimIds: ['c3'] },
]

function validRequest() {
  return {
    contractVersion: V,
    requestId: 'req-1',
    worldId: 'world-1',
    narration: structuredClone(sentences),
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
    options: { until: 'video', budgetCents: 300 },
  }
}

const event = (seq: number) => ({
  contractVersion: V,
  runId: 'run-1',
  seq,
  at: '2026-09-14T12:00:00.000Z',
  type: 'run.accepted',
})

const finished = { contractVersion: V, runId: 'run-1', requestId: 'req-1', costCents: 0 }
const figures = { limit: 'reel', estimateCents: 320, ceilingCents: 300, capCents: 300 }
const still = { pictureId: 'p1', shotId: 's1', path: 'C:/engine/artifacts/p1.png' }

/** Every top-level message and the event, each with at least one valid example. */
const MESSAGES = {
  SubmitRequest: [SubmitRequest, [validRequest()]],
  SubmitResponse: [
    SubmitResponse,
    [
      {
        contractVersion: V,
        outcome: 'accepted',
        requestId: 'req-1',
        runId: 'run-1',
        replayed: false,
      },
      { contractVersion: V, outcome: 'refused', reason: 'invalid', detail: 'no body' },
    ],
  ],
  RunStatus: [
    RunStatus,
    [
      { contractVersion: V, runId: 'run-1', requestId: 'req-1', state: 'running', lastSeq: 3 },
      // Since resume-failed's Slice 4 (S-162): a run that resumes another, and one resumed.
      {
        contractVersion: V,
        runId: 'run-2',
        requestId: 'req-1',
        state: 'running',
        lastSeq: 1,
        resumes: 'run-1',
      },
      {
        contractVersion: V,
        runId: 'run-1',
        requestId: 'req-1',
        state: 'finished',
        lastSeq: 9,
        resumedBy: 'run-2',
      },
    ],
  ],
  EventsPage: [
    EventsPage,
    [{ contractVersion: V, runId: 'run-1', events: [event(1), event(2)], nextSince: 2 }],
  ],
  RunResult: [
    RunResult,
    [
      { ...finished, status: 'completed', until: 'plan', estimateCents: 210 },
      {
        ...finished,
        status: 'completed',
        until: 'stills',
        estimateCents: 210,
        stills: [still],
        degradations: [],
      },
      {
        ...finished,
        status: 'completed',
        until: 'video',
        estimateCents: 210,
        stills: [still],
        video: { path: 'C:/engine/artifacts/reel.mp4' },
        degradations: [{ shotId: 's2', reason: 'held as a still' }],
      },
      { ...finished, status: 'refused', reason: 'budget', ...figures },
      { ...finished, status: 'stopped', reason: 'budget', ...figures, costCents: 290 },
      {
        ...finished,
        status: 'stopped',
        reason: 'rule',
        rule: 'D-047',
        step: 'stills',
        detail: 'x',
      },
      { ...finished, status: 'failed', detail: 'provider outage' },
      { ...finished, status: 'cancelled' },
    ],
  ],
  RunRecord: [
    RunRecord,
    [
      {
        contractVersion: V,
        runId: 'run-1',
        pictures: [
          {
            pictureId: 'p1',
            shotId: 's1',
            chosen: true,
            observationId: 'o1',
            reconciliationId: 'r1',
            checks: [{ gate: '1', step: 'witness', outcome: 'accept_with_label' }],
          },
          {
            pictureId: 'p2',
            shotId: 's1',
            chosen: false,
            checks: [{ gate: '1', outcome: 'fail' }],
          },
        ],
        // Required since reel-takes' Slice 1 (S-093, S-099): test support, no assertion.
        takes: [],
        degradations: [],
      },
      // A resumed run's record, since resume-failed's Slice 4 (S-162): a picture and a take copied
      // from the run it resumes name it, and a take it made does not.
      {
        contractVersion: V,
        runId: 'run-2',
        pictures: [
          {
            pictureId: 'p1',
            shotId: 's1',
            chosen: true,
            keptFrom: 'run-1',
            checks: [{ gate: '1', step: 'witness', outcome: 'accept' }],
          },
        ],
        takes: [
          {
            takeId: 't1',
            shotId: 's1',
            number: 1,
            used: true,
            keptFrom: 'run-1',
            checks: [{ gate: '2', outcome: 'accept' }],
          },
          { takeId: 't2', shotId: 's2', number: 1, used: true, checks: [] },
        ],
        degradations: [],
      },
    ],
  ],
  // The resume route's request and each arm of its answer (resume-failed, S-161, S-162).
  ResumeRequest: [
    ResumeRequest,
    [
      { contractVersion: V },
      {
        contractVersion: V,
        remake: [{ kind: 'still', shot: 'shot-0' }, { kind: 'clip' }],
        preview: true,
      },
    ],
  ],
  'ResumeResponse preview': [
    ResumeResponse,
    [
      {
        contractVersion: V,
        outcome: 'preview',
        runId: 'run-1',
        remake: [
          { kind: 'still', shot: 'shot-0' },
          { kind: 'clip', shot: 'shot-0' },
        ],
        estimateCents: 205,
        spentCents: 15,
        capCents: 300,
        ceilingCents: 300,
      },
      {
        contractVersion: V,
        outcome: 'preview',
        runId: 'run-1',
        remake: [],
        estimateCents: 320,
        spentCents: 15,
        capCents: 300,
        ceilingCents: 300,
        limit: 'reel',
      },
    ],
  ],
  'ResumeResponse accepted': [
    ResumeResponse,
    [
      {
        contractVersion: V,
        outcome: 'accepted',
        runId: 'run-2',
        resumes: 'run-1',
        replayed: false,
      },
    ],
  ],
  'ResumeResponse refused': [
    ResumeResponse,
    [
      {
        contractVersion: V,
        outcome: 'refused',
        runId: 'run-1',
        reason: 'not-resumable',
        detail: 'it completed',
      },
    ],
  ],
  'ResumeResponse refused for budget': [
    ResumeResponse,
    [
      {
        contractVersion: V,
        outcome: 'refused',
        runId: 'run-1',
        reason: 'budget',
        ...figures,
        spentCents: 15,
      },
    ],
  ],
  ErrorResponse: [ErrorResponse, [{ contractVersion: V, error: 'not-found', detail: 'no run' }]],
  RunEvent: [RunEvent, [event(1)]],
} as const

/** Objects that live inside a message, with a valid example each. */
const NESTED = {
  NarrationSentence: [NarrationSentence, sentences[0]],
  ClaimRef: [ClaimRef, { id: 'c1', role: 'main' }],
  Criterion: [Criterion, { id: 'm1', text: 'a wax seal', type: 'presence' }],
  Criteria: [Criteria, { mustShow: [], mustNotShow: [], depictionPolicyVersion: 'p' }],
  StyleContract: [StyleContract, { id: 's', version: 1, text: 't' }],
  RunOptions: [RunOptions, { until: 'plan', budgetCents: 1 }],
  StillRef: [StillRef, still],
  VideoRef: [VideoRef, { path: 'C:/v.mp4' }],
  Degradation: [Degradation, { shotId: 's1', reason: 'r' }],
  Piece: [Piece, { kind: 'still', shot: 'shot-0' }],
} as const

type Schema = { safeParse(x: unknown): { success: boolean; data?: unknown } }
const ok = (s: Schema, x: unknown) => s.safeParse(x).success
const without = (o: Record<string, unknown>, key: string) => {
  const copy = { ...o }
  delete copy[key]
  return copy
}

// ---------------------------------------------------------------- 1. versions (D-095, D-106)

test('1. every top-level message and the event require contractVersion', () => {
  for (const [name, [schema, examples]] of Object.entries(MESSAGES)) {
    for (const example of examples) {
      assert.ok(ok(schema, example), `${name} rejected its own valid example`)
      assert.ok(
        !ok(schema, without(example as Record<string, unknown>, 'contractVersion')),
        `${name} accepted a message with no contractVersion`,
      )
    }
  }
})

test('1. no nested object declares a contractVersion of its own', () => {
  for (const [name, [schema, example]] of Object.entries(NESTED)) {
    assert.ok(ok(schema, example), `${name} rejected its own valid example`)
    assert.ok(
      !ok(schema, { ...example, contractVersion: V }),
      `${name} accepted a contractVersion — only messages and events carry one (D-106)`,
    )
  }
})

test('1. a page whose event carries a different contractVersion from the page is rejected', () => {
  const page = {
    contractVersion: V,
    runId: 'run-1',
    events: [{ ...event(1), contractVersion: 2 }],
    nextSince: 1,
  }
  assert.ok(!ok(EventsPage, page))
})

// ---------------------------------------------------------------- 2. plain JSON (D-098)

test('2. every message survives JSON.stringify and JSON.parse unchanged', () => {
  for (const [name, [schema, examples]] of Object.entries(MESSAGES)) {
    for (const example of examples) {
      const parsed = schema.safeParse(JSON.parse(JSON.stringify(example)))
      assert.ok(parsed.success, `${name} failed after a JSON round trip`)
      assert.deepEqual(parsed.data, example, `${name} changed across a JSON round trip`)
    }
  }
})

// ---------------------------------------------------------------- 3, 4. forbidden fields

function contractSource(): string {
  const dir = join(REPO, 'packages', 'reel-contract', 'src')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n')
}

test('3. version 1 declares no Phase 2 field (D-095)', () => {
  const src = contractSource()
  for (const field of ['lane', 'tier', 'deadlineClass', 'epoch', 'warm']) {
    assert.doesNotMatch(src, new RegExp(`\\b${field}\\s*:`), `field "${field}" is declared`)
  }
})

test('4. no field carries evidence or an end card (D-096, D-101, I-14)', () => {
  const src = contractSource()
  for (const field of ['source', 'sources', 'truthState', 'claimText', 'exposure', 'endCard']) {
    assert.doesNotMatch(src, new RegExp(`\\b${field}\\s*:`), `field "${field}" is declared`)
  }
})

// ---------------------------------------------------------------- 5. strict

test('5. every schema rejects a field it does not define, such as sources', () => {
  for (const [name, [schema, examples]] of Object.entries(MESSAGES)) {
    assert.ok(!ok(schema, { ...examples[0], sources: ['x'] }), `${name} accepted "sources"`)
  }
  for (const [name, [schema, example]] of Object.entries(NESTED)) {
    assert.ok(!ok(schema, { ...example, sources: ['x'] }), `${name} accepted "sources"`)
  }
  const nestedSmuggle = validRequest()
  ;(nestedSmuggle.narration[0] as Record<string, unknown>).truthState = 'disputed'
  assert.ok(!ok(SubmitRequest, nestedSmuggle), 'a truth state inside a sentence was accepted')
})

// ---------------------------------------------------------------- 6, 7, 8. the request (D-062, D-063, D-073, D-100, D-102)

test('6. a sentence may only reference a listed claim, and a claim is listed once', () => {
  const dangling = validRequest()
  dangling.narration[0]!.claimIds = ['c9']
  assert.ok(!ok(SubmitRequest, dangling), 'a sentence referencing an unlisted claim was accepted')

  const twice = validRequest()
  twice.claims.push({ id: 'c1', role: 'supporting' })
  assert.ok(!ok(SubmitRequest, twice), 'a claim listed twice was accepted')
})

test('7. planVaryOn: an unknown value and "order" with no main claim are rejected; absent is fine', () => {
  const unknown = validRequest()
  ;(unknown.options as Record<string, unknown>).planVaryOn = 'pacing'
  assert.ok(!ok(SubmitRequest, unknown))

  const noMain = validRequest()
  noMain.claims = noMain.claims.map((c) => ({ ...c, role: 'supporting' }))
  ;(noMain.options as Record<string, unknown>).planVaryOn = 'order'
  assert.ok(!ok(SubmitRequest, noMain), '"order" with no main claim was accepted')

  const orderWithMain = validRequest()
  ;(orderWithMain.options as Record<string, unknown>).planVaryOn = 'order'
  assert.ok(ok(SubmitRequest, orderWithMain))

  assert.ok(ok(SubmitRequest, validRequest()), 'an absent planVaryOn was rejected')
})

test('8. budget, request id, sentence count and claim references are checked at submit', () => {
  for (const budgetCents of [undefined, 0, -5, 1.5]) {
    const r = validRequest()
    ;(r.options as Record<string, unknown>).budgetCents = budgetCents
    assert.ok(!ok(SubmitRequest, r), `budgetCents ${budgetCents} was accepted`)
  }

  const emptyId = { ...validRequest(), requestId: '' }
  assert.ok(!ok(SubmitRequest, emptyId), 'an empty requestId was accepted')

  const three = validRequest()
  three.narration = three.narration.slice(0, 3)
  three.narration[2]!.claimIds = ['c2', 'c3']
  assert.ok(!ok(SubmitRequest, three), 'fewer than 4 sentences was accepted')

  const unreferenced = validRequest()
  unreferenced.claims.push({ id: 'c4', role: 'supporting' })
  assert.ok(!ok(SubmitRequest, unreferenced), 'a claim no sentence references was accepted')

  const strayCriterion = validRequest()
  strayCriterion.criteria.mustShow[0]!.claimId = 'c9'
  assert.ok(!ok(SubmitRequest, strayCriterion), 'a criterion naming an unlisted claim was accepted')
})

// ---------------------------------------------------------------- 9. the package (D-094)

test("9. the package's only runtime dependency is zod", () => {
  const pkg = JSON.parse(
    readFileSync(join(REPO, 'packages', 'reel-contract', 'package.json'), 'utf8'),
  )
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ['zod'])
  assert.deepEqual(Object.keys(pkg.peerDependencies ?? {}), [])
  assert.deepEqual(Object.keys(pkg.optionalDependencies ?? {}), [])
})
