import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO } from './_repo.ts'

// What every feature file in docs/features/ carries (S-015, S-064). S-015 put the features moved from
// the steering repository here and promised this test "at the second move"; there are five files now.
//
// - FRONT MATTER, as the file's first bytes, with `status:` and `authority:` present and not empty.
//   Their values are not constrained: D-079 holds `docs/` to presence only.
// - WHERE IT CAME FROM. Whether a feature was moved is not taken from the file, nor from a list kept
//   here: it is read from the steering repository's history at the pinned commit. A feature the
//   steering repository ever held at `steering/features/<slug>.md` opens — before its title — with a
//   note saying when it moved, naming that path; and a steering commit the note says holds it must
//   hold it. A feature it never held says it was created here, and claims no move.

const FEATURES = join(REPO, 'docs', 'features')
const STEERING = join(REPO, 'steering-ref')

interface Feature {
  slug: string
  /** The whole file, with CRLF folded: this test is about front matter, not line endings. */
  text: string
}

function features(): Feature[] {
  return readdirSync(FEATURES)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({
      slug: f.slice(0, -'.md'.length),
      text: readFileSync(join(FEATURES, f), 'utf8').replace(/\r\n/g, '\n'),
    }))
}

/** The front matter's keys and values, or null when the file does not begin with a block. */
function frontMatter(text: string): Record<string, string> | null {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) return null
  const fields: Record<string, string> = {}
  for (const line of text.slice(4, end).split('\n')) {
    const match = /^([a-z][a-z-]*):(.*)$/.exec(line)
    if (match) fields[match[1] as string] = (match[2] as string).trim()
  }
  return fields
}

/** Everything between the front matter and the first `# ` title. */
function beforeTitle(text: string): string {
  const end = text.indexOf('\n---\n', 3)
  const body = end === -1 ? text : text.slice(end + '\n---\n'.length)
  const title = body.search(/^# /m)
  return title === -1 ? body : body.slice(0, title)
}

/** Everything before the first `## ` heading. */
const header = (text: string) => {
  const at = text.search(/^## /m)
  return at === -1 ? text : text.slice(0, at)
}

/** One blockquote, from the line matching `start` to the last `>` line after it, as one line of prose. */
function quoteFrom(text: string, start: RegExp): string | null {
  const lines = text.split('\n')
  const first = lines.findIndex((l) => start.test(l))
  if (first === -1) return null
  const quote: string[] = []
  for (const line of lines.slice(first)) {
    if (!line.startsWith('>')) break
    quote.push(line.replace(/^>\s?/, ''))
  }
  return quote.join(' ').replace(/\s+/g, ' ')
}

const git = (...args: string[]) =>
  execFileSync('git', ['-C', STEERING, ...args], { encoding: 'utf8' }).trim()

/** Whether the steering repository's history, up to the pinned commit, ever held this feature. */
function heldBySteering(slug: string): boolean {
  return git('log', '--format=%H', 'HEAD', '--', `steering/features/${slug}.md`) !== ''
}

const MOVED = /^> \*\*Moved here on \d{4}-\d{2}-\d{2}\*\* from the KnowScroll repository's /

test('every feature file in docs/features/ begins with front matter carrying a status and an authority (S-015, D-079)', () => {
  const all = features()
  assert.ok(all.length > 0, 'docs/features/ holds no feature file')
  for (const { slug, text } of all) {
    const fields = frontMatter(text)
    assert.ok(fields !== null, `docs/features/${slug}.md does not begin with front matter`)
    assert.ok(
      (fields.status ?? '') !== '',
      `docs/features/${slug}.md has no status: in its front matter`,
    )
    assert.ok(
      (fields.authority ?? '') !== '',
      `docs/features/${slug}.md has no authority: in its front matter`,
    )
  }
})

test('a feature the steering repository once held opens with a note saying when it moved from there, naming its path and, where it names one, a steering commit that holds it (S-015, S-064)', () => {
  // A shallow history would make every feature look new here, and this test pass on nothing.
  assert.ok(
    existsSync(join(STEERING, 'steering', 'DECISIONS.md')),
    'steering-ref is not checked out',
  )
  assert.equal(
    git('rev-parse', '--is-shallow-repository'),
    'false',
    'steering-ref is a shallow clone, so its history cannot say which features were moved',
  )

  const moved = features().filter((f) => heldBySteering(f.slug))
  assert.ok(moved.length > 0, 'no feature file here was ever held by the steering repository')
  for (const { slug, text } of moved) {
    const note = quoteFrom(beforeTitle(text), MOVED)
    assert.ok(
      note !== null,
      `docs/features/${slug}.md was held by the steering repository at steering/features/${slug}.md, and has no "Moved here on" note before its title`,
    )
    assert.ok(
      note.includes(`\`steering/features/${slug}.md\``),
      `docs/features/${slug}.md's move note does not name steering/features/${slug}.md: ${note}`,
    )
    const commit = /the last steering commit holding it is `([0-9a-f]{7,40})`/.exec(note)?.[1]
    if (commit !== undefined) {
      assert.doesNotThrow(
        () => git('cat-file', '-e', `${commit}:steering/features/${slug}.md`),
        `docs/features/${slug}.md says steering commit ${commit} holds it, and that commit does not`,
      )
    }
  }
})

test('a feature the steering repository never held says it was created here, and claims no move (S-064)', () => {
  const created = features().filter((f) => !heldBySteering(f.slug))
  assert.ok(created.length > 0, 'no feature file here was created in this repository')
  for (const { slug, text } of created) {
    assert.ok(
      !/^> \*\*Moved here on/m.test(text),
      `docs/features/${slug}.md says it moved here, and the steering repository never held it`,
    )
    assert.match(
      header(text),
      /^> \*\*Created \d{4}-\d{2}-\d{2}\b/m,
      `docs/features/${slug}.md says neither where it moved from nor that it was created here`,
    )
  }
})
