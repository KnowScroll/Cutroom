import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTRACT_VERSION, RunRecord } from '@cutroom/reel-contract'

// reel-takes, Slice 1 — check 3 (docs/features/reel-takes.md): the record's takes, in contract version
// 1 (D-095, S-034, S-093).
//
// A run's record lists every take made, beside every picture: its id, its shot, its number, whether
// the finished video shows it, each check it reached with its outcome, and — where it reached them —
// its observation's and its reconciliation's ids. `takes` is required, since a record that left it out
// could not be told from one with none, and each entry is strict, as every contract shape is. The
// version stays 1, as S-034 kept it for a criterion's type: no caller exists for a bump to protect.
//
// The version clause is green before this slice's code, since nothing here changes the version; the
// breaks recorded with the slice are what show it can fail.

const V = CONTRACT_VERSION

/** A take entry as S-093 writes it, with every field it may carry. */
const take = () => ({
  takeId: 'a1-shot-0-take-1',
  shotId: 'shot-0',
  number: 1,
  used: true,
  observationId: 'obs-a1-shot-0-take-1',
  reconciliationId: 'rec-a1-shot-0-take-1',
  checks: [
    { gate: '2', outcome: 'accept' },
    { gate: '3', outcome: 'accept' },
    { gate: '4', outcome: 'accept' },
    { gate: '5', outcome: 'fail' },
  ],
})

/** A record holding one picture and the given takes. */
const record = (takes: unknown) => ({
  contractVersion: V,
  runId: 'run-1',
  pictures: [
    {
      pictureId: 'a1-shot-0-a',
      shotId: 'shot-0',
      chosen: true,
      checks: [{ gate: '1', step: 'reconcile', outcome: 'accept' }],
    },
  ],
  takes,
  degradations: [],
})

const ok = (x: unknown) => RunRecord.safeParse(x).success

const without = (o: Record<string, unknown>, key: string) => {
  const copy = { ...o }
  delete copy[key]
  return copy
}

const CHECK_3 =
  "3. RunRecord requires takes, each with its takeId, shotId, number, used and checks, and its observation and reconciliation ids optional; refuses a take entry with any other field; and CONTRACT_VERSION is 1 — that clause green before this slice's code, since nothing here changes the version"

// ---------------------------------------------------------------- 3

test(`${CHECK_3} — takes required, and its entries' fields`, () => {
  // A record with its takes, and one with none, parse.
  assert.ok(ok(record([take()])), 'a record with a take entry was refused')
  assert.ok(ok(record([])), 'a record with no take was refused')
  const cutOff = without(take(), 'reconciliationId')
  assert.ok(ok(record([take(), cutOff])), 'a take with no reconciliation id was refused')
  const unseen = without(cutOff, 'observationId')
  assert.ok(ok(record([unseen])), 'a take with neither id was refused')
  assert.ok(ok(record([{ ...unseen, checks: [] }])), 'a take that reached no check was refused')
  const taken = RunRecord.parse(record([take(), cutOff]))
  assert.deepEqual(taken.takes, [take(), cutOff], 'a take entry changed as it was parsed')

  // `takes` required: left out, or not a list.
  const none = without(record([]), 'takes')
  assert.ok(!ok(none), 'a record with no takes field was accepted')
  assert.ok(!ok(record(null)), 'a record whose takes is null was accepted')
  assert.ok(!ok(record(take())), 'a record whose takes is one entry, not a list, was accepted')

  // Each required field of an entry, left out.
  for (const key of ['takeId', 'shotId', 'number', 'used', 'checks']) {
    assert.ok(!ok(record([without(take(), key)])), `a take entry with no ${key} was accepted`)
  }
  // And each given the wrong kind of value.
  const wrong: ReadonlyArray<readonly [string, unknown]> = [
    ['takeId', ''],
    ['shotId', ''],
    ['number', 0],
    ['number', -1],
    ['number', 1.5],
    ['number', '1'],
    ['used', 'yes'],
    ['used', 1],
    ['observationId', ''],
    ['reconciliationId', ''],
    ['checks', { gate: '2', outcome: 'accept' }],
  ]
  for (const [key, value] of wrong) {
    assert.ok(
      !ok(record([{ ...take(), [key]: value }])),
      `a take entry whose ${key} is ${JSON.stringify(value)} was accepted`,
    )
  }
  // A number above 3 is a whole number above 0, as the contract states it (S-093).
  assert.ok(ok(record([{ ...take(), number: 4 }])), 'a take numbered 4 was refused by the contract')

  // Each check: a gate and an outcome, both required.
  for (const check of [
    { outcome: 'accept' },
    { gate: '2' },
    { gate: '', outcome: 'accept' },
    { gate: '2', outcome: 'passed' },
  ]) {
    assert.ok(
      !ok(record([{ ...take(), checks: [check] }])),
      `a take's check ${JSON.stringify(check)} was accepted`,
    )
  }
  assert.ok(
    ok(record([{ ...take(), checks: [{ gate: '5', outcome: 'accept_with_label' }] }])),
    "a check's outcome accept_with_label was refused",
  )
})

test(`${CHECK_3} — a take entry with any other field refused`, () => {
  // The same entry without the field parses, so each refusal below is the field's.
  assert.ok(ok(record([take()])), 'the take entry was refused with no other field')
  for (const [key, value] of [
    ['sources', ['x']],
    ['pictureId', 'a1-shot-0-a'],
    ['attempt', 1],
    ['path', 'C:/engine/artifacts/a1-shot-0-take-1.mp4'],
    ['prompt', 'a slow push'],
    ['outcome', 'accept'],
    ['contractVersion', V],
  ] as const) {
    assert.ok(
      !ok(record([{ ...take(), [key]: value }])),
      `a take entry carrying ${key} was accepted`,
    )
  }
  assert.ok(
    !ok(record([{ ...take(), checks: [{ gate: '2', step: 'scan', outcome: 'accept' }] }])),
    "a take's check carrying a step was accepted",
  )
  assert.ok(
    !ok(
      record([
        { ...take(), checks: [{ gate: '2', outcome: 'accept', reasons: ['black for 1 s'] }] },
      ]),
    ),
    "a take's check carrying its reasons was accepted",
  )
})

test(`${CHECK_3} — the version`, () => {
  assert.equal(CONTRACT_VERSION, 1)
  assert.ok(!ok({ ...record([take()]), contractVersion: 2 }), 'a record of version 2 was accepted')
})
