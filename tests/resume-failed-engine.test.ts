import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { FailureKind, LanguageModelPort } from '@cutroom/contracts'
import type { FakeAnswer } from '@cutroom/providers'
import type { SubmitRequest } from '@cutroom/reel-contract'
import { SETTING_NAMES, readSettings } from '@cutroom/service'
import { startEngine, waitFor, type Engine, type EngineOptions } from './engine/harness.ts'
import { shortRequest, planRequest, twoSurvivors } from './engine/plans.ts'
import { killedAgain, killedMidStills, takenUp } from './engine/restart.ts'
import { startService } from './engine/service.ts'
import {
  THREE_RANKS,
  THREE_RANKS_PICS,
  again,
  readStills,
  showsPerson,
  stillsRequest,
  stillsScript,
  type Pic,
} from './engine/stills.ts'
import { VIDEO_FINISH_MS, videoRequest, videoScript } from './engine/video.ts'

// resume-failed, Slice 5 — checks 35 to 40 (docs/features/resume-failed.md): the engine's own resume
// (S-163). A run a provider's fault fails is resumed once, by the engine, IN THE TRANSACTION THAT FAILS
// IT — after the stage's labels, in a savepoint, before `run.finished` — behind a switch the worker's
// own default leaves off and the service turns on, fifteen minutes on. A resume the cap cannot fit asks
// the owner; one that cannot be made is one line in the questions file, and the run fails as it would
// have without it.
//
// Every engine here is the harness's, its worker handed the switch only where a check turns it on. The
// stand-in model answers each role's calls in call order ACROSS RUNS, so a script covers a failed run
// and any resume that runs after it.

const [a, b, barons, hall] = THREE_RANKS_PICS as [Pic, Pic, Pic, Pic]

/** A model answer the provider was unavailable for: sent again, up to three sends (S-096). */
const BUSY: FakeAnswer = { throws: 'the model answered 529', as: 'unavailable' }

/** A picture the provider could not make, at its one send. */
const UNAVAILABLE = { throws: 'fal answered 503', as: 'unavailable' } as const
const UNAVAILABLE_DETAIL = 'the provider is unavailable: fal answered 503'

/** The planner's three sends answered unavailable, as check 3 words a spent counter. */
const PLANNER_UNAVAILABLE = `the planner call was answered unavailable at each of its 3 sends, the last saying "the model answered 529": a provider's transient errors have their own counter, and it is spent, so nothing was made and no take is counted (I-11, S-096)`

/** A resume due long after any test here ends, so it waits, queued, where it was made. */
const HOUR = 3_600_000

/** A BUDGET.md whose per-reel cap is `figure`. */
const budgetMd = (figure: string) =>
  `# Budget\n\n| Item | Cap |\n| --- | --- |\n| Per reel, all-in | **${figure}** |\n`

/** Rows as plain objects: node:sqlite's have no prototype, which a strict deep equality compares. */
const query = <T = Record<string, unknown>>(
  engine: Engine,
  sql: string,
  ...params: Array<string | number>
): T[] => engine.query<T>(sql, ...params).map((row) => ({ ...row }) as T)

/** What `run.failure` holds for a run. */
function failureOf(engine: Engine, runId: string): string | null {
  const rows = query<{ failure: string | null }>(
    engine,
    'SELECT failure FROM run WHERE run_id = ?',
    runId,
  )
  assert.equal(rows.length, 1, `no run row for ${runId}`)
  return rows[0]?.failure ?? null
}

/** Every run that resumes `runId`: its id, its stored remake list and its state. */
const resumesOf = (engine: Engine, runId: string) =>
  query<{ run_id: string; resume_request: string | null; state: string }>(
    engine,
    'SELECT run_id, resume_request, state FROM run WHERE resumes = ?',
    runId,
  )

/** The entries of a questions file, each from its second-level heading; none if it was never written. */
function entries(path: string): string[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split(/^(?=## )/m)
    .filter((chunk) => chunk.startsWith('## '))
}

/** Opens the engine's file as an operator would, runs `sql`, and closes it again. */
function exec(engine: Engine, sql: string): void {
  const db = new DatabaseSync(engine.dbPath)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    db.exec(sql)
  } finally {
    db.close()
  }
}

/**
 * THE TRIGGER CHECK 35 ADDS: on the insert of every `run.finished` event, it records how many runs
 * resume that event's run AT THAT MOMENT — so a resume written after `run.finished`, even in the same
 * transaction, records 0.
 */
function watchFinished(engine: Engine): void {
  exec(
    engine,
    `CREATE TABLE finished_seen (run_id TEXT NOT NULL, resumed INTEGER NOT NULL);
     CREATE TRIGGER on_finished AFTER INSERT ON run_event
     WHEN json_extract(NEW.body, '$.type') = 'run.finished'
     BEGIN
       INSERT INTO finished_seen VALUES (NEW.run_id, (SELECT count(*) FROM run WHERE resumes = NEW.run_id));
     END;`,
  )
}

/** What the trigger saw when the run's `run.finished` was inserted. */
const seenAtFinish = (engine: Engine, runId: string) =>
  query<{ resumed: number }>(
    engine,
    'SELECT resumed FROM finished_seen WHERE run_id = ?',
    runId,
  ).map((r) => r.resumed)

/** Submits a request and waits for its run to finish, as long as a video run may take. */
async function finishedRun(engine: Engine, request: SubmitRequest): Promise<string> {
  const submitted = await engine.http.submit(request)
  assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
  const runId = String(submitted.json.runId)
  await finishedAgain(engine, runId)
  return runId
}

/** Waits for a run already submitted — a resume — to finish. */
async function finishedAgain(engine: Engine, runId: string): Promise<void> {
  await waitFor(
    `run ${runId} to finish`,
    async () => (await engine.http.status(runId)).json.state === 'finished',
    VIDEO_FINISH_MS,
  )
}

/** A run failed with this kind and this detail — its result as a caller reads it, its kind as stored. */
async function assertFailed(
  engine: Engine,
  runId: string,
  kind: FailureKind,
  detail: string | RegExp,
): Promise<void> {
  const result = (await engine.http.result(runId)).json
  assert.equal(result.status, 'failed', JSON.stringify(result))
  if (typeof detail === 'string') assert.equal(result.detail, detail)
  else assert.match(String(result.detail), detail)
  assert.equal(failureOf(engine, runId), kind, `run ${runId}'s kind`)
}

/** Starts an engine, and stops it again if `body` throws before handing it back. */
async function withEngine<T>(options: EngineOptions, body: (engine: Engine) => Promise<T>) {
  const engine = await startEngine(options)
  try {
    return await body(engine)
  } finally {
    await engine.stop()
  }
}

// ---------------------------------------------------------------- 35

/**
 * Four failures, each of a kind the table resumes, each in another job — so every finishing function
 * and every job's context is crossed: the plan job's `finishRun`, the keyframes job's `finishStills`,
 * and `finishVideo` from the clips job and from the assemble job.
 */
interface Failing {
  name: string
  kind: FailureKind
  detail: string | RegExp
  options: Omit<EngineOptions, 'resume'>
  /** Fails one run in `engine` the way the case names, and answers its id. */
  fail(engine: Engine, requestId: string): Promise<string>
}

const FOUR: Failing[] = [
  {
    name: 'the planner unavailable at each of its sends, in the plan job',
    kind: 'unavailable',
    detail: PLANNER_UNAVAILABLE,
    options: {
      worker: true,
      script: { ...stillsScript(THREE_RANKS, THREE_RANKS_PICS), planner: [BUSY, BUSY, BUSY] },
    },
    fail: (engine, requestId) => finishedRun(engine, stillsRequest(requestId)),
  },
  {
    name: 'the reserve after three crashes, in the keyframes job',
    kind: 'crashed',
    detail:
      'attempt 4 cannot make its pictures within 6 image calls: the run made 5 before it and its placement makes 2 more, 7 in all (S-048)',
    options: { worker: false },
    // Check 6's crashes: held at the barons' witness, then at each further attempt's first call.
    async fail(engine, requestId) {
      const first = await killedMidStills(engine, stillsRequest(requestId), {
        script: stillsScript(THREE_RANKS, [a, b]),
        holdAtCall: 7,
        made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single'],
      })
      const second = await killedAgain(engine, first, {
        script: {},
        holdAtCall: 1,
        made: ['a1-shot-0-a', 'a1-shot-0-b', 'a1-shot-1-single', 'a2-shot-1-single'],
      })
      const third = await killedAgain(engine, second, {
        script: {},
        holdAtCall: 1,
        made: [
          'a1-shot-0-a',
          'a1-shot-0-b',
          'a1-shot-1-single',
          'a2-shot-1-single',
          'a3-shot-1-single',
        ],
      })
      const ran = await takenUp(engine, third, stillsScript(THREE_RANKS, THREE_RANKS_PICS))
      return ran.runId
    },
  },
  {
    name: 'a clip fal accepted and reported FAILED, in the clips job',
    kind: 'provider-failed',
    detail: 'the clip a1-shot-0-take-1 was accepted and then failed: {"detail":"inference failed"}',
    options: {
      worker: true,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS),
      video: {
        'shot-0-take-1': {
          throws:
            'the clip a1-shot-0-take-1 was accepted and then failed: {"detail":"inference failed"}',
          as: 'provider-failed',
        },
      },
    },
    fail: (engine, requestId) => finishedRun(engine, videoRequest(requestId)),
  },
  {
    name: "Gate 7's judge answering what names no question, in the assemble job",
    kind: 'unreadable',
    detail: /^the judge's answer on the cut does not name every question once: /,
    options: {
      worker: true,
      script: videoScript(THREE_RANKS, THREE_RANKS_PICS, { cut: { answers: [] } }),
    },
    fail: (engine, requestId) => finishedRun(engine, videoRequest(requestId)),
  },
]

test("35. with the switch on, a run failed unavailable, unreadable, provider-failed or crashed is resumed once, its resume written before its run.finished event in one transaction — a trigger the test adds on that event's insert records that the resume row already exists; with the switch off, the worker's default, the same four failures — each run's run.failure its kind and its detail pinned, so each is one the switch would resume — are none resumed", async () => {
  for (const [i, failing] of FOUR.entries()) {
    // The switch on: resumed once, and the resume there before `run.finished` was.
    await withEngine({ ...failing.options, resume: { delayMs: HOUR } }, async (engine) => {
      watchFinished(engine)
      const runId = await failing.fail(engine, `rf35-on-${i}`)
      await assertFailed(engine, runId, failing.kind, failing.detail)
      assert.deepEqual(
        seenAtFinish(engine, runId),
        [1],
        `${failing.name}: the resume row did not exist when run.finished was inserted`,
      )
      const resumes = resumesOf(engine, runId)
      assert.equal(resumes.length, 1, `${failing.name}: resumed ${resumes.length} times`)
      assert.equal(resumes[0]?.resume_request, null, "the engine's resume stores no remake list")
      assert.equal(resumes[0]?.state, 'running')
      assert.deepEqual(entries(engine.questionsPath), [], 'a question for a resume made')
    })

    // The switch off, as the worker is started unless told otherwise: the same failure, no resume.
    await withEngine(failing.options, async (engine) => {
      watchFinished(engine)
      const runId = await failing.fail(engine, `rf35-off-${i}`)
      await assertFailed(engine, runId, failing.kind, failing.detail)
      assert.deepEqual(seenAtFinish(engine, runId), [0])
      assert.deepEqual(resumesOf(engine, runId), [], `${failing.name}: resumed with the switch off`)
      assert.deepEqual(query(engine, 'SELECT run_id FROM run'), [{ run_id: runId }])
      assert.deepEqual(entries(engine.questionsPath), [])
    })
  }
})

// ---------------------------------------------------------------- 36

/** Nothing resumes the run, and nothing is written about it: the table refused it (S-163). */
function assertNotResumed(engine: Engine, runId: string, what: string): void {
  assert.deepEqual(resumesOf(engine, runId), [], `${what}: a run resumes it`)
  assert.deepEqual(entries(engine.questionsPath), [], `${what}: the questions file was written`)
}

test("36. the engine never resumes a run that resumes another or a run whose caller asked to cancel — each failed with a resumable kind in run.failure and its detail pinned, so only the rule refuses it — nor an off-spec or engine failure — the stand-in out of its script included — a stop, a refusal, a cancel or a completion; each run's own ending is asserted, and no run resumes it", async () => {
  const on = { delayMs: 0 }

  // A run that resumes another: the engine resumes the origin at once, and the resume fails the same
  // way — its picture keyed for every attempt — so it is a resume failed unavailable.
  await withEngine(
    {
      worker: true,
      resume: on,
      script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
      images: { 'shot-0-a': UNAVAILABLE },
    },
    async (engine) => {
      const origin = await finishedRun(engine, stillsRequest('rf36-resumes'))
      await assertFailed(engine, origin, 'unavailable', UNAVAILABLE_DETAIL)
      const [made] = resumesOf(engine, origin)
      assert.ok(made !== undefined, 'the engine did not resume the origin')
      await finishedAgain(engine, made.run_id)
      await assertFailed(engine, made.run_id, 'unavailable', UNAVAILABLE_DETAIL)
      assert.deepEqual(query(engine, 'SELECT resumes FROM run WHERE run_id = ?', made.run_id), [
        { resumes: origin },
      ])
      assertNotResumed(engine, made.run_id, 'a run that resumes another')
      assert.equal(query(engine, 'SELECT run_id FROM run').length, 2)
    },
  )

  // A run whose caller asked to cancel it after its plan stage started: the planner is unavailable at
  // each send, and the cancel lands, through the API, as the first send is made.
  {
    const requestId = 'rf36-cancelled'
    const holder: { engine?: Engine } = {}
    let asked = false
    const cancelling = (model: LanguageModelPort): LanguageModelPort => ({
      ...model,
      async structured(call) {
        if (call.role === 'planner' && !asked) {
          asked = true
          const engine = holder.engine as Engine
          const found = await engine.http.lookup(requestId)
          const cancelled = await engine.http.cancel(String(found.json.runId))
          assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json))
        }
        return model.structured(call)
      },
    })
    await withEngine(
      {
        worker: false,
        resume: on,
        script: { planner: [BUSY, BUSY, BUSY] },
        wrapModel: cancelling,
      },
      async (engine) => {
        holder.engine = engine
        await engine.startWorker()
        const runId = await finishedRun(engine, stillsRequest(requestId))
        assert.ok(asked, 'the planner was never asked')
        await assertFailed(engine, runId, 'unavailable', PLANNER_UNAVAILABLE)
        assert.deepEqual(
          query(engine, 'SELECT cancel_requested FROM run WHERE run_id = ?', runId),
          [{ cancel_requested: 1 }],
        )
        assertNotResumed(engine, runId, 'a run whose caller asked to cancel')
      },
    )
  }

  // An off-spec failure, and an engine failure: the stand-in out of its script.
  const failures: Array<{
    name: string
    options: Omit<EngineOptions, 'worker' | 'resume'>
    kind: FailureKind
    detail: string
  }> = [
    {
      name: 'an off-spec picture',
      options: {
        script: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
        images: { 'shot-0-a': { throws: 'the picture is 1536x864, not 9:16', as: 'off-spec' } },
      },
      kind: 'off-spec',
      detail: 'the picture is 1536x864, not 9:16 — and the call had already spent (S-142)',
    },
    {
      name: 'the stand-in out of its script',
      options: {
        script: {
          ...stillsScript(THREE_RANKS, THREE_RANKS_PICS),
          witness: (stillsScript(THREE_RANKS, THREE_RANKS_PICS).witness ?? []).slice(0, 1),
        },
      },
      kind: 'engine',
      detail: "the stand-in's script has no answer for witness call 2",
    },
  ]
  for (const [i, one] of failures.entries()) {
    await withEngine({ worker: true, resume: on, ...one.options }, async (engine) => {
      const runId = await finishedRun(engine, stillsRequest(`rf36-failed-${i}`))
      await assertFailed(engine, runId, one.kind, one.detail)
      assertNotResumed(engine, runId, one.name)
    })
  }

  // A stop: too few sentences for both groupings, before any call (D-112).
  await withEngine({ worker: true, resume: on, script: twoSurvivors() }, async (engine) => {
    const runId = await finishedRun(engine, shortRequest('rf36-stopped', 5))
    const result = (await engine.http.result(runId)).json
    assert.equal(result.status, 'stopped', JSON.stringify(result))
    assert.equal(result.rule, 'split')
    assert.equal(failureOf(engine, runId), null)
    assertNotResumed(engine, runId, 'a stop')
  })

  // A refusal: the pictures cost more than the caller's ceiling (S-030).
  await withEngine(
    { worker: true, resume: on, script: stillsScript(THREE_RANKS, THREE_RANKS_PICS) },
    async (engine) => {
      const runId = await finishedRun(engine, stillsRequest('rf36-refused', 50))
      const result = (await engine.http.result(runId)).json
      assert.equal(result.status, 'refused', JSON.stringify(result))
      assert.equal(result.reason, 'budget')
      assert.equal(result.limit, 'ceiling')
      assert.equal(failureOf(engine, runId), null)
      assertNotResumed(engine, runId, 'a refusal')
    },
  )

  // A cancel: asked for before any job was claimed.
  await withEngine({ worker: false, resume: on, script: twoSurvivors() }, async (engine) => {
    const submitted = await engine.http.submit(planRequest('rf36-cancel'))
    assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
    const runId = String(submitted.json.runId)
    const cancelled = await engine.http.cancel(runId)
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json))
    await engine.startWorker()
    await finishedAgain(engine, runId)
    const result = (await engine.http.result(runId)).json
    assert.equal(result.status, 'cancelled', JSON.stringify(result))
    assert.equal(failureOf(engine, runId), null)
    assertNotResumed(engine, runId, 'a cancel')
  })

  // A completion.
  await withEngine({ worker: true, resume: on, script: twoSurvivors() }, async (engine) => {
    const runId = await finishedRun(engine, planRequest('rf36-completed'))
    const result = (await engine.http.result(runId)).json
    assert.equal(result.status, 'completed', JSON.stringify(result))
    assert.equal(failureOf(engine, runId), null)
    assertNotResumed(engine, runId, 'a completion')
  })
})

// ---------------------------------------------------------------- 37

/**
 * The canonical's two candidates cost 110 and 111 — 221 spent — and the barons' picture is unavailable,
 * its guard passing at 221 + 15 = 236. The resume keeps both candidates and makes the barons' and the
 * hall's pictures: 30 more, a figure of 251.
 */
const COSTLY = {
  'shot-0-a': { costCents: 110 },
  'shot-0-b': { costCents: 111 },
  'shot-1-single': UNAVAILABLE,
}

test("37. the engine's resume that the cap cannot fit starts no run and appends one question naming the failed run and the four figures; one the ceiling cannot fit starts no run and writes nothing; each failed unavailable, its kind and detail pinned, and the same failure with a ceiling that fits is resumed", async () => {
  const script = stillsScript(THREE_RANKS, [a, b])

  // The cap, $2.50: 251 is one cent over it. The ceiling, 300, would fit.
  await withEngine(
    {
      worker: true,
      resume: { delayMs: HOUR },
      budgetMd: budgetMd('$2.50'),
      images: COSTLY,
      script,
    },
    async (engine) => {
      const runId = await finishedRun(engine, stillsRequest('rf37-cap'))
      await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
      assert.deepEqual(resumesOf(engine, runId), [])
      assert.deepEqual(query(engine, 'SELECT run_id FROM run'), [{ run_id: runId }])
      const asked = entries(engine.questionsPath)
      assert.equal(asked.length, 1, asked.join('\n'))
      const entry = asked[0] as string
      assert.match(
        entry,
        new RegExp(
          `^## \\S+ — run ${runId} not resumed: the resume would pass the per-reel cap\\n`,
        ),
      )
      for (const line of [
        '- **Request:** `rf37-cap`',
        '- **Asked by:** the engine',
        '- **Named:** none: every piece the run checked is kept',
        "- **Estimate:** 251 cents, what the reel spent and the resume's own 30 cents",
        '- **Spent:** 221 cents over the whole reel',
        '- **Per-reel cap:** 250 cents, the `Per reel, all-in` row of BUDGET.md',
        "- **Ceiling:** 300 cents, the caller's",
        '- **Rates:** 15 cents an image, 4 cents a second of video, 0 cents a character of narration',
      ]) {
        assert.ok(entry.includes(`\n${line}\n`), `the question has no line ${line}:\n${entry}`)
      }
    },
  )

  // The ceiling, 250: 251 is one cent over it, the cap ($10.00) far above. No question.
  await withEngine(
    {
      worker: true,
      resume: { delayMs: HOUR },
      budgetMd: budgetMd('$10.00'),
      images: COSTLY,
      script,
    },
    async (engine) => {
      const runId = await finishedRun(engine, stillsRequest('rf37-ceiling', 250))
      await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
      assert.deepEqual(resumesOf(engine, runId), [])
      assert.deepEqual(query(engine, 'SELECT run_id FROM run'), [{ run_id: runId }])
      assert.deepEqual(entries(engine.questionsPath), [])
    },
  )

  // The same failure, a ceiling of 251: exactly at it, admitted, and resumed.
  await withEngine(
    {
      worker: true,
      resume: { delayMs: HOUR },
      budgetMd: budgetMd('$10.00'),
      images: COSTLY,
      script,
    },
    async (engine) => {
      const runId = await finishedRun(engine, stillsRequest('rf37-fits', 251))
      await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
      assert.equal(resumesOf(engine, runId).length, 1)
      assert.deepEqual(entries(engine.questionsPath), [])
    },
  )
})

// ---------------------------------------------------------------- 38

/** Every row a resume would have written in a run other than `origin`, by table. */
function otherRows(engine: Engine, origin: string) {
  const count = (sql: string) => query<{ n: number }>(engine, sql, origin)[0]?.n
  return {
    run: count('SELECT count(*) AS n FROM run WHERE run_id != ?'),
    plan: count('SELECT count(*) AS n FROM plan WHERE run_id != ?'),
    picture: count('SELECT count(*) AS n FROM picture WHERE run_id != ?'),
    observation: count('SELECT count(*) AS n FROM observation WHERE run_id != ?'),
    reconciliation: count('SELECT count(*) AS n FROM reconciliation WHERE run_id != ?'),
    run_event: count('SELECT count(*) AS n FROM run_event WHERE run_id != ?'),
    job: count('SELECT count(*) AS n FROM job WHERE correlation_id != ?'),
  }
}

const NONE = {
  run: 0,
  plan: 0,
  picture: 0,
  observation: 0,
  reconciliation: 0,
  run_event: 0,
  job: 0,
}

/** The one line the questions file holds: the run, and why its resume was not made. */
function assertUnmadeLine(engine: Engine, runId: string, why: string): void {
  const text = existsSync(engine.questionsPath) ? readFileSync(engine.questionsPath, 'utf8') : ''
  const written = entries(engine.questionsPath)
  assert.equal(written.length, 1, text)
  assert.equal(
    written[0]?.replace(/^## \S+ /, '## <time> '),
    `## <time> — run ${runId} not resumed: the engine's resume could not be made: ${why}\n`,
  )
  assert.equal(written[0]?.trimEnd().split('\n').length, 1, 'more than one line')
}

test('38. a resume the engine cannot make — a trigger the test adds makes its run insert raise, or its cap file cannot be read — leaves the failed run failed with its kind and detail, its job done, no resume row, no copied row, and one line in the questions file naming the run and why', async () => {
  // The canonical's two candidates decided, then the barons' picture unavailable: rows to copy.
  const script = stillsScript(THREE_RANKS, [a, b])
  const images = { 'shot-1-single': UNAVAILABLE }

  // A trigger refusing the resume's run insert. RAISE(FAIL) keeps what the statement did before it
  // raised — the row itself — so only a rollback to the savepoint takes the row away again.
  await withEngine({ worker: false, resume: { delayMs: 0 }, images, script }, async (engine) => {
    exec(
      engine,
      `CREATE TRIGGER refuse_resume AFTER INSERT ON run WHEN NEW.resumes IS NOT NULL
         BEGIN SELECT RAISE(FAIL, 'the test refuses every resume''s run'); END;`,
    )
    await engine.startWorker()
    const runId = await finishedRun(engine, stillsRequest('rf38-trigger'))
    await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
    assert.deepEqual(
      query(engine, 'SELECT kind, state FROM job WHERE correlation_id = ? ORDER BY id', runId),
      [
        { kind: 'reel.plan', state: 'done' },
        { kind: 'reel.keyframes', state: 'done' },
      ],
    )
    assert.equal(query(engine, 'SELECT * FROM picture WHERE run_id = ?', runId).length, 2)
    assert.deepEqual(resumesOf(engine, runId), [])
    assert.deepEqual(otherRows(engine, runId), NONE)
    assertUnmadeLine(engine, runId, "the test refuses every resume's run")
  })

  // The cap file made unreadable while the stage runs — after the attempt read its cap — so the
  // resume, reading it again before the failing transaction, cannot.
  const holder: { engine?: Engine } = {}
  let spoiled = false
  const spoiling = (model: LanguageModelPort): LanguageModelPort => ({
    ...model,
    async observe(call) {
      if (!spoiled) {
        spoiled = true
        writeFileSync(holder.engine?.budgetPath as string, '# Budget\n\nNo table here.\n')
      }
      return model.observe(call)
    },
  })
  await withEngine(
    {
      worker: false,
      resume: { delayMs: 0 },
      budgetMd: budgetMd('$3.00'),
      images,
      script,
      wrapModel: spoiling,
    },
    async (engine) => {
      holder.engine = engine
      await engine.startWorker()
      const runId = await finishedRun(engine, stillsRequest('rf38-cap'))
      assert.ok(spoiled, 'the cap file was never spoiled')
      await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
      assert.deepEqual(
        query(engine, 'SELECT kind, state FROM job WHERE correlation_id = ? ORDER BY id', runId),
        [
          { kind: 'reel.plan', state: 'done' },
          { kind: 'reel.keyframes', state: 'done' },
        ],
      )
      assert.deepEqual(resumesOf(engine, runId), [])
      assert.deepEqual(otherRows(engine, runId), NONE)
      assertUnmadeLine(
        engine,
        runId,
        `${engine.budgetPath as string} has no "Per reel, all-in" row`,
      )
    },
  )
})

// ---------------------------------------------------------------- 39

test("39. the service turns the engine's resume on with a delay of 900000 ms by default and refuses a delay that is not a whole number of milliseconds at least 0; started with a stand-in script file failing a picture as unavailable and a short delay — CUTROOM_RESUME_DELAY_MS, SETTING_NAMES' new entry — it resumes that run — the resume's row exists, its resume_request null, its job's run_at the failed run's run.finished time plus the delay; the worker started without the option, the same script failing the same picture, leaves that run failed unavailable — its run.failure and detail pinned — and resumes nothing", async () => {
  // The setting: its name, its default, and what it refuses.
  assert.equal(SETTING_NAMES.resumeDelayMs, 'CUTROOM_RESUME_DELAY_MS')
  assert.equal(readSettings({}).resumeDelayMs, 900000)
  assert.equal(readSettings({ CUTROOM_RESUME_DELAY_MS: '0' }).resumeDelayMs, 0)
  assert.equal(readSettings({ CUTROOM_RESUME_DELAY_MS: '1500' }).resumeDelayMs, 1500)
  for (const bad of ['1.5', '-1', 'soon', '1e400']) {
    assert.throws(
      () => readSettings({ CUTROOM_RESUME_DELAY_MS: bad }),
      new RegExp(
        `^Error: CUTROOM_RESUME_DELAY_MS is '${bad.replace('.', '\\.')}', and it must be a whole number of at least 0$`,
      ),
      bad,
    )
  }

  // The service, as a program: one picture unavailable, and a delay of a minute — short of the
  // default's fifteen, and long enough that the resume is still waiting when the rows are read.
  const delayMs = 60_000
  const standIn = {
    model: stillsScript(THREE_RANKS, THREE_RANKS_PICS),
    images: { 'a1-shot-0-a': UNAVAILABLE },
  }
  const service = await startService({
    standIn,
    env: { [SETTING_NAMES.resumeDelayMs]: String(delayMs) },
  })
  try {
    try {
      const submitted = await service.http.submit(stillsRequest('rf39'))
      assert.equal(submitted.status, 202, JSON.stringify(submitted.json))
      const runId = String(submitted.json.runId)
      await waitFor(
        `run ${runId} to finish`,
        async () => (await service.http.status(runId)).json.state === 'finished',
        VIDEO_FINISH_MS,
      )
      const result = (await service.http.result(runId)).json
      assert.equal(result.status, 'failed', JSON.stringify(result))
      assert.equal(result.detail, UNAVAILABLE_DETAIL)
      const read = <T>(sql: string, ...params: string[]) =>
        service.query<T>(sql, ...params).map((row) => ({ ...row }) as T)
      assert.deepEqual(read('SELECT failure FROM run WHERE run_id = ?', runId), [
        { failure: 'unavailable' },
      ])

      const resumes = read<{ run_id: string; resume_request: string | null }>(
        'SELECT run_id, resume_request FROM run WHERE resumes = ?',
        runId,
      )
      assert.equal(resumes.length, 1, 'the service did not resume the run')
      const resume = resumes[0] as { run_id: string; resume_request: string | null }
      assert.equal(resume.resume_request, null)
      const [finishedAt] = read<{ at: string }>(
        "SELECT at FROM run_event WHERE run_id = ? AND json_extract(body, '$.type') = 'run.finished'",
        runId,
      )
      assert.ok(finishedAt !== undefined, 'the failed run has no run.finished event')
      const jobs = read<{ kind: string; state: string; run_at: string; parent_id: number | null }>(
        'SELECT kind, state, run_at, parent_id FROM job WHERE correlation_id = ?',
        resume.run_id,
      )
      assert.deepEqual(
        jobs.map((j) => [j.kind, j.state, j.parent_id]),
        [['reel.keyframes', 'queued', null]],
      )
      assert.equal(
        Date.parse(jobs[0]?.run_at as string),
        Date.parse(finishedAt.at) + delayMs,
        `the resume is due at ${jobs[0]?.run_at}, not ${delayMs} ms after run.finished at ${finishedAt.at}`,
      )
    } finally {
      await service.stop()
    }
  } finally {
    service.clean()
  }

  // The worker started without the option: the same script, the same picture, and no resume.
  await withEngine(
    {
      worker: true,
      script: standIn.model,
      images: standIn.images,
    },
    async (engine) => {
      const runId = await finishedRun(engine, stillsRequest('rf39-worker'))
      await assertFailed(engine, runId, 'unavailable', UNAVAILABLE_DETAIL)
      assert.deepEqual(resumesOf(engine, runId), [])
      assert.deepEqual(query(engine, 'SELECT run_id FROM run'), [{ run_id: runId }])
    },
  )
})

// ---------------------------------------------------------------- 40

test("40. the engine's own resume copies the failing transaction's labels: after a crash cuts off a picture, a second attempt degrades shot-1 for want of a slot and then fails unavailable on a later picture; the engine's resume, made in that transaction, keeps shot-1 degraded with its reason and no image call", async () => {
  // Killed inside b's witness, the first attempt leaves a decided — failed, it shows a person — and b
  // cut off. The second keeps a, makes b again, which fails too, and repairs the canonical with the
  // one slot its reserve holds (6 − 2 earlier − 3 unmade); the barons' picture fails Gate 1 with no
  // slot free, so shot-1 is degraded; and the hall's picture is unavailable. The engine's resume,
  // made in that transaction after shot-1's labels, copies four decided pictures and not b's
  // cut-off first call, so its reserve is 6 − 4 − 1 = 1: a slot a shot reopened would take.
  await withEngine(
    {
      worker: false,
      resume: { delayMs: 0 },
      images: { 'a2-shot-2-single': UNAVAILABLE },
    },
    async (engine) => {
      const killed = await killedMidStills(engine, stillsRequest('rf40'), {
        script: stillsScript(THREE_RANKS, [a, b], { reconciler: { [a.key]: showsPerson(a) } }),
        holdAtCall: 5,
        made: ['a1-shot-0-a', 'a1-shot-0-b'],
      })
      await engine.restart({
        script: stillsScript(THREE_RANKS, [b, again(a, 'repair'), barons, hall], {
          reconciler: { [b.key]: showsPerson(b), [barons.key]: showsPerson(barons) },
        }),
      })
      await engine.startWorker()
      const origin = killed.runId
      await finishedAgain(engine, origin)
      await assertFailed(engine, origin, 'unavailable', UNAVAILABLE_DETAIL)
      const calls = (runId: string) =>
        engine.image.calls.filter((c) => c.runId === runId).map((c) => c.pictureId)
      assert.deepEqual(calls(origin), [
        'a2-shot-0-b',
        'a2-shot-0-repair',
        'a2-shot-1-single',
        'a2-shot-2-single',
      ])
      const [was] = query<{ gate: string; reason: string }>(
        engine,
        "SELECT gate, reason FROM degradation WHERE run_id = ? AND shot_id = 'shot-1'",
        origin,
      )
      assert.ok(was !== undefined, 'the second attempt did not degrade shot-1')
      assert.equal(was.gate, '1')
      assert.match(
        was.reason,
        /^a2-shot-1-single failed Gate 1 at reconcile: .*; no reserve slot is free \(S-043\)$/,
      )

      // The resume, made in the failing transaction: its copy of the barons' picture carries the
      // degradation that transaction wrote. (Due at once, it may already be making its own pictures.)
      const resumes = resumesOf(engine, origin)
      assert.equal(resumes.length, 1, 'the engine did not resume the run')
      const made = (resumes[0] as { run_id: string }).run_id
      assert.deepEqual(
        query(
          engine,
          'SELECT picture_id, kept_from, degradation FROM picture WHERE run_id = ? AND kept_from IS NOT NULL ORDER BY seq',
          made,
        ),
        [
          { picture_id: 'a1-shot-0-a', kept_from: origin, degradation: null },
          { picture_id: 'a2-shot-0-b', kept_from: origin, degradation: null },
          { picture_id: 'a2-shot-0-repair', kept_from: origin, degradation: null },
          { picture_id: 'a2-shot-1-single', kept_from: origin, degradation: was.reason },
        ],
      )

      // Run at once: shot-1 degraded again with no call, its gate and reason as they were; one call,
      // the hall's picture.
      await finishedAgain(engine, made)
      assert.deepEqual(calls(made), ['a3-shot-2-single'], 'the resumed run reopened a shot')
      const result = (await engine.http.result(made)).json
      assert.equal(result.status, 'completed', JSON.stringify(result))
      const ran = await readStills(engine, made, result)()
      assert.deepEqual(ran.degradations, [
        { shot_id: 'shot-1', gate: was.gate, reason: was.reason },
      ])
      assert.deepEqual(
        (result.stills as Array<{ shotId: string; pictureId: string }>).map(
          (s) => `${s.shotId} ${s.pictureId}`,
        ),
        ['shot-0 a2-shot-0-repair', 'shot-2 a3-shot-2-single'],
      )
      assert.deepEqual(result.degradations, [{ shotId: 'shot-1', reason: was.reason }])
    },
  )
})
