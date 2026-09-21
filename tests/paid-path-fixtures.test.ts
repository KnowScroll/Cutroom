import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { WIRE_DIR, wireFiles, type Wire } from './engine/wire.ts'

// paid-path, Slice 2 — check 21 (docs/features/paid-path.md): every recorded fixture under
// tests/fixtures/wire holds no key-shaped value and no query string (D-022, S-109).
//
// S-111 puts every real adapter's proof on recorded wire, so a fixture is a body a provider
// really returned — and the thing that leaked in the steering repository was exactly that: a
// presigned URL in a response, carrying OSSAccessKeyId and Signature, written down because it
// arrived rather than because anyone typed it. D-022's finding is that scanning for your own
// keys proves nothing about what a provider handed you. So the guard is on the recording, it
// reads EVERY fixture, and it fails on a name or a value of a credential's shape wherever in the
// body it sits.

/** `*_API_KEY`, `*_KEY`, `*_TOKEN`, `*_SECRET`, and the names a credential arrives under. */
const KEY_NAME =
  /(^|[_-])(api[_-]?key|key|token|secret|signature|credential|password|authorization|accesskeyid|expires)$/i

/** Anything with a query string, under any scheme — which is where a presigned credential sits. */
const QUERY = /^[a-z][a-z0-9+.-]*:\/\/[^\s]*\?/i

/** The shapes a credential is written in, whatever it is called. */
const CREDENTIAL = /^(Bearer\s|Basic\s|sk-|sk_|eyJ[A-Za-z0-9_-]{8}|AKIA|OSS[A-Za-z0-9]{12})/

function walk(value: unknown, at: string, found: string[]): void {
  if (typeof value === 'string') {
    if (QUERY.test(value)) found.push(`${at} is a URL with a query string: ${value}`)
    if (CREDENTIAL.test(value)) found.push(`${at} is shaped like a credential: ${value}`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${at}[${i}]`, found))
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [name, item] of Object.entries(value)) {
    if (KEY_NAME.test(name)) found.push(`${at}.${name} is a key-shaped name`)
    walk(item, `${at}.${name}`, found)
  }
}

// ---------------------------------------------------------------- 21

test('21. there is at least one recorded fixture, and every one of them is named for the provider, the call and the case it records', () => {
  const files = wireFiles()
  assert.ok(files.length > 0, `no recorded wire under ${WIRE_DIR}: the guard would read as cover`)
  for (const file of files) {
    const named = /^([a-z0-9]+)-([a-z0-9]+)-([a-z0-9]+)\.json$/.exec(file)
    assert.ok(named !== null, `${file} is not <provider>-<call>-<case>.json`)
    const wire = JSON.parse(readFileSync(join(WIRE_DIR, file), 'utf8')) as Wire
    assert.equal(wire.provider, named[1], `${file} records ${wire.provider}`)
    assert.equal(wire.call, named[2], `${file} records the call ${wire.call}`)
    assert.equal(wire.case, named[3], `${file} records the case ${wire.case}`)
    assert.ok(typeof wire.note === 'string' && wire.note.length > 0, `${file} says nothing`)
    assert.match(wire.request.method, /^[A-Z]+$/, `${file} has no request method`)
    assert.match(wire.request.path, /^\//, `${file}'s request path is not a path`)
    assert.ok(Number.isInteger(wire.response.status), `${file} has no response status`)
  }
})

test('21. every recorded fixture holds no key-shaped value and no query string', () => {
  const files = wireFiles()
  for (const file of files) {
    const text = readFileSync(join(WIRE_DIR, file), 'utf8')
    const found: string[] = []
    walk(JSON.parse(text) as unknown, file, found)

    // The parsed walk reads names and values; this reads the bytes, so a credential inside a
    // string that is itself JSON, or in a field nothing parses, is caught too.
    if (/[?&][A-Za-z0-9_-]+=/.test(text)) found.push(`${file} holds a query string`)

    assert.deepEqual(found, [], `${file}:\n  ${found.join('\n  ')}`)
  }
})

test('21. the guard reads every file in the folder, not a list it was given', () => {
  // A fixture added by a later slice is read by this check without anything being edited: the
  // folder is the list. Anything that is not a fixture is a finding, not something to skip.
  const everything = readdirSync(WIRE_DIR)
  assert.deepEqual(
    everything.filter((f) => !f.endsWith('.json')),
    [],
    `${WIRE_DIR} holds something that is not a recorded fixture`,
  )
  assert.deepEqual(everything.sort(), wireFiles(), 'the guard reads fewer files than there are')
})
