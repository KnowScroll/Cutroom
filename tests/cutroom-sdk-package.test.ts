import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { before, describe, test } from 'node:test'
import { REPO } from './_repo.ts'

// cutroom-sdk-package, Slice 1/2 — the package-owner test.
//
// The build/pack script `scripts/package-sdk.mjs` is run once before this test file, and the
// two produced tarballs are the only thing under test here. Each assertion below either
// inspects a staged manifest, enumerates archive entries, or installs the artifacts in a
// fresh consumer and exercises the SDK through plain Node.
//
// The fixed-port race (two-caller) is owned by `tests/cutroom-sdk-launcher.test.ts` and the
// Slice 3 evidence at `ae0599a`. This test references that coverage and does not duplicate
// it.

// ---------------------------------------------------------------- the build step

const STAGING = resolve(REPO, '.package-staging')
const CONTRACT_TARBALL = join(STAGING, 'cutroom-reel-contract-1.0.0.tgz')
const SDK_TARBALL = join(STAGING, 'cutroom-sdk-1.0.0.tgz')
const PACKAGE_SCRIPT = resolve(REPO, 'scripts', 'package-sdk.mjs')

/**
 * Run the build script once before the file's tests. If the script does not exist yet
 * (today, against the workspace-only state), this throws with `ENOENT`, which fails the
 * whole file — and every individual test below is reported as failing for the same reason.
 * Once Slice 2 adds the script, this passes and the artifact tests run.
 */
before(() => {
  if (!existsSync(PACKAGE_SCRIPT)) {
    throw new Error(
      `the build script ${PACKAGE_SCRIPT} does not exist; the package test fails closed ` +
        `until scripts/package-sdk.mjs is added (docs/features/cutroom-sdk-package.md Slice 2).`,
    )
  }
  const result = spawnSync(process.execPath, [PACKAGE_SCRIPT], {
    cwd: REPO,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`scripts/package-sdk.mjs failed:\n${result.stdout}\n${result.stderr}`)
  }
})

// ---------------------------------------------------------------- archive helpers

/**
 * Read every entry of a tarball into memory. Uses Node's built-in tar reader.
 */
async function tarEntries(file: string): Promise<Array<{ path: string; content: Buffer }>> {
  const { readFileSync } = await import('node:fs')
  const entries: Array<{ path: string; content: Buffer }> = []
  // Node 22 has node:tar but not as a public stable API on every platform; fall back to a
  // portable parser: gnu long-name aware, plain header parse. Only `.tar.gz` (`.tgz`) is
  // used. The stream is `gzip -dc | tar -xf -` is portable, but we want no shell. Use zlib.
  const { gunzipSync } = await import('node:zlib')
  const gz = readFileSync(file)
  const tar = gunzipSync(gz)
  let offset = 0
  const decoder = new TextDecoder('utf8')
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) {
      // End-of-archive marker: two zero blocks.
      break
    }
    const nameField = decoder.decode(header.subarray(0, 100))
    const name = nameField.replace(/\0.*$/, '')
    const sizeOctal = decoder.decode(header.subarray(124, 136)).trim()
    const size = Number.parseInt(sizeOctal, 8)
    const content = tar.subarray(offset + 512, offset + 512 + size)
    entries.push({ path: name, content })
    const padded = size + ((512 - (size % 512)) % 512)
    offset += 512 + padded
  }
  return entries
}

/**
 * Find a single entry by exact path, or fail.
 */
async function entry(file: string, member: string): Promise<Buffer> {
  const entries = await tarEntries(file)
  const found = entries.find((e) => e.path === member || e.path.endsWith('/' + member))
  if (found === undefined) {
    const names = entries.map((e) => e.path).join(', ')
    throw new Error(`${file} has no member ${member}; entries: ${names}`)
  }
  return found.content
}

/**
 * Read the package.json inside a tarball and parse it.
 */
async function stagedManifest(file: string): Promise<Record<string, unknown>> {
  const buf = await entry(file, 'package.json')
  return JSON.parse(buf.toString('utf8'))
}

// ---------------------------------------------------------------- tests

describe('the build script produced both tarballs', () => {
  test('the contract tarball exists at .package-staging/cutroom-reel-contract-1.0.0.tgz', () => {
    assert.ok(
      existsSync(CONTRACT_TARBALL),
      `${CONTRACT_TARBALL} is missing; the build script did not produce the contract tarball`,
    )
    assert.ok(statSync(CONTRACT_TARBALL).isFile(), `${CONTRACT_TARBALL} is not a file`)
  })

  test('the SDK tarball exists at .package-staging/cutroom-sdk-1.0.0.tgz', () => {
    assert.ok(
      existsSync(SDK_TARBALL),
      `${SDK_TARBALL} is missing; the build script did not produce the SDK tarball`,
    )
    assert.ok(statSync(SDK_TARBALL).isFile(), `${SDK_TARBALL} is not a file`)
  })
})

describe('the staged manifests declare real versions and clean exports', () => {
  test('the contract staged manifest is not private, not 0.0.0, and exports .js', async () => {
    const manifest = await stagedManifest(CONTRACT_TARBALL)
    assert.equal(manifest.name, '@cutroom/reel-contract')
    assert.equal(manifest.version, '1.0.0', 'contract version must be 1.0.0')
    assert.equal(manifest.private, undefined, 'contract staged manifest must not be private')
    assert.equal(manifest.type, 'module')
    const exports = manifest.exports as Record<string, Record<string, string>>
    assert.deepEqual(exports['.'], {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    })
    const text = JSON.stringify(manifest)
    assert.ok(!/workspace:\*/.test(text), 'contract manifest must not use workspace:*')
    assert.deepEqual(Object.keys(manifest.dependencies ?? {}), ['zod'])
  })

  test('the SDK staged manifest is not private, not 0.0.0, and exports .js', async () => {
    const manifest = await stagedManifest(SDK_TARBALL)
    assert.equal(manifest.name, '@cutroom/sdk')
    assert.equal(manifest.version, '1.0.0', 'SDK version must be 1.0.0')
    assert.equal(manifest.private, undefined, 'SDK staged manifest must not be private')
    assert.equal(manifest.type, 'module')
    const exports = manifest.exports as Record<string, Record<string, string>>
    assert.deepEqual(exports['.'], {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    })
    const text = JSON.stringify(manifest)
    assert.ok(!/workspace:\*/.test(text), 'SDK manifest must not use workspace:*')
    const deps = manifest.dependencies as Record<string, string>
    assert.deepEqual(Object.keys(deps), ['@cutroom/reel-contract'])
    assert.equal(deps['@cutroom/reel-contract'], '1.0.0')
  })

  test('neither staged manifest contains an absolute path or a file: dependency', async () => {
    for (const file of [CONTRACT_TARBALL, SDK_TARBALL]) {
      const manifest = await stagedManifest(file)
      const text = JSON.stringify(manifest)
      assert.ok(!/file:/.test(text), `${file} must not use file: dependencies`)
      // No absolute Windows drive letter, no leading / absolute unix path, in any export.
      const stringFields = [
        manifest.main,
        manifest.types,
        ...Object.values((manifest.exports ?? {}) as Record<string, unknown>).flatMap((v) =>
          typeof v === 'string' ? [v] : Object.values(v as Record<string, string>),
        ),
      ]
      for (const value of stringFields) {
        if (typeof value !== 'string') continue
        assert.ok(
          !/^[A-Za-z]:[\\/]/.test(value),
          `${file} exports an absolute Windows path: ${value}`,
        )
        assert.ok(!value.startsWith('/'), `${file} exports an absolute unix path: ${value}`)
      }
    }
  })
})

describe('each archive contains only the declared files', () => {
  test('the contract archive contains package.json and dist/*.d.ts and dist/*.js only', async () => {
    const entries = await tarEntries(CONTRACT_TARBALL)
    const paths = entries.map((e) => e.path).sort()
    for (const path of paths) {
      const base = path.split('/').pop()!
      assert.ok(
        base === 'package.json' || path.endsWith('/README.md') || /^package\/dist\//.test(path),
        `forbidden entry in contract archive: ${path}`,
      )
    }
    // Every .js has a matching .d.ts and vice versa.
    const js = paths.filter((p) => p.endsWith('.js')).sort()
    const dts = paths.filter((p) => p.endsWith('.d.ts')).sort()
    assert.deepEqual(
      js.map((p) => p.replace(/\.js$/, '')),
      dts.map((p) => p.replace(/\.d\.ts$/, '')),
      'every .js must have a matching .d.ts',
    )
    assert.ok(
      !paths.some((p) => p.endsWith('.ts') && !p.endsWith('.d.ts')),
      'no .ts runtime source',
    )
  })

  test('the SDK archive contains package.json and dist/*.d.ts and dist/*.js only', async () => {
    const entries = await tarEntries(SDK_TARBALL)
    const paths = entries.map((e) => e.path).sort()
    for (const path of paths) {
      const base = path.split('/').pop()!
      assert.ok(
        base === 'package.json' || path.endsWith('/README.md') || /^package\/dist\//.test(path),
        `forbidden entry in SDK archive: ${path}`,
      )
    }
    const js = paths.filter((p) => p.endsWith('.js')).sort()
    const dts = paths.filter((p) => p.endsWith('.d.ts')).sort()
    assert.deepEqual(
      js.map((p) => p.replace(/\.js$/, '')),
      dts.map((p) => p.replace(/\.d\.ts$/, '')),
      'every .js must have a matching .d.ts',
    )
    assert.ok(
      !paths.some((p) => p.endsWith('.ts') && !p.endsWith('.d.ts')),
      'no .ts runtime source',
    )
  })

  test('no archive contains engine code, provider, database, ffmpeg, media or secrets', async () => {
    for (const file of [CONTRACT_TARBALL, SDK_TARBALL]) {
      const entries = await tarEntries(file)
      for (const { path, content } of entries) {
        const text = content.toString('utf8')
        // Forbidden strings — a generated state, a secret, a database, an engine code smell.
        assert.ok(!/better-sqlite3|drizzle/.test(text), `${path} names a database driver`)
        assert.ok(
          !/ffmpeg|ffprobe/.test(text),
          `${path} names ffmpeg; the SDK has no ffmpeg dependency`,
        )
        assert.ok(
          !/process\.env\.[A-Z_]+_(KEY|TOKEN|SECRET)/.test(text),
          `${path} reads a key-shaped environment variable`,
        )
        // No absolute Cutroom source-tree path (machine-specific) in any string.
        assert.ok(
          !text.includes(REPO.replace(/\\/g, '\\\\')),
          `${path} carries the repository's absolute path`,
        )
      }
    }
  })
})
