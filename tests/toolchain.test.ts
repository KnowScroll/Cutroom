import assert from 'node:assert/strict'
import { test } from 'node:test'

// The trivial test that proves the harness works before anything real depends on it.
//
// It is written in TypeScript on purpose: this repository runs tests with Node's own
// runner and its type stripping, so if this file runs at all then the runner, the flag
// and the TypeScript syntax are all known good. Node on this machine is 22.14, which
// needs --experimental-strip-types explicitly; see package.json's test script.

test('the test runner runs TypeScript', () => {
  const sum = (a: number, b: number): number => a + b
  assert.equal(sum(2, 2), 4)
})

test('type stripping does not change runtime values', () => {
  type Named = { readonly name: string }
  const thing: Named = { name: 'cutroom' }
  assert.deepEqual(Object.keys(thing), ['name'])
})
