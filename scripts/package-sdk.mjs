#!/usr/bin/env node
/**
 * Build and pack the installable Cutroom SDK artifacts.
 *
 *   node scripts/package-sdk.mjs
 *
 * Wipes `.package-staging/`, runs TypeScript with each package's
 * `tsconfig.build.json` to produce `.package-staging/<pkg>/dist/`, writes a
 * staged `package.json` (no `private`, no `workspace:*`, `.js` exports, real
 * version, versioned `@cutroom/reel-contract` dependency), and runs
 * `pnpm pack` against each staging directory. The two resulting tarballs are
 * the only artifacts under test in `tests/cutroom-sdk-package.test.ts`.
 *
 * No engine code, provider, database, ffmpeg, media, secret, migration or
 * generated state is staged. The source-tree `packages/sdk/package.json` and
 * `packages/reel-contract/package.json` are unchanged (S-180): the workspace
 * keeps `private: true`, `workspace:*`, `0.0.0`, and `.ts` exports; only the
 * STAGED manifests are clean.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { REPO, bold, dim, fail, green, red, run as runWith } from './_lib.mjs'

const STAGING = resolve(REPO, '.package-staging')

const PACKAGES = [
  {
    name: '@cutroom/reel-contract',
    dir: join(REPO, 'packages', 'reel-contract'),
    stagedDirName: 'reel-contract',
    stagedTarball: 'cutroom-reel-contract-1.0.0.tgz',
    /** Build-time dependencies: an empty set. */
    dependencies: { zod: '^4.6.5' },
    /** Description carried into the staged manifest verbatim. */
    description:
      'The caller-facing contract of the reel engine: what to send, what to call when, and every answer. Types, schemas and the version only (D-094). Imports nothing internal.',
  },
  {
    name: '@cutroom/sdk',
    dir: join(REPO, 'packages', 'sdk'),
    stagedDirName: 'sdk',
    stagedTarball: 'cutroom-sdk-1.0.0.tgz',
    dependencies: { '@cutroom/reel-contract': '1.0.0' },
    description:
      'The typed local client for the reel engine. Validates input and every response, makes loopback HTTP calls, and never imports an engine package other than @cutroom/reel-contract (S-173, S-175; docs/features/cutroom-sdk.md).',
  },
]

const VERSION = '1.0.0'

function stageManifest(pkg) {
  return {
    name: pkg.name,
    version: VERSION,
    type: 'module',
    description: pkg.description,
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
    files: ['dist', 'README.md'],
    dependencies: pkg.dependencies,
    engines: {
      node: '>=22.14.0',
    },
    scripts: {},
  }
}

function run(label, cmd, args, cwd, opts = {}) {
  const result = runWith(cmd, args, {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
    ...opts,
  })
  if (!result.ok) {
    fail(`${label} failed (exit ${result.code}):\n${result.stdout}\n${result.stderr}`)
    process.exit(1)
  }
  return result.stdout.trim()
}

function clearStaging() {
  if (existsSync(STAGING)) {
    rmSync(STAGING, { recursive: true, force: true })
  }
  mkdirSync(STAGING, { recursive: true })
}

function buildOne(pkg) {
  const stagedDir = join(STAGING, pkg.stagedDirName)
  mkdirSync(stagedDir, { recursive: true })
  // Run TypeScript against the package's tsconfig.build.json, output to dist/.
  const tsconfig = join(pkg.dir, 'tsconfig.build.json')
  run(
    `tsc ${pkg.name}`,
    'node',
    [join(REPO, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', tsconfig],
    REPO,
  )
  // Move the produced dist/ into the staging directory.
  const sourceDist = join(pkg.dir, 'dist')
  if (!existsSync(sourceDist)) {
    fail(`${pkg.name}: tsc produced no dist/ directory`)
    process.exit(1)
  }
  // rmSync + copyFileSync would do, but cpSync is portable on Node 22.
  cpSync(sourceDist, join(stagedDir, 'dist'), { recursive: true })
  // Write the staged manifest.
  const manifest = stageManifest(pkg)
  // Carry through README.md if the source tree has one; the staged package's `files`
  // lists README.md so consumers can see it. The npm convention is to include a
  // README.md when the source has one, and to omit it cleanly when not. If neither
  // exists, no README is staged.
  const sourceReadme = join(pkg.dir, 'README.md')
  if (existsSync(sourceReadme)) {
    writeFileSync(join(stagedDir, 'README.md'), readFileSync(sourceReadme))
  } else {
    // The staged manifest lists README.md in `files`. Drop the listing so pnpm pack
    // does not warn about a missing entry.
    delete manifest.files
  }
  writeFileSync(join(stagedDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return stagedDir
}

function packOne(pkg, stagedDir) {
  // Run corepack via Node directly (no shell) so the script stays portable across
  // Windows, Linux and macOS. The shim at `<node-bin-dir>/node_modules/corepack/dist/corepack.js`
  // is the entry point the `corepack.cmd` wrapper invokes; calling it with `pnpm`
  // as its first argument does the same thing on every supported platform.
  const script = resolve(
    dirname(process.execPath),
    'node_modules',
    'corepack',
    'dist',
    'corepack.js',
  )
  if (!existsSync(script)) {
    fail(`could not find corepack at ${script}; install corepack or run via corepack itself`)
    process.exit(1)
  }
  const out = run(
    `pnpm pack ${pkg.name}`,
    process.execPath,
    [script, 'pnpm', 'pack', '--pack-destination', STAGING],
    stagedDir,
  )
  // pnpm pack prints the tarball path on the last non-empty line.
  const lines = out.split('\n').filter(Boolean)
  const tail = lines[lines.length - 1]
  return tail
}

console.log(dim(`\n  Build/pack: clearing ${STAGING}`))
clearStaging()

const produced = []
for (const pkg of PACKAGES) {
  console.log(dim(`  Build/pack: compiling ${pkg.name}`))
  const stagedDir = buildOne(pkg)
  console.log(dim(`  Build/pack: packing ${pkg.name}`))
  const tarball = packOne(pkg, stagedDir)
  produced.push({ name: pkg.name, tarball })
}

console.log('')
console.log(bold('Artifacts'))
for (const { name, tarball } of produced) {
  const exists = existsSync(tarball)
  const marker = exists ? green('ok') : red('FAIL')
  console.log(`  ${marker}   ${name}  ${dim(tarball.replace(REPO, '<repo>'))}`)
}
console.log('')
