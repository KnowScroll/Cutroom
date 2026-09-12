#!/usr/bin/env node
/**
 * One job: report how this repository sees steering/DECISIONS.md, and whether what it sees
 * is current.
 *
 *   node scripts/decisions.mjs              what we are pinned to, and whether it is stale
 *   node scripts/decisions.mjs --fetch       ask the remote, rather than trusting a local ref
 *   node scripts/decisions.mjs D-086         print one decision
 *
 * D-088: there is exactly ONE DECISIONS.md and it lives in the KnowScroll steering
 * repository. This repository does not get a copy that can drift — it gets a pinned
 * submodule at steering-ref/, which is one copy at a known commit.
 *
 * A pin that nobody updates is the failure mode of a submodule, so this script makes that
 * visible and exits non-zero when it happens. It checks BOTH directions:
 *
 *   1. is the pin behind the remote?
 *   2. is the remote behind a local steering checkout?  (the authority living on one
 *      machine only is invisible to check 1 — and it is the situation on the day this
 *      repository was created)
 *
 * Set CUTROOM_STEERING_DIR to a local checkout of the steering repository to enable
 * check 2. It is optional, and never a hardcoded path (D-086).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { REPO, bold, dim, fail, pass, run, setting, yellow } from './_lib.mjs'

const SUBMODULE = 'steering-ref'
const DECISIONS = join(REPO, SUBMODULE, 'steering', 'DECISIONS.md')

const git = (args, cwd = REPO) => run('git', args, { cwd }).stdout.trim()

function pinnedCommit() {
  // The superproject's gitlink is the pin; the submodule's own HEAD can be moved by hand and
  // is not authoritative. Read the commit first, then the index — a submodule that has been
  // added but not committed yet is still a pin, and must not report as "none".
  for (const args of [
    ['ls-tree', 'HEAD', SUBMODULE],
    ['ls-files', '-s', SUBMODULE],
  ]) {
    const match = /([0-9a-f]{40})/.exec(git(args))
    if (match) return match[1]
  }
  return null
}

function printDecision(id) {
  if (!existsSync(DECISIONS)) {
    fail(
      `${SUBMODULE} is not checked out, so no decision can be read. Run:\n` +
        `      git submodule update --init --depth 1`,
    )
    return
  }
  const text = readFileSync(DECISIONS, 'utf8')
  const start = text.indexOf(`\n## ${id} `)
  if (start === -1) {
    fail(
      `${id} is not in DECISIONS.md at the pinned commit. It may be newer than the pin — ` +
        `run: node scripts/decisions.mjs --fetch`,
    )
    return
  }
  const after = text.indexOf('\n## ', start + 1)
  console.log(text.slice(start + 1, after === -1 ? undefined : after).trimEnd())
}

function report({ fetch }) {
  console.log(`\n${bold('The decisions this repository answers to')}\n`)

  if (!existsSync(join(REPO, SUBMODULE, '.git')) && !existsSync(DECISIONS)) {
    fail(
      `${SUBMODULE}/ is not checked out. Nothing here can be checked against the ` +
        `authority until it is. Run:\n      git submodule update --init --depth 1`,
    )
    return
  }

  const pin = pinnedCommit()
  const text = readFileSync(DECISIONS, 'utf8')
  const ids = [...text.matchAll(/^## (D-\d+) \|/gm)].map((m) => m[1])
  const newest = ids.at(-1) ?? '(none)'
  console.log(`  pinned commit   ${pin ?? '(not a submodule yet)'}`)
  console.log(`  decisions read  ${ids.length}, newest ${newest}`)

  // 1. Is the pin behind the remote?
  // Only --fetch touches the network. The default path must stay fast and must never hang:
  // this script runs in the session-start hook, which has a timeout.
  if (fetch) {
    run('git', ['fetch', '--quiet', 'origin', 'main'], {
      cwd: join(REPO, SUBMODULE),
      timeout: 20_000,
    })
  }
  const remote = git(['rev-parse', 'origin/main'], join(REPO, SUBMODULE))
  // Equality decides staleness, not the commit count: a shallow submodule may not have the
  // history for `rev-list` to count at all, and an empty count must never read as "current".
  const stale = Boolean(remote) && Boolean(pin) && remote !== pin
  const behind = stale
    ? git(['rev-list', '--count', `${pin}..origin/main`], join(REPO, SUBMODULE)) || '?'
    : '0'
  console.log(`  remote main     ${remote || '(unknown)'}${fetch ? '' : dim('  (not fetched)')}`)

  // 2. Is the remote behind a local steering checkout?
  // Relative to this repository, so the setting is never a machine-specific path (D-086).
  const configured = setting('CUTROOM_STEERING_DIR')
  const local = configured ? resolve(REPO, configured) : undefined
  let unpushed = '0'
  if (local && existsSync(join(local, 'steering', 'DECISIONS.md'))) {
    if (fetch) run('git', ['fetch', '--quiet', 'origin', 'main'], { cwd: local, timeout: 20_000 })
    unpushed = git(['rev-list', '--count', 'origin/main..HEAD'], local) || '0'
    const localIds =
      readFileSync(join(local, 'steering', 'DECISIONS.md'), 'utf8').match(/^## (D-\d+) \|/gm) ?? []
    console.log(
      `  local checkout  ${localIds.length} decisions, ` + `${unpushed} commit(s) not pushed`,
    )
  } else {
    console.log(`  local checkout  ${dim('not configured (CUTROOM_STEERING_DIR)')}`)
  }

  console.log('')

  if (Number(unpushed) > 0) {
    fail(
      `the steering repository has ${unpushed} commit(s) that are not on its remote.\n` +
        `      A submodule can only pin what the remote has, so the decisions this repository\n` +
        `      can see are older than the ones that exist. Push there, then:\n` +
        `        git submodule update --remote ${SUBMODULE} && git add ${SUBMODULE}`,
    )
    return
  }
  if (stale) {
    fail(
      `the pin is ${behind} commit(s) behind origin/main. Decisions have been ratified that\n` +
        `      this repository cannot see. Update the pin:\n` +
        `        git submodule update --remote ${SUBMODULE} && git add ${SUBMODULE}`,
    )
    return
  }
  if (!fetch) {
    console.log(
      `${yellow('note')}  compared against a local ref. For the real answer: ` +
        `node scripts/decisions.mjs --fetch\n`,
    )
  }
  pass(`the pin is current, and ${ids.length} decisions are readable at ${SUBMODULE}/steering/`)
}

const args = process.argv.slice(2)
const id = args.find((a) => /^D-\d+$/i.test(a))
if (id) printDecision(id.toUpperCase())
else report({ fetch: args.includes('--fetch') })
