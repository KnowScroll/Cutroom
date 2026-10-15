/**
 * The suite's `tests` step: two pools that never overlap (S-192, §4.2).
 *
 * The ordinary files run first, several at a time; then the twelve PATH-only journey children run,
 * fewer at a time, each still spawning the nested suite its own file ratifies. Nothing is skipped,
 * no bound is raised and no child's internal concurrency changes — S-176's four rejections stand.
 * What changes is that ordinary work no longer runs BESIDE a nested child suite, which is the cause
 * S-176 named when it made the outer runner serial.
 *
 * Writes the per-file results both pools produced to the receipt's raw file, merged, with each
 * pool's wall time, concurrency and lowest free memory beside them — so a contention change leaves
 * evidence in `.verification/receipt.json` rather than in a session's memory.
 *
 *   node scripts/run-tests.mjs            both pools, in order
 *   node scripts/run-tests.mjs --serial   one pool, every file, concurrency 1 (what S-176 ran)
 */
import { spawn } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { freemem, totalmem } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { dim, green, red, REPO } from './_lib.mjs'
import {
  classify,
  mergeRaw,
  ORDINARY_CONCURRENCY,
  SECRETS_CONCURRENCY,
  testFiles,
} from './_pools.mjs'
import { ensureVerificationDir, testsRawPath, verificationDir } from './_verification.mjs'

const WHERE = process.cwd()
const serial = process.argv.includes('--serial')
// Named files run instead of every file: how a map-selected set of tests (S-196) gets the same
// two pools as a full run, because a broad selection run one at a time is SLOWER than the whole
// suite pooled — measured: 110 selected files cost 1361 s serially against 617 s pooled.
const named = process.argv.slice(2).filter((arg) => arg.endsWith('.test.ts'))
const files = named.length > 0 ? named : testFiles(WHERE)
if (files.length === 0) {
  console.error(`${red('FAIL')}  no test file found under tests/, packages/ or apps/`)
  process.exit(2)
}

const { ordinary, secrets } = classify(files)
const pools = serial
  ? [{ label: 'every file', files, concurrency: 1 }]
  : [
      { label: 'ordinary', files: ordinary, concurrency: ORDINARY_CONCURRENCY },
      { label: 'secrets', files: secrets, concurrency: SECRETS_CONCURRENCY },
    ]

ensureVerificationDir(WHERE)
const rawOf = (label) => join(verificationDir(WHERE), `tests-${label.replace(/\s+/g, '-')}.json`)
const reporter = pathToFileURL(join(REPO, 'scripts', 'test-receipt.mjs')).href

/** One pool, run to completion, with free memory sampled while it runs. */
async function runPool(pool) {
  rmSync(rawOf(pool.label), { force: true })
  let lowest = freemem()
  const sampler = setInterval(() => {
    const now = freemem()
    if (now < lowest) lowest = now
  }, 500)
  const started = Date.now()
  const child = spawn(
    process.execPath,
    [
      '--experimental-strip-types',
      '--test',
      `--test-concurrency=${pool.concurrency}`,
      '--test-reporter=tap',
      '--test-reporter-destination=stdout',
      `--test-reporter=${reporter}`,
      `--test-reporter-destination=${rawOf(pool.label)}`,
      ...pool.files,
    ],
    { cwd: WHERE, stdio: 'inherit' },
  )
  const code = await new Promise((resolve) => child.on('close', resolve))
  clearInterval(sampler)
  let raw
  try {
    raw = JSON.parse(readFileSync(rawOf(pool.label), 'utf8'))
  } catch {
    raw = undefined
  }
  return {
    label: pool.label,
    files: pool.files.length,
    concurrency: pool.concurrency,
    ms: Date.now() - started,
    ok: code === 0,
    freeMinMB: Math.round(lowest / 2 ** 20),
    raw,
  }
}

const results = []
for (const pool of pools) {
  if (pool.files.length === 0) continue
  console.log(
    dim(`# pool ${pool.label}: ${pool.files.length} file(s) at concurrency ${pool.concurrency}`),
  )
  results.push(await runPool(pool))
}

const merged = mergeRaw(results.map((result) => result.raw))
writeFileSync(
  testsRawPath(WHERE),
  `${JSON.stringify(
    {
      ...merged,
      totalMemoryMB: Math.round(totalmem() / 2 ** 20),
      freeMinMB: Math.min(...results.map((result) => result.freeMinMB)),
      pools: results.map(({ raw: _raw, ...rest }) => rest),
    },
    null,
    2,
  )}\n`,
)
for (const result of results) rmSync(rawOf(result.label), { force: true })

console.log('')
for (const result of results) {
  const mark = result.ok ? green('ok') : red('FAIL')
  console.log(
    `  ${mark}    pool ${result.label.padEnd(10)} ${String((result.ms / 1000).toFixed(1)).padStart(7)} s  ` +
      `${String(result.files).padStart(3)} file(s) at ${result.concurrency}  ` +
      `${result.freeMinMB} MB free at its lowest`,
  )
}
console.log(
  dim(
    `  ${merged.total} test(s), ${merged.fail} failing, over ${Object.keys(merged.files).length} file(s)`,
  ),
)
process.exit(results.every((result) => result.ok) ? 0 : 1)
