import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PROVIDER_ADAPTERS as ADAPTERS } from '@cutroom/contracts'
import { DEFAULT_LEASE_FLOOR_MS, SETTING_NAMES } from '@cutroom/service'
import { refusedService, startService } from './engine/service.ts'

// paid-path, Slice 1 — check 2 (docs/features/paid-path.md): the refusals, in S-075's form and
// place. A service that cannot build the ports it was told to build claims no job and buys
// nothing, and it finds that out BEFORE its database is opened — the same shape as a worker whose
// ffmpeg cannot be run (S-075, D-026's startup refusal).
//
// Two reasons are asserted here, which are check 2's two: a name outside the closed set (S-108),
// and a named real adapter whose key is absent (S-109). A third was asserted while some adapter
// was still NAMED AND NOT BUILT — against the video port in Slice 1, against the sensor from
// S-125. Slice 7 built the last of the five, so that assertion has nothing to point at and was
// turned round rather than dropped: every name in every closed set now BUILDS, and a port that
// answers "not built" is the finding (S-126).
//
// The lease refusal (S-113) is built in this slice; check 17, which owns it, is Slice 6's, and its
// figures are READ from `@cutroom/service` rather than typed here — the floor is computed from the
// wait the video adapter allows (S-125), so a typed figure would go stale the moment either moves.

/** Every refusal names the port it was about and what was wrong with it. */
function refuses(output: string, ...parts: string[]): void {
  assert.match(output, /the service refuses to start/, output)
  for (const part of parts)
    assert.ok(output.includes(part), `the refusal does not say "${part}":\n${output}`)
}

// ---------------------------------------------------------------- 2

test('2. a provider setting naming an adapter outside the closed set makes the service refuse to start before its database is opened, naming the port, the name it was given and the set; no job is claimed and no file is written', async () => {
  for (const [setting, port, adapters] of [
    ['CUTROOM_PROVIDER_MODEL', 'model', 'fake, minimax'],
    ['CUTROOM_PROVIDER_IMAGE', 'image', 'fake, fal'],
    ['CUTROOM_PROVIDER_SENSOR', 'sensor', 'fake, local'],
    ['CUTROOM_PROVIDER_VIDEO', 'video', 'fake, fal'],
    ['CUTROOM_PROVIDER_NARRATION', 'narration', 'fake, minimax'],
  ] as const) {
    const refusal = await refusedService({ env: { [setting]: 'nobody' } })
    try {
      refuses(refusal.output, `the ${port} port`, "'nobody'", adapters)
      assert.notEqual(refusal.code, 0, `the service exited 0 on ${setting}=nobody`)
      assert.equal(refusal.database, false, 'the database was opened before the refusal')
      assert.equal(refusal.artifacts, false, 'a refused service wrote a file')
    } finally {
      refusal.clean()
    }
  }
})

test('2. a named real adapter whose key is absent makes the service refuse to start before its database is opened, naming the port and the key; no job is claimed and no file is written', async () => {
  for (const [setting, port, key] of [
    ['CUTROOM_PROVIDER_MODEL', 'model', 'MINIMAX_API_KEY'],
    ['CUTROOM_PROVIDER_NARRATION', 'narration', 'MINIMAX_API_KEY'],
  ] as const) {
    const refusal = await refusedService({ env: { [setting]: 'minimax' } })
    try {
      refuses(refusal.output, `the ${port} port`, "'minimax'", key)
      assert.notEqual(refusal.code, 0, `the service exited 0 on ${setting}=minimax`)
      assert.equal(refusal.database, false, 'the database was opened before the refusal')
      assert.equal(refusal.artifacts, false, 'a refused service wrote a file')
    } finally {
      refusal.clean()
    }
  }

  for (const [setting, port] of [
    ['CUTROOM_PROVIDER_IMAGE', 'image'],
    ['CUTROOM_PROVIDER_VIDEO', 'video'],
  ] as const) {
    const refusal = await refusedService({ env: { [setting]: 'fal' } })
    try {
      refuses(refusal.output, `the ${port} port`, "'fal'", 'FAL_KEY')
      assert.notEqual(refusal.code, 0, `the service exited 0 on ${setting}=fal`)
      assert.equal(refusal.database, false, 'the database was opened before the refusal')
      assert.equal(refusal.artifacts, false, 'a refused service wrote a file')
    } finally {
      refusal.clean()
    }
  }
})

test('2. an empty key is an absent one: a real adapter named with its key set to white space refuses exactly as one with no key at all', async () => {
  const refusal = await refusedService({
    env: { CUTROOM_PROVIDER_VIDEO: 'fal', FAL_KEY: '   ' },
  })
  try {
    refuses(refusal.output, 'the video port', "'fal'", 'FAL_KEY')
    assert.notEqual(refusal.code, 0, 'the service started on an empty key')
    assert.equal(refusal.database, false, 'the database was opened before the refusal')
  } finally {
    refusal.clean()
  }
})

test('2. NOTHING is named and not built any more: every name in every closed set builds, given its key — the assertion is its own opposite, and nothing was dropped', async () => {
  // THE ASSERTION THAT MOVED, AND THEN TURNED ROUND (S-126). Slice 1 proved "a real adapter named
  // with its key present still refuses while no such adapter is built" against the VIDEO port;
  // S-125 moved it to the SENSOR when the video port was built. Slice 7 builds the sensor, so
  // there is nothing left for it to point at — and a test that is deleted when its subject is
  // finished leaves the property unwatched.
  //
  // So it asserts the opposite, which is strictly stronger: EVERY name in EVERY closed set builds
  // a port, given whatever key it needs, and no port answers "not built". A name added to a set
  // without an adapter behind it, or an adapter taken back out, fails here — which is exactly the
  // state the old assertion existed to catch, read from the other end.
  const KEYS = { MINIMAX_API_KEY: 'minimax-refusals-canary', FAL_KEY: 'fal-refusals-canary' }
  for (const [setting, port] of [
    ['CUTROOM_PROVIDER_MODEL', 'model'],
    ['CUTROOM_PROVIDER_IMAGE', 'image'],
    ['CUTROOM_PROVIDER_SENSOR', 'sensor'],
    ['CUTROOM_PROVIDER_VIDEO', 'video'],
    ['CUTROOM_PROVIDER_NARRATION', 'narration'],
  ] as const) {
    for (const name of ADAPTERS[port]) {
      const service = await startService({
        env: {
          [setting]: name,
          ...KEYS,
          // Pointed at a port nothing listens on, so a real adapter that is built here cannot
          // reach anything: the service starts, and no call is ever made (S-111).
          [SETTING_NAMES.minimaxBaseUrl]: 'http://127.0.0.1:9',
          [SETTING_NAMES.falBaseUrl]: 'http://127.0.0.1:9',
          [SETTING_NAMES.falStorageBaseUrl]: 'http://127.0.0.1:9',
          CUTROOM_LEASE_MS: String(DEFAULT_LEASE_FLOOR_MS),
        },
      })
      try {
        assert.ok(
          !service.output().includes('not built'),
          `the ${port} port answered "not built" for '${name}':
${service.output()}`,
        )
        for (const key of Object.values(KEYS)) {
          assert.ok(!service.output().includes(key), `the ${port} port printed a key`)
        }
      } finally {
        await service.stop()
        service.clean()
      }
    }
  }
})

test('2. a provider setting the environment FILE holds refuses exactly as one the environment itself holds: the service loads the file its setting names, and a setting there is a setting', async () => {
  // S-109: the environment is loaded from the file one setting names, defaulting to `.env` beside
  // this repository's root. A service that ignored that file would start here instead of
  // refusing — which is what makes this an assertion and not a description. What a key in that
  // file reaches is check 3's, in Slice 2; that a setting in it is read at all is this.
  const refusal = await refusedService({ envFileText: 'CUTROOM_PROVIDER_VIDEO=fal\n' })
  try {
    refuses(refusal.output, 'the video port', "'fal'", 'FAL_KEY')
    assert.notEqual(refusal.code, 0, 'the service ignored the environment file it was pointed at')
    assert.equal(refusal.database, false, 'the database was opened before the refusal')
  } finally {
    refusal.clean()
  }
})

// ---------------------------------------------------------------- 17, in part (Slice 6 owns it)

test('17. a service given a real adapter refuses to start with a lease shorter than the floor a real job needs, naming both figures — because nothing renews a lease, and a second claim would pay again for the take in flight', async () => {
  const refusal = await refusedService({
    env: {
      CUTROOM_PROVIDER_VIDEO: 'fal',
      FAL_KEY: 'canary-not-a-real-key',
      CUTROOM_LEASE_MS: '60000',
    },
  })
  try {
    refuses(refusal.output, 'video', "'fal'", '60000', String(DEFAULT_LEASE_FLOOR_MS))
    assert.notEqual(refusal.code, 0, 'the service started with a lease below the floor')
    assert.equal(refusal.database, false, 'the database was opened before the refusal')
  } finally {
    refusal.clean()
  }
})

test('17. with every port a stand-in the lease floor does not apply: a service started with the short default lease and no real adapter starts', async () => {
  // The floor is about what a REAL job takes (S-113). A stand-in clip is made in milliseconds, so
  // holding the free path to a one-hour lease would be a refusal with no reason behind it.
  const service = await startService({ env: { CUTROOM_LEASE_MS: '1000' } })
  try {
    assert.match(service.baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/, service.output())
  } finally {
    await service.stop()
    service.clean()
  }
})
