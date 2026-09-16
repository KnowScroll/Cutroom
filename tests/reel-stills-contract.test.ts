import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTRACT_VERSION, Criteria, Criterion, SubmitRequest } from '@cutroom/reel-contract'
import { validRequest } from './stand-in/fixtures.ts'

// reel-stills, Slice 1 — check 1 (docs/features/reel-stills.md): the criterion's type (S-029),
// `presence` only in `mustNotShow` (D-043), and version 1 unbumped (S-034, D-106).
//
// The type is a Phase 1 field the contract was written without, so this asserts the amended
// schema from both sides: `Criterion` and `Criteria` alone, and a whole request at the boundary
// an orchestrator meets.

type Schema = { safeParse(x: unknown): { success: boolean } }
const ok = (s: Schema, x: unknown) => s.safeParse(x).success

const criteria = (mustShow: unknown[], mustNotShow: unknown[]) => ({
  mustShow,
  mustNotShow,
  depictionPolicyVersion: 'policy-3',
})

/** A request the contract accepts, with its criteria replaced. */
function requestWith(mustShow: unknown[], mustNotShow: unknown[]) {
  const request = validRequest('req-1') as unknown as Record<string, unknown>
  request.criteria = criteria(mustShow, mustNotShow)
  return request
}

const presence = { id: 'm1', text: 'a wax seal on parchment', type: 'presence', claimId: 'c1' }
const event = { id: 'm2', text: 'the seal is pressed into the wax', type: 'event', claimId: 'c1' }
const untyped = { id: 'm1', text: 'a wax seal on parchment', claimId: 'c1' }

// ---------------------------------------------------------------- 1

test('1. a criterion without a type fails validation', () => {
  assert.ok(!ok(Criterion, untyped), 'Criterion accepted a criterion with no type')
  assert.ok(
    !ok(Criterion, { id: 'n1', text: 'any real living person' }),
    'Criterion accepted a mustNotShow-shaped criterion with no type',
  )
  assert.ok(
    !ok(Criteria, criteria([untyped], [])),
    'Criteria accepted a mustShow criterion with no type',
  )
  assert.ok(
    !ok(Criteria, criteria([], [{ id: 'n1', text: 'any real living person' }])),
    'Criteria accepted a mustNotShow criterion with no type',
  )
  assert.ok(
    !ok(SubmitRequest, requestWith([untyped], [])),
    'a request carrying an untyped criterion was accepted',
  )
})

test('1. a criterion whose type is neither presence nor event fails validation', () => {
  assert.ok(
    !ok(Criterion, { ...untyped, type: 'action' }),
    'an unknown criterion type was accepted',
  )
  assert.ok(!ok(Criterion, { ...untyped, type: '' }), 'an empty criterion type was accepted')
})

test("1. a mustNotShow criterion typed 'event' fails validation (D-043)", () => {
  const notShownEvent = { id: 'n1', text: 'a real living person speaks', type: 'event' }
  assert.ok(ok(Criterion, notShownEvent), 'Criterion itself must accept an event criterion')
  assert.ok(
    !ok(Criteria, criteria([], [notShownEvent])),
    'Criteria accepted an event criterion in mustNotShow',
  )
  assert.ok(
    !ok(SubmitRequest, requestWith([presence], [notShownEvent])),
    'a request with an event criterion in mustNotShow was accepted',
  )
})

test("1. mustShow accepts both 'presence' and 'event'; mustNotShow accepts 'presence'", () => {
  const notShown = { id: 'n1', text: 'any real living person', type: 'presence' }
  assert.ok(ok(Criteria, criteria([presence, event], [notShown])), 'Criteria rejected S-029 shapes')
  assert.ok(
    ok(SubmitRequest, requestWith([presence, event], [notShown])),
    'a request carrying a presence and an event mustShow was rejected',
  )
  assert.ok(
    ok(SubmitRequest, requestWith([], [notShown])),
    'a request whose only criterion is a presence mustNotShow was rejected',
  )
})

test('1. CONTRACT_VERSION is still 1: the type amends version 1 (S-034)', () => {
  assert.equal(CONTRACT_VERSION, 1)
  const request = requestWith([presence], [])
  request.contractVersion = 2
  assert.ok(!ok(SubmitRequest, request), 'the contract accepted a version 2 request')
})
