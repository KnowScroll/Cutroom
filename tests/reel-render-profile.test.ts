import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'
import type { RenderSettings } from '@cutroom/contracts'
import { DEFAULT_PLAN_SETTINGS, DEFAULT_RENDER_SETTINGS, GATE_ORDER } from '@cutroom/pipeline'
import { fakeImage, fakeModel, fakeSensors } from '@cutroom/providers'
import { startWorker } from '@cutroom/worker'
import { startEngine, waitFor } from './engine/harness.ts'
import { planRequest } from './engine/plans.ts'
import { names, sourceFiles, type Name } from './engine/source.ts'

// reel-render, Slice 1 — check 3 (docs/features/reel-render.md): the gates a reel runs, as data and
// as config (D-049, D-052, D-063, S-067, S-068, S-074, S-077).
//
// Gate 6 is not built while every reel is a cut (S-067) and Gate 8 is KnowScroll's (S-068), so the
// engine's gates end at 7 and hold no 6. D-052 makes the profile config and defines exactly one, so
// a worker handed any other set of gates refuses to start — before it opens its database, so it
// claims no job. And Gate 7's judge is a fourth call on the one model port (S-074, S-077).

const EXPECTED = ['0', '1', '1S', '2', '3', '4', '5', '7']

// ---------------------------------------------------------------- 3

test("3. GATE_ORDER equals ['0', '1', '1S', '2', '3', '4', '5', '7'], asserted as data", () => {
  assert.ok(Array.isArray(GATE_ORDER), 'GATE_ORDER is not a list')
  assert.deepEqual([...GATE_ORDER], EXPECTED)
})

test('3. the default gate profile is phase-1 with exactly those gates, and a worker handed a profile with other gates refuses to start and claims no job', async () => {
  assert.deepEqual(
    {
      id: DEFAULT_RENDER_SETTINGS.gateProfile.id,
      gates: [...DEFAULT_RENDER_SETTINGS.gateProfile.gates],
    },
    { id: 'phase-1', gates: EXPECTED },
    'the default gate profile is not phase-1 with GATE_ORDER',
  )

  const engine = await startEngine({ worker: false })
  const dir = mkdtempSync(join(tmpdir(), 'reel-render-profile-'))
  try {
    // A run is waiting, so a worker that started its loop before refusing would claim it.
    const submitted = await engine.http.submit(planRequest('r3-profile'))
    assert.equal(submitted.status, 202)

    const base = {
      dbPath: engine.dbPath,
      pollMs: 10,
      model: fakeModel({}, { models: DEFAULT_PLAN_SETTINGS.models }),
      image: fakeImage({}, { artifactRoot: dir }),
      sensors: fakeSensors({}),
      questionsPath: join(dir, 'QUESTIONS.md'),
    }
    const withGates = (gates: readonly string[], id = 'phase-1'): RenderSettings => ({
      ...DEFAULT_RENDER_SETTINGS,
      gateProfile: { id, gates },
    })

    /**
     * Starts a worker that must refuse. One that starts instead is stopped before the test fails, so
     * a worker that wrongly started fails this check at once rather than keeping the process alive.
     */
    const refuses = async (options: Parameters<typeof startWorker>[0], what: string) => {
      let started: Awaited<ReturnType<typeof startWorker>> | undefined
      try {
        started = await startWorker(options)
      } catch (error) {
        assert.match(String(error), /gate profile/i, `${what}: refused for another reason`)
        return
      }
      await started.stop()
      assert.fail(`${what}: the worker started`)
    }

    const others: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['Gate 6 added', ['0', '1', '1S', '2', '3', '4', '5', '6', '7']],
      ['Gate 8 added', [...EXPECTED, '8']],
      ['Gate 7 left out', ['0', '1', '1S', '2', '3', '4', '5']],
      ['Gate 1S left out', ['0', '1', '2', '3', '4', '5', '7']],
      ['Gates 2 and 3 swapped', ['0', '1', '1S', '3', '2', '4', '5', '7']],
      ['Gate 5 twice', ['0', '1', '1S', '2', '3', '4', '5', '5', '7']],
      ['no gates', []],
    ]
    for (const [what, gates] of others) {
      await refuses({ ...base, renderSettings: withGates(gates) }, what)
      await refuses(
        { ...base, renderSettings: withGates(gates, 'lighter') },
        `${what}, named lighter`,
      )
    }

    // Refused BEFORE the database is opened (S-077's order): handed a database file that cannot be
    // opened, the refusal is still the gate profile's — while the same worker with the one profile
    // fails for the file, which is what shows this probe can tell the two orders apart.
    const unopenable = join(dir, 'no-such-folder', 'engine.sqlite')
    await refuses(
      {
        ...base,
        dbPath: unopenable,
        renderSettings: withGates(['0', '1', '1S', '2', '3', '4', '5', '6', '7']),
      },
      'a profile with Gate 6, and a database that cannot be opened',
    )
    await assert.rejects(
      startWorker({ ...base, dbPath: unopenable, renderSettings: withGates([...EXPECTED]) }),
      (error: unknown) => !/gate profile/i.test(String(error)),
      'the one profile was refused, so the probe above says nothing about the order',
    )

    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.deepEqual(
      engine.query<{ state: string }>('SELECT state FROM job').map((j) => j.state),
      ['queued'],
      'a refused worker claimed a job',
    )

    // The one profile, as a copy rather than the constant itself, does start and claims the run.
    const worker = await startWorker({ ...base, renderSettings: withGates([...EXPECTED]) })
    try {
      await waitFor('the started worker to claim the run', () =>
        engine.query<{ state: string }>('SELECT state FROM job').some((j) => j.state !== 'queued'),
      )
    } finally {
      await worker.stop()
    }
  } finally {
    await engine.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})

test("3. LanguageModelPort's calls are exactly structured, observe, compare and judgeCut", () => {
  const ports = names(sourceFiles('packages', 'apps')).filter(
    (n) => n.name === 'LanguageModelPort' && n.kind === 'interface',
  )
  assert.deepEqual(
    ports.map((n) => n.file),
    ['packages/contracts/src/model.ts'],
    'LanguageModelPort must be declared once, as an interface in packages/contracts/src/model.ts',
  )
  const port = (ports[0] as Name).node as ts.InterfaceDeclaration
  const members = port.members.map((m) => m.name && ts.isIdentifier(m.name) && m.name.text)
  assert.deepEqual(
    members,
    ['structured', 'observe', 'compare', 'judgeCut'],
    'LanguageModelPort carries four calls: structured, observe, compare and judgeCut',
  )
})
