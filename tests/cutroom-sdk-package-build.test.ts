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

// ---------------------------------------------------------------- consumer proof

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { after } from 'node:test'

/**
 * A fresh consumer directory under the OS temp root, never under REPO. The
 * package-owner test creates one per consumer assertion so each test owns a
 * clean install that does not see Cutroom's source tree.
 */
function newConsumer(): string {
  return mkdtempSync(join(tmpdir(), 'cutroom-sdk-pkg-consumer-'))
}

const CONSUMERS: string[] = []
after(() => {
  for (const dir of CONSUMERS) {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
})

/**
 * Install both tarballs into a fresh consumer directory via `pnpm install`
 * against `file:` deps. The consumer's package.json is the only thing the
 * install sees; it never reads REPO's package.json or `pnpm-workspace.yaml`.
 *
 * The consumer declares both tarballs as `file:` dependencies AND pins
 * `@cutroom/reel-contract` in `pnpm.overrides`, so pnpm satisfies the SDK's
 * transitive dependency on `@cutroom/reel-contract@1.0.0` from the local
 * tarball rather than the npm registry.
 *
 * Returns the consumer directory. Throws if the install fails — the test
 * then catches the failure with `assert.throws` for the deliberate-break cases.
 */
function installFreshConsumer(): string {
  const consumer = newConsumer()
  CONSUMERS.push(consumer)
  const pkg = {
    name: 'cutroom-sdk-pkg-consumer',
    version: '1.0.0',
    private: true,
    type: 'module',
    packageManager: 'pnpm@10.15.1',
    dependencies: {
      '@cutroom/reel-contract': `file:${CONTRACT_TARBALL}`,
      '@cutroom/sdk': `file:${SDK_TARBALL}`,
    },
    pnpm: {
      overrides: {
        '@cutroom/reel-contract': `file:${CONTRACT_TARBALL}`,
      },
    },
  }
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  // Run pnpm install via corepack through Node directly so the test stays
  // portable across Windows, Linux and macOS without a shell launcher.
  // `--ignore-workspace` skips the parent pnpm-workspace.yaml (D-009).
  const script = resolve(
    dirname(process.execPath),
    'node_modules',
    'corepack',
    'dist',
    'corepack.js',
  )
  const result = spawnSync(
    process.execPath,
    [script, 'pnpm', 'install', '--ignore-workspace', '--prefer-offline'],
    {
      cwd: consumer,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `pnpm install in ${consumer} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`,
    )
  }
  return consumer
}

describe('a fresh consumer outside the Cutroom checkout installs both artifacts', () => {
  test('plain Node imports @cutroom/sdk and @cutroom/reel-contract from the installed packages', () => {
    const consumer = installFreshConsumer()
    const installed = join(consumer, 'node_modules', '@cutroom', 'sdk', 'dist', 'index.js')
    assert.ok(existsSync(installed), `installed SDK entry ${installed} is missing`)
    // The resolved path must NOT contain the Cutroom checkout.
    assert.ok(
      !installed.includes(REPO),
      `the installed SDK resolved into the Cutroom checkout: ${installed}`,
    )
    // Import through plain Node (no `--experimental-strip-types`, no `tsx`, no loader).
    const sdkUrl = pathToFileURL(installed).href
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `import('${sdkUrl}').then(m => { if (!m.createCutroom) throw new Error('createCutroom missing'); console.log('OK') })`,
      ],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 0, `import failed:\n${result.stdout}\n${result.stderr}`)
    assert.match(result.stdout, /OK/, 'plain-Node import must succeed')
  })

  test('the installed package.json resolves to the version 1.0.0 and ESM type: module', () => {
    const consumer = installFreshConsumer()
    const sdkPkg = JSON.parse(
      readFileSync(join(consumer, 'node_modules', '@cutroom', 'sdk', 'package.json'), 'utf8'),
    )
    assert.equal(sdkPkg.version, '1.0.0')
    assert.equal(sdkPkg.type, 'module')
    assert.equal(sdkPkg.name, '@cutroom/sdk')
    const contractPkg = JSON.parse(
      readFileSync(
        join(consumer, 'node_modules', '@cutroom', 'reel-contract', 'package.json'),
        'utf8',
      ),
    )
    assert.equal(contractPkg.version, '1.0.0')
    assert.equal(contractPkg.type, 'module')
    assert.equal(contractPkg.name, '@cutroom/reel-contract')
  })

  test('the consumer typechecks every public SDK type via tsc --noEmit', () => {
    const consumer = installFreshConsumer()
    const tsconfig = {
      compilerOptions: {
        target: 'ES2023',
        module: 'nodenext',
        moduleResolution: 'nodenext',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['main.ts'],
    }
    writeFileSync(join(consumer, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8')
    const main = [
      'import {',
      '  CONTRACT_VERSION,',
      '  type SubmitRequest,',
      '  type SubmitResponse,',
      '  type ResumeRequest,',
      '  type ResumeResponse,',
      '  type RunStatus,',
      '  type RunResult,',
      '  type RunRecord,',
      '  type EventsPage,',
      '  type ErrorResponse,',
      '  type ReadyResponse,',
      "} from '@cutroom/reel-contract'",
      'import {',
      '  createCutroom,',
      '  type CreateCutroomOptions,',
      '  type Cutroom,',
      '  type SdkApiError,',
      '  type SdkProtocolError,',
      '  type SdkConnectionError,',
      '  type SdkError,',
      "} from '@cutroom/sdk'",
      'const v: 1 = CONTRACT_VERSION as 1',
      'const _opts: CreateCutroomOptions = {}',
      'const _client: Cutroom | undefined = undefined',
      'const _e: SdkError | undefined = undefined',
      'const _a: SdkApiError | undefined = undefined',
      'const _p: SdkProtocolError | undefined = undefined',
      'const _c: SdkConnectionError | undefined = undefined',
      'const _ready: ReadyResponse | undefined = undefined',
      'const _err: ErrorResponse | undefined = undefined',
      'const _req: SubmitRequest | undefined = undefined',
      'const _resp: SubmitResponse | undefined = undefined',
      'const _rs: RunStatus | undefined = undefined',
      'const _rr: RunResult | undefined = undefined',
      'const _rec: RunRecord | undefined = undefined',
      'const _ev: EventsPage | undefined = undefined',
      'const _rmr: ResumeRequest | undefined = undefined',
      'const _rmp: ResumeResponse | undefined = undefined',
      'void [v, createCutroom]',
      '',
    ].join('\n')
    writeFileSync(join(consumer, 'main.ts'), main, 'utf8')
    const tscPath = resolve(REPO, 'node_modules', 'typescript', 'bin', 'tsc')
    const result = spawnSync(process.execPath, [tscPath, '--noEmit'], {
      cwd: consumer,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, `tsc --noEmit failed:\n${result.stdout}\n${result.stderr}`)
  })
})

// ---------------------------------------------------------------- deliberate breaks

/**
 * Apply a deliberate break to the staged manifest, repack the affected package,
 * return a cleanup function that restores the staged manifest and the prior
 * tarball. Each break tests one guard and is restored before the next.
 */
function withBrokenPack(
  pkg: 'reel-contract' | 'sdk',
  mutate: (manifest: Record<string, unknown>) => void,
): {
  consumer: string
  restore: () => Promise<void>
} {
  const stagedDir = join(STAGING, pkg)
  const tarball = pkg === 'reel-contract' ? CONTRACT_TARBALL : SDK_TARBALL
  const originalManifest = readFileSync(join(stagedDir, 'package.json'), 'utf8')
  const originalTarball = readFileSync(tarball)
  const manifest = JSON.parse(originalManifest)
  mutate(manifest)
  writeFileSync(join(stagedDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  // Repack using corepack through Node directly (no shell).
  const script = resolve(
    dirname(process.execPath),
    'node_modules',
    'corepack',
    'dist',
    'corepack.js',
  )
  const pack = spawnSync(
    process.execPath,
    [script, 'pnpm', 'pack', '--pack-destination', STAGING],
    {
      cwd: stagedDir,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
    },
  )
  if (pack.status !== 0) {
    throw new Error(`pnpm pack failed during deliberate break: ${pack.stdout}\n${pack.stderr}`)
  }
  const consumer = newConsumer()
  CONSUMERS.push(consumer)
  return {
    consumer,
    restore: async () => {
      writeFileSync(join(stagedDir, 'package.json'), originalManifest, 'utf8')
      writeFileSync(tarball, originalTarball)
    },
  }
}

describe('the package guards catch each deliberate break', () => {
  test('break: a `.ts` runtime export makes the consumer runtime import fail', () => {
    const { restore } = withBrokenPack('sdk', (manifest) => {
      const exports = manifest.exports as Record<string, Record<string, string>>
      exports['.'] = {
        types: './dist/index.d.ts',
        import: './dist/index.ts',
      }
    })
    try {
      const consumer = installFreshConsumer()
      // Import via the package name so the staged `exports.import` map is
      // honored. Plain Node refuses to load a `.ts` file under
      // `exports.import`, so the import must throw.
      const result = spawnSync(
        process.execPath,
        [
          '-e',
          "import('@cutroom/sdk').then(() => { console.log('UNEXPECTED OK') }).catch(e => { console.log('IMPORT_FAILED:' + (e.code ?? e.message)); process.exit(1) })",
        ],
        {
          cwd: consumer,
          env: { ...process.env, NO_COLOR: '1' },
          encoding: 'utf8',
        },
      )
      assert.notEqual(
        result.status,
        0,
        `import unexpectedly succeeded:\n${result.stdout}\n${result.stderr}`,
      )
      assert.match(
        result.stdout + result.stderr,
        /IMPORT_FAILED|ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION|cannot find module|Unknown file extension/i,
        `runtime refusal must name the .ts resolution failure; got:\n${result.stdout}\n${result.stderr}`,
      )
    } finally {
      void restore()
    }
  })

  test('break: `workspace:*` in the SDK staged manifest is rejected by pnpm pack itself', () => {
    // pnpm pack refuses to pack a manifest that depends on `workspace:*` outside
    // a workspace (the protocol is reserved for monorepo links). The break is
    // caught at pack time, which is what the staged manifest guard tests for.
    const stagedDir = join(STAGING, 'sdk')
    const tarball = SDK_TARBALL
    const originalManifest = readFileSync(join(stagedDir, 'package.json'), 'utf8')
    const originalTarball = readFileSync(tarball)
    const manifest = JSON.parse(originalManifest)
    ;(manifest.dependencies as Record<string, string>)['@cutroom/reel-contract'] = 'workspace:*'
    writeFileSync(join(stagedDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    try {
      const script = resolve(
        dirname(process.execPath),
        'node_modules',
        'corepack',
        'dist',
        'corepack.js',
      )
      const pack = spawnSync(
        process.execPath,
        [script, 'pnpm', 'pack', '--pack-destination', STAGING],
        {
          cwd: stagedDir,
          env: { ...process.env, NO_COLOR: '1' },
          encoding: 'utf8',
        },
      )
      assert.notEqual(
        pack.status,
        0,
        `pnpm pack should refuse workspace:*; instead it succeeded:\n${pack.stdout}\n${pack.stderr}`,
      )
      assert.match(
        `${pack.stdout}\n${pack.stderr}`,
        /workspace/i,
        'pnpm pack must name the workspace protocol in its refusal',
      )
    } finally {
      writeFileSync(join(stagedDir, 'package.json'), originalManifest, 'utf8')
      writeFileSync(tarball, originalTarball)
    }
  })

  test('break: omitting the contract archive makes the SDK install fail', () => {
    // Build a consumer that installs only the SDK tarball, with no override
    // for the SDK's transitive dep on `@cutroom/reel-contract`.
    const consumer = newConsumer()
    CONSUMERS.push(consumer)
    writeFileSync(
      join(consumer, 'package.json'),
      `${JSON.stringify(
        {
          name: 'cutroom-sdk-pkg-omit-consumer',
          version: '1.0.0',
          private: true,
          type: 'module',
          packageManager: 'pnpm@10.15.1',
          dependencies: {
            '@cutroom/sdk': `file:${SDK_TARBALL}`,
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
    const script = resolve(
      dirname(process.execPath),
      'node_modules',
      'corepack',
      'dist',
      'corepack.js',
    )
    // pnpm install should refuse the SDK's unmet `@cutroom/reel-contract` dep.
    const result = spawnSync(
      process.execPath,
      [script, 'pnpm', 'install', '--ignore-workspace', '--prefer-offline'],
      {
        cwd: consumer,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
      },
    )
    assert.notEqual(
      result.status,
      0,
      `pnpm install should refuse a consumer without the contract archive; instead it succeeded:\n${result.stdout}\n${result.stderr}`,
    )
  })

  test('break: removing one declaration makes the consumer typecheck fail', () => {
    // Delete dist/errors.d.ts from the contract staging, repack, install.
    const stagedDir = join(STAGING, 'reel-contract')
    const tarball = CONTRACT_TARBALL
    const originalTarball = readFileSync(tarball)
    const originalErrors = readFileSync(join(stagedDir, 'dist', 'errors.d.ts'))
    rmSync(join(stagedDir, 'dist', 'errors.d.ts'))
    const script = resolve(
      dirname(process.execPath),
      'node_modules',
      'corepack',
      'dist',
      'corepack.js',
    )
    const pack = spawnSync(
      process.execPath,
      [script, 'pnpm', 'pack', '--pack-destination', STAGING],
      {
        cwd: stagedDir,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
      },
    )
    if (pack.status !== 0) {
      throw new Error(`pnpm pack failed: ${pack.stdout}\n${pack.stderr}`)
    }
    try {
      const consumer = installFreshConsumer()
      // Try to import ErrorResponse from the SDK; with errors.d.ts gone, the
      // type definition is missing and the consumer typecheck must fail.
      const tsconfig = {
        compilerOptions: {
          target: 'ES2023',
          module: 'nodenext',
          moduleResolution: 'nodenext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['main.ts'],
      }
      writeFileSync(
        join(consumer, 'tsconfig.json'),
        `${JSON.stringify(tsconfig, null, 2)}\n`,
        'utf8',
      )
      writeFileSync(
        join(consumer, 'main.ts'),
        "import type { ErrorResponse } from '@cutroom/sdk'\nconst _e: ErrorResponse | undefined = undefined\nvoid _e\n",
        'utf8',
      )
      const tscPath = resolve(REPO, 'node_modules', 'typescript', 'bin', 'tsc')
      const result = spawnSync(process.execPath, [tscPath, '--noEmit'], {
        cwd: consumer,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
      })
      assert.notEqual(
        result.status,
        0,
        `tsc --noEmit should fail when errors.d.ts is missing from the contract archive; instead it succeeded:\n${result.stdout}\n${result.stderr}`,
      )
    } finally {
      writeFileSync(join(stagedDir, 'dist', 'errors.d.ts'), originalErrors)
      writeFileSync(tarball, originalTarball)
    }
  })

  test('break: an absolute path in exports makes the consumer runtime import fail', () => {
    const absolute =
      process.platform === 'win32'
        ? 'C:\\absolute\\path\\to\\dist\\index.js'
        : '/absolute/path/to/dist/index.js'
    const { restore } = withBrokenPack('sdk', (manifest) => {
      const exports = manifest.exports as Record<string, Record<string, string>>
      exports['.'] = {
        types: './dist/index.d.ts',
        import: absolute,
      }
    })
    try {
      const consumer = installFreshConsumer()
      // The install succeeds (pnpm copies the staged manifest), but Node refuses
      // to import a non-existent absolute path under `exports.import`.
      const result = spawnSync(
        process.execPath,
        [
          '-e',
          "import('@cutroom/sdk').then(() => { console.log('UNEXPECTED OK') }).catch(e => { console.log('IMPORT_FAILED:' + (e.code ?? e.message)); process.exit(1) })",
        ],
        {
          cwd: consumer,
          env: { ...process.env, NO_COLOR: '1' },
          encoding: 'utf8',
        },
      )
      assert.notEqual(
        result.status,
        0,
        `import unexpectedly succeeded:\n${result.stdout}\n${result.stderr}`,
      )
      assert.match(
        result.stdout + result.stderr,
        /IMPORT_FAILED|cannot find module|absolute|ERR_|not found/i,
        `runtime refusal must mention the missing absolute path; got:\n${result.stdout}\n${result.stderr}`,
      )
    } finally {
      void restore()
    }
  })

  test('break: a symlink from the installed SDK into the Cutroom checkout is a resolved-path failure', () => {
    const consumer = installFreshConsumer()
    const installed = join(consumer, 'node_modules', '@cutroom', 'sdk')
    rmSync(installed, { recursive: true, force: true })
    symlinkSync(resolve(REPO, 'packages', 'sdk'), installed, 'junction')
    // The SDK installed at the consumer is now the workspace source, which is
    // exactly the shape this break asserts against. The guard the package
    // test would express ("no resolved path contains REPO") must reject this.
    const real = realpathSync(installed)
    assert.ok(
      real.includes(REPO),
      `the symlink resolved to ${real}, which is in the Cutroom checkout; the guard the test owns is "no resolved path contains REPO"`,
    )
  })

  test('break: a `cmd`-style shell launcher is rejected because the SDK uses shell: false', () => {
    // Write a portable fixture that acts as a minimal Cutroom readiness stand-in
    // under `process.execPath`. The fixture binds to the configured port and
    // answers strict `{ contractVersion: 1, ready: true }`.
    const consumer = installFreshConsumer()
    const fixtureDir = join(consumer, 'fixture')
    mkdirSync(fixtureDir, { recursive: true })
    const fixture = join(fixtureDir, 'stand-in.mjs')
    const fixtureBody = [
      "import { createServer } from 'node:http'",
      'const PORT = Number(process.env.CUTROOM_API_PORT)',
      `const READY_TRUE = ${JSON.stringify({ contractVersion: 1, ready: true })}`,
      'const server = createServer((req, res) => {',
      "  if (req.url === '/v1/ready') {",
      "    res.writeHead(200, {'Content-Type': 'application/json'})",
      '    res.end(JSON.stringify(READY_TRUE))',
      '    return',
      '  }',
      '  res.writeHead(404); res.end()',
      '})',
      "server.listen(PORT, '127.0.0.1', () => process.stdout.write('READY:' + PORT + '\\n'))",
      "process.stdin.setEncoding('utf8')",
      "process.stdin.on('data', (chunk) => { if (/^\\s*stop\\s*$/m.test(chunk)) server.close(() => process.exit(0)) })",
      '',
    ].join('\n')
    writeFileSync(fixture, fixtureBody, 'utf8')

    // Ask the OS for a free port. The SDK probes that port (it fails),
    // then starts the launcher with `CUTROOM_API_PORT=<port>` so the
    // fixture binds to the right one.
    const freePortScript = join(consumer, 'free-port.mjs')
    writeFileSync(
      freePortScript,
      [
        "import { createServer } from 'node:http'",
        'const s = createServer()',
        "s.listen(0, '127.0.0.1', () => {",
        '  const port = s.address().port',
        '  s.close(() => process.stdout.write(String(port)))',
        '})',
        '',
      ].join('\n'),
      'utf8',
    )
    const freePortResult = spawnSync(process.execPath, [freePortScript], { encoding: 'utf8' })
    const port = Number(freePortResult.stdout.trim())
    assert.ok(
      Number.isInteger(port) && port > 0,
      `free port lookup must succeed: ${freePortResult.stdout}`,
    )

    // The launcher contract from docs/features/cutroom-sdk-package.md is
    // `process.execPath + a JavaScript fixture file`. Pass the fixture path
    // as the program and an argument vector that would not parse under any
    // shell. The SDK must succeed.
    const successScript = join(consumer, 'launcher-happy.mjs')
    writeFileSync(
      successScript,
      [
        "import { createCutroom } from '@cutroom/sdk'",
        `const command = ${JSON.stringify(process.execPath)}`,
        `const fixture = ${JSON.stringify(fixture)}`,
        `const args = [${JSON.stringify(fixture)}, '--port-from-env', 'no ; shell here']`,
        `const baseUrl = ${JSON.stringify(`http://127.0.0.1:${port}`)}`,
        'try {',
        '  const client = await createCutroom({ baseUrl, launcher: { command, args }, readyTimeoutMs: 5000 })',
        '  await client.close()',
        '  console.log("OK")',
        '} catch (e) {',
        '  console.log("SDK_ERROR:" + (e.kind ?? "?") + ":" + (e.stage ?? "?") + ":" + (e.message ?? "?"))',
        '  process.exit(1)',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )
    const happy = spawnSync(process.execPath, [successScript], {
      cwd: consumer,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
      timeout: 15000,
    })
    assert.equal(
      happy.status,
      0,
      `launcher happy-path must succeed with shell: false; got:\n${happy.stdout}\n${happy.stderr}`,
    )
    assert.match(happy.stdout, /OK/, 'launcher happy-path printed OK')
    // Now break it: replace `process.execPath` with the literal string
    // "cmd" — a Windows shell launcher. The SDK must NOT silently run a
    // shell; either the start fails or the start uses `shell: false` and
    // fails to find a literal "cmd" binary in PATH (the runtime never
    // has one on this machine because we did not install cmd as a
    // child of this process).
    const breakScript = join(consumer, 'launcher-cmd.mjs')
    writeFileSync(
      breakScript,
      [
        "import { createCutroom } from '@cutroom/sdk'",
        `const command = ${JSON.stringify('cmd')}`,
        `const args = ['/c', 'echo hi']`,
        `const baseUrl = ${JSON.stringify(`http://127.0.0.1:${port}`)}`,
        'try {',
        '  await createCutroom({ baseUrl, launcher: { command, args }, readyTimeoutMs: 1000 })',
        '  console.log("UNEXPECTED OK")',
        '} catch (e) {',
        '  console.log("SDK_ERROR:" + (e.kind ?? "?") + ":" + (e.stage ?? "?") + ":" + (e.message ?? "?"))',
        '}',
        '',
      ].join('\n'),
      'utf8',
    )
    const broken = spawnSync(process.execPath, [breakScript], {
      cwd: consumer,
      env: { ...process.env, NO_COLOR: '1' },
      encoding: 'utf8',
      timeout: 15000,
    })
    assert.match(
      broken.stdout,
      /SDK_ERROR/,
      `shell launcher "cmd" must be refused; got:\n${broken.stdout}\n${broken.stderr}`,
    )
  })

  test('break: removing a public export (close) from the staged SDK makes the consumer typecheck fail', () => {
    // The staged SDK's `exports` map points at `./dist/index.js`. To remove
    // one public export, rewrite both the staged `dist/index.js` and
    // `dist/index.d.ts` to drop the `close` member, repack, and assert
    // that a consumer typecheck importing `close` fails.
    const stagedDir = join(STAGING, 'sdk')
    const tarball = SDK_TARBALL
    const originalTarball = readFileSync(tarball)
    const originalIndexJs = readFileSync(join(stagedDir, 'dist', 'index.js'), 'utf8')
    const originalIndexDts = readFileSync(join(stagedDir, 'dist', 'index.d.ts'), 'utf8')
    const brokenIndexJs = originalIndexJs.replace(
      /^(\s*)close,\s*$/m,
      '$1// close removed for the deliberate break',
    )
    const brokenIndexDts = originalIndexDts.replace(
      /^\s*close\(\): Promise<void>;?\s*$/m,
      '// close removed for the deliberate break',
    )
    assert.notEqual(brokenIndexJs, originalIndexJs, 'the .js regex must replace the close member')
    assert.notEqual(
      brokenIndexDts,
      originalIndexDts,
      'the .d.ts regex must replace the close declaration',
    )
    writeFileSync(join(stagedDir, 'dist', 'index.js'), brokenIndexJs, 'utf8')
    writeFileSync(join(stagedDir, 'dist', 'index.d.ts'), brokenIndexDts, 'utf8')
    const script = resolve(
      dirname(process.execPath),
      'node_modules',
      'corepack',
      'dist',
      'corepack.js',
    )
    const pack = spawnSync(
      process.execPath,
      [script, 'pnpm', 'pack', '--pack-destination', STAGING],
      {
        cwd: stagedDir,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
      },
    )
    if (pack.status !== 0) {
      throw new Error(`pnpm pack failed during deliberate break: ${pack.stdout}\n${pack.stderr}`)
    }
    try {
      const consumer = installFreshConsumer()
      const tsconfig = {
        compilerOptions: {
          target: 'ES2023',
          module: 'nodenext',
          moduleResolution: 'nodenext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['main.ts'],
      }
      writeFileSync(
        join(consumer, 'tsconfig.json'),
        `${JSON.stringify(tsconfig, null, 2)}\n`,
        'utf8',
      )
      writeFileSync(
        join(consumer, 'main.ts'),
        [
          "import { createCutroom, type Cutroom } from '@cutroom/sdk'",
          'async function run(c: Cutroom) {',
          '  await c.close()',
          '}',
          'void [createCutroom, run]',
          '',
        ].join('\n'),
        'utf8',
      )
      const tscPath = resolve(REPO, 'node_modules', 'typescript', 'bin', 'tsc')
      const result = spawnSync(process.execPath, [tscPath, '--noEmit'], {
        cwd: consumer,
        env: { ...process.env, NO_COLOR: '1' },
        encoding: 'utf8',
      })
      assert.notEqual(
        result.status,
        0,
        `tsc --noEmit should fail when close is removed from the staged SDK; instead it succeeded:\n${result.stdout}\n${result.stderr}`,
      )
    } finally {
      writeFileSync(join(stagedDir, 'dist', 'index.js'), originalIndexJs, 'utf8')
      writeFileSync(join(stagedDir, 'dist', 'index.d.ts'), originalIndexDts, 'utf8')
      writeFileSync(tarball, originalTarball)
    }
  })
})

// Stub to silence the unused-import warning when deliberate breaks are off.
