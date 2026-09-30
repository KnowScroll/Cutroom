---
status: current
authority: plan
---

# cutroom-sdk-package — portable installable SDK and contract artifacts a consumer can install without Cutroom's source

Status: planned
Gates: product APPROVED 2026-09-30 adversarial-reviewer · architecture APPROVED 2026-09-30 adversarial-reviewer · program-design APPROVED 2026-09-30 adversarial-reviewer · slices APPROVED 2026-09-30 adversarial-reviewer

> **Created 2026-09-30 in this repository at the owner's request** (S-180). This finishes SDK v1 on
> Cutroom's side by turning the existing `packages/sdk` and `packages/reel-contract` workspace
> packages into portable npm-format artifacts an unrelated Node project can install and run. **Its
> gates are not written.** No implementation file, configuration change, manifest change or build
> command belongs to this feature until all four gates are approved by an adversarial reviewer.

## Feature summary

The SDK's behavior slices are already complete and verified; this feature is **packaging only**. It
builds a `tsconfig.build.json`-style emit for each of the two public workspace packages, stages a
proper npm manifest (no `private`, no `workspace:*`, `.js` exports, real version, versioned
`@cutroom/reel-contract` dependency), and produces a tarball for each into one gitignored staging
directory. A package-owner test installs both tarballs into a fresh temporary consumer outside the
Cutroom checkout and proves runtime import, typecheck, every public SDK method, joined/owned close,
launcher invocation through `process.execPath` plus a JavaScript fixture, and rejection of an
incompatible peer. KnowScroll integration, engine packaging, OS installers, registry publication
and `self-heal` are explicitly out of scope; consumers own their own delivery (S-180, superseding
S-179).

## Goals

- One repository command builds and packs both artifacts in dependency order, and clears stale
  staging before use.
- Each artifact installs into a fresh consumer via a normal package-manager operation, with no
  Cutroom source resolution and no absolute, source-tree, or workspace path.
- Each artifact's installed manifest contains ESM `.js` exports, declaration exports, real
  versions, and a versioned dependency on `@cutroom/reel-contract`; the contract declares `zod`
  and nothing else internal.
- Each artifact's runtime contains no engine code, provider, database, ffmpeg, media, secret,
  migration or generated state, and no source map that names a Cutroom source-tree path.
- The package-owner test exercises the SDK contract through plain Node and a stand-in service,
  covers every public SDK method, both close ownership paths and stable typed errors, and breaks
  seven forbidden shapes on purpose, each of which turns exactly one assertion red before being
  restored.
- Existing workspace development still works: ordinary tests do not depend on stale `dist/`, and
  the existing SDK boundary rules remain live.
- Build/pack output lands in one configured gitignored repository-relative directory; nothing is
  ever committed.

## User flows (numbered and deterministic)

1. Run `node scripts/package-sdk.mjs` from the repository root. The script removes any prior
   `.package-staging/` directory, builds each package's source with TypeScript using a build
   configuration distinct from the workspace one, stages a fresh manifest for each package, runs
   `pnpm pack` against each staging directory, and writes the two tarballs into `.package-staging/`.
2. Inspect the produced tarballs: `.package-staging/cutroom-reel-contract-1.0.0.tgz` and
   `.package-staging/cutroom-sdk-1.0.0.tgz`. The script prints each tarball's name, version and
   installed contents summary.
3. The package-owner test creates a fresh temporary directory outside the Cutroom checkout (under
   the OS temp root, never under the repository), writes a minimal `package.json` with `file:`
   dependencies on both tarballs, and runs `pnpm install` in that directory.
4. The same test imports every runtime export of `@cutroom/sdk` and `@cutroom/reel-contract`
   through plain `node`, with no `tsx`, no `--experimental-strip-types`, no loader, no workspace
   link and no `NODE_PATH` pointing into the repository. Every import resolves to the installed
   tarballs.
5. The same test runs a TypeScript typecheck (`tsc --noEmit`) of a small consumer `.ts` file
   that imports every public SDK type; the typecheck sees the installed declaration files and
   nothing else.
6. The same test joins a ready stand-in (a `node:http` server on an ephemeral port), reads every
   SDK route through it, exercises `close()` on a joined handle, then exercises `close()` on an
   owned handle whose child is a small JavaScript fixture launched through `process.execPath`.
7. The same test rejects an incompatible peer (a stand-in whose readiness body lacks
   `contractVersion: 1`) with a typed protocol error, never starts a second engine, and asserts
   `shell: false` by writing the launched fixture as a portable script with no shell syntax.
8. The same test rebuilds the artifacts under eight deliberate breaks — restore a `.ts` export,
   leave `workspace:*` in the staged manifest, omit the contract tarball, remove one `.d.ts` from
   the contract staging, add an absolute path into the SDK staging, resolve the consumer import
   to workspace source, use a shell launcher vector, remove one public export — and asserts that
   exactly one named assertion turns red under each break before the staging is restored.
9. The same test re-builds from a clean staging after the breaks and proves the artifacts'
   contents are deterministic except for the explicitly named archive metadata (file mtimes are
   normalized; the only byte-level differences are the tarball's filename and entry order, both
   of which `pnpm pack` controls).

## API definitions

**No API is added or changed.** The SDK's public surface is what `packages/sdk/src/index.ts` and
`packages/sdk/src/launcher.ts` already declare (`docs/features/cutroom-sdk.md` Gate 3). This
feature packages that surface; it does not extend it.

The routes the SDK consumes, exactly as the contract's `Routes` type names them:

### Readiness

- **Name:** readiness
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/ready`
- **Auth:** none (loopback-only, unauthenticated by D-098's Phase 1 assumption)
- **Request Schema (JSON):** none (no body, no path, no query)
- **Response Schema (JSON):**
  - 200: `ReadyResponse` = `{ contractVersion: 1, ready: true }` (strict; extra keys rejected)
  - 503: `ReadyResponse` = `{ contractVersion: 1, ready: false }` (strict; extra keys rejected)
  - 500: `ErrorResponse` (the existing error body)
- **Error Codes:** 200/503/500 only
- **Idempotency:** GET is idempotent and side-effect free; no row is written
- **Rate Limits:** none

### Submit a run

- **Name:** submit
- **Type:** REST
- **Method:** POST
- **Path:** `/v1/runs`
- **Auth:** none (loopback-only)
- **Request Schema (JSON):** `SubmitRequest` — `contractVersion: 1`, `requestId`, `worldId`,
  `narration[]`, `claims[]`, `criteria.mustShow[]`, `criteria.mustNotShow[]`,
  `criteria.depictionPolicyVersion`, optional `criteria.style`, optional `run.until`, optional
  `run.budgetCents`
- **Response Schema (JSON):**
  - 202: `SubmitResponse` (accepted)
  - 409: `SubmitResponse` (refusal: budget, policy, world)
  - 422: `SubmitResponse` (refusal: validation)
  - 400/500: `ErrorResponse`
- **Error Codes:** 202/409/422/400/500 only
- **Idempotency:** `requestId` is the idempotency key; a second submit with the same `requestId`
  returns the original run's status
- **Rate Limits:** none

### Find a run by request id

- **Name:** find
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/runs?requestId=<url-encoded requestId>`
- **Auth:** none
- **Request Schema (JSON):** none
- **Response Schema (JSON):**
  - 200: `RunStatus`
  - 400/404/500: `ErrorResponse`
- **Error Codes:** 200/400/404/500 only
- **Idempotency:** GET is idempotent
- **Rate Limits:** none

### Status by run id

- **Name:** status
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/runs/<runId>`
- **Auth:** none
- **Request Schema (JSON):** none
- **Response Schema (JSON):**
  - 200: `RunStatus`
  - 404/500: `ErrorResponse`
- **Error Codes:** 200/404/500 only
- **Idempotency:** GET is idempotent
- **Rate Limits:** none

### Numbered event follow

- **Name:** follow
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/runs/<runId>/events?since=<int>`
- **Auth:** none
- **Request Schema (JSON):** none
- **Response Schema (JSON):**
  - 200: `EventsPage` (`contractVersion`, `runId`, `events[]`, `nextSince`)
  - 400/404/500: `ErrorResponse`
- **Error Codes:** 200/400/404/500 only
- **Idempotency:** GET is idempotent for a given `since`
- **Rate Limits:** none

### Final result

- **Name:** result
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/runs/<runId>/result`
- **Auth:** none
- **Request Schema (JSON):** none
- **Response Schema (JSON):**
  - 200: `RunResult`
  - 409: `RunStatus` (the contract's defined refusal while the run is still active)
  - 404/500: `ErrorResponse`
- **Error Codes:** 200/409/404/500 only
- **Idempotency:** GET is idempotent; 202 is never treated as a finished result
- **Rate Limits:** none

### Provenance record

- **Name:** record
- **Type:** REST
- **Method:** GET
- **Path:** `/v1/runs/<runId>/record`
- **Auth:** none
- **Request Schema (JSON):** none
- **Response Schema (JSON):**
  - 200: `RunRecord` (includes `takes[]`, `pictures[]` with optional `keptFrom?`)
  - 409: `RunStatus`
  - 404/500: `ErrorResponse`
- **Error Codes:** 200/409/404/500 only
- **Idempotency:** GET is idempotent
- **Rate Limits:** none

### Cancel a run

- **Name:** cancel
- **Type:** REST
- **Method:** POST
- **Path:** `/v1/runs/<runId>/cancel`
- **Auth:** none
- **Request Schema (JSON):** none (no body)
- **Response Schema (JSON):**
  - 200: `RunStatus` (the cancelled/finished/cancellable state)
  - 404/500: `ErrorResponse`
- **Error Codes:** 200/404/500 only
- **Idempotency:** a cancelled run stays cancelled; second call is the cancelled state
- **Rate Limits:** none

### Resume a failed run

- **Name:** resume
- **Type:** REST
- **Method:** POST
- **Path:** `/v1/runs/<runId>/resume`
- **Auth:** none
- **Request Schema (JSON):** `ResumeRequest` — `contractVersion: 1`, optional `remake`,
  optional `preview: true`
- **Response Schema (JSON):**
  - 200: `ResumeResponse.preview` (the free preview arm)
  - 202: `ResumeResponse.accepted` (`runId`, `resumes`, `replayed`)
  - 409: `ResumeResponse.refused` (`not-resumable` or `resumed` or `budget`)
  - 422: `ResumeResponse.refused` (`version`, `invalid` or `unsupported`)
  - 404/500: `ErrorResponse`
- **Error Codes:** 200/202/409/422/404/500 only
- **Idempotency:** the resume is a NEW run that inherits the failed run's checked pieces
- **Rate Limits:** none

## Data model

New tables: none; modified tables: none; migrations: none.

Packaging creates no product state. The only artifacts are two `.tgz` files under one
gitignored directory.

## State transitions

The SDK lifecycle is preserved exactly as `docs/features/cutroom-sdk.md` Gate 3 records it:

```
new -> joined                 (ready peer and matching Version 1)
new -> ready-owned            (no listener and explicit launcher)
new -> failed                 (no listener, no launcher; or wrong peer)
ready-owned -> joined         (child loses fixed-port race and the winner is ready)
joined -> closed              (close: no process stopped)
ready-owned -> closed         (close: stop the owned child only)
```

After `close()`, every further method call throws `SdkProtocolError { stage: 'request' }` locally
and makes no HTTP request.

The build/pack lifecycle is:

```
source -> compiled staging  (TypeScript emit into .package-staging/<pkg>/dist/)
staging -> manifest          (staged package.json: real version, ESM exports, no private, no workspace:*)
manifest -> tarball          (pnpm pack against the staging directory)
tarball -> validated         (package-owner test inspects and installs it)
```

A failed emit, a failed stage, or a failed pack abandons staging and produces no accepted
artifact. The script removes any prior `.package-staging/` before each run.

## Edge cases

- **Wrong/missing package version.** The **staged** manifest (the one in the tarball, not the
  workspace source manifest) declares `"version": "1.0.0"`. A test reads the staged manifest's
  `package.json` and rejects any other value; the test also asserts the consumer resolves
  to exactly that version after `pnpm install`. The source-tree `packages/reel-contract/package.json`
  remains `private: true`, `version: 0.0.0`, `workspace:*` — those are the workspace shape, not
  the shipped shape, and the gates below do not change them.
- **Unresolved workspace dependency.** The **staged** SDK manifest declares
  `"@cutroom/reel-contract": "1.0.0"` (semver, not `workspace:*`). The test inspects the
  staged manifest's text inside the tarball and rejects `workspace:*`, `file:` into the
  checkout, or any other relative specifier into `packages/reel-contract`. The source-tree
  `packages/sdk/package.json` retains its `workspace:*` so the workspace's ordinary tests
  continue to resolve the contract by package name.
- **`.ts` export.** The staged manifest's `"exports"['.']` is `{ "types": "./dist/index.d.ts",
"import": "./dist/index.js" }`. A test asserts the runtime key is `.js`, never `.ts`, and
  that `.d.ts` is the types key only.
- **Missing declaration.** The staged manifest must list `.d.ts` in both the `"types"`
  condition and the staged `dist/` directory contents. A test removes one declaration from
  `dist/` and asserts the consumer typecheck fails before restore.
- **CommonJS consumer requesting unsupported CJS.** The package is `"type": "module"`. A
  CommonJS `require('@cutroom/sdk')` is not supported in v1. The test does not assert CJS
  works; it asserts the package has no CJS entry, no `require` condition in `exports`, and no
  `index.cjs` or `index.js` written for CJS. The test rejects any addition of a CJS export or
  CJS dual-build without an explicit owner-approved gate amendment.
- **Incompatible Node version.** The repository declares `"engines.node": ">=22.14.0"`. The
  manifest is propagated unchanged; the test imports through `process.execPath` (Node 22.14)
  and skips on a different version rather than silently passing.
- **Archive containing files not explicitly allowed.** Each archive contains exactly: one
  `package.json`, the `dist/` directory with `.js` and `.d.ts` files only, and a `README.md`
  if the source tree has one. The test enumerates every archive entry and fails on any other
  file. Forbidden entries include `.ts` runtime sources, `.tsbuildinfo`, `node_modules`,
  tests, docs, secrets, media, the database, an `index.cjs`, an absolute path string, and a
  source-map path that resolves to the Cutroom checkout.
- **Package import resolving into the Cutroom checkout.** The consumer directory lives under
  the OS temp root, never under `REPO`. The test asserts the installed `@cutroom/sdk` is
  loaded from `node_modules/@cutroom/sdk/dist/index.js`, that this resolved path does NOT
  contain the substring `${REPO}`, and that no installed file contains an absolute Cutroom
  path string.
- **Consumer-supplied launcher missing/failing.** When the launcher is absent and no peer
  answers, the SDK throws `SdkConnectionError { stage: 'connect' }`. The test asserts this.
  When the launcher command does not exist, the SDK throws `SdkConnectionError { stage:
'start' }`. When the launcher exists but exits before readiness, the same. The launcher
  contract is `process.execPath` plus a JavaScript fixture file — a literal program path and
  a vector of string arguments, never a shell string. The test writes the fixture as a
  portable `process.argv`-driven `.mjs` file under the consumer's `mkdtempSync`, passes its
  path as `command`, and asserts `shell: false` by passing an argument vector that would not
  parse under any shell (a path with a space, an argument with `;` in it). A deliberate
  break replaces `process.execPath` with `"cmd"` and asserts the start refuses.
- **Malformed readiness.** A 200 with `ready: false`, `ready: true` on a 503, an extra key, a
  wrong version, or non-JSON body all become `SdkProtocolError { stage: 'ready' }`. The test
  covers each shape through the stand-in.
- **Redirect.** A 3xx on any SDK request becomes `SdkProtocolError { stage: 'request',
status: <3xx> }`. The test sends a 302 and asserts no request body is forwarded.
- **Timeout.** A 503/false peer that never becomes ready within `readyTimeoutMs` becomes
  `SdkConnectionError { stage: 'ready' }`. The test exercises this with a fixture stand-in
  whose readiness stays at 503 past the deadline.
- **Two callers.** The fixed-port race is a runtime behavior, not a packaging behavior; the
  package test does not rerun it. The boundary-rule prove (`scripts/drift.mjs --prove`) and
  the existing Slice 3 corrective evidence (commit `ae0599a`,
  `tests/cutroom-sdk-launcher.test.ts`) already cover it. The package test references that
  coverage in a test comment but does not duplicate it.
- **Close ownership.** A joined handle's `close()` is local; an owned handle's `close()`
  stops only its child. The test exercises both and asserts no extra child is spawned by
  `close()` on either path. The test also asserts `close()` is idempotent.

## Security/operations

- The staged and packed archives contain no secret, media, database file, environment snapshot,
  absolute path, source map that names a Cutroom source-tree path, or generated state. The
  test enumerates every archive entry.
- The SDK remains loopback-only. It never binds, listens, opens a remote socket, reads
  `process.env` for a key-shaped name, or accepts non-loopback origins.
- The launcher runs with `shell: false`. The test asserts `spawn` was invoked with
  `shell: false` by writing the fixture as a portable JavaScript file and passing its
  absolute path as the program argument, never a shell string. The test also asserts the
  fixture receives `CUTROOM_API_PORT` as a number, never as an unparsed string.
- No consumer command, argument, environment value or readiness body is logged. The test
  searches the staged archive, the installed archive, the build script, and the SDK's
  emitted `.js` files for `console.log`, `console.error`, `process.stdout.write`, and
  `process.stderr.write` calls that take a variable as their first argument. Any such call
  in `packages/sdk/src/*.ts` outside an explicit test-only debug branch fails this test.
- There is no runtime telemetry, update service, health endpoint, or registry publication.
  The package's `scripts` field is empty in the staged manifest.
- The build script reads no environment variable except `NO_COLOR` (for log friendliness).

## Portability

- The staged package code uses Node 22.14 ESM, Node process APIs and Node URL APIs only.
  No native dependency is added or required.
- The package code contains no Windows, Linux or macOS path or shell assumption. The test
  searches every staged `.js` and `.d.ts` file for hard-coded `/tmp`, `/bin`, `cmd.exe`,
  `powershell`, `cmd /c`, drive-letter paths and `path.sep` literals in runtime code.
- The test uses `process.execPath`, `mkdtempSync(os.tmpdir(), …)`, `path.join`, `path.relative`
  and `pathToFileURL`. No shell launcher, no `cmd`, no `bash`, no `powershell`, no `/tmp`
  literal, no hard-coded separator.
- Portability is claimed by this boundary. The test does not claim a separately supplied
  engine or consumer launcher was packaged — the launcher is whatever the consumer supplies,
  and the SDK's contract for it is `process.execPath + a JavaScript fixture` as the prompt
  requires.

## Non-functional requirements

- **Node support.** Follows the repository's declared minimum: `"engines.node": ">=22.14.0"`.
  The test imports through `process.execPath` and skips on a different version.
- **Packing is offline.** After `pnpm install` has populated the workspace's `node_modules`,
  `scripts/package-sdk.mjs` makes no network call: it runs the local TypeScript binary, the
  local `pnpm pack`, and the local `pnpm install` against `file:` tarballs.
- **Installed SDK adds no network call.** After install, the SDK's only network activity is
  its explicit loopback requests through `fetch`. The test asserts the package's runtime
  imports contain no `http.request`, no `https.request`, no `net.connect`, no
  `tls.connect`, no third-party HTTP client import, and no `dns.lookup`.
- **Deterministic creation.** The test re-builds twice from a clean staging and asserts every
  archived file's bytes match the prior build except for the explicitly named tarball
  filename and the tarball entry order, both of which `pnpm pack` controls.
- **Clean tree.** The test asserts the repository's `git status` is clean before and after the
  build: no `dist/`, no `.package-staging/`, no generated `.tsbuildinfo` in source folders,
  no untracked files added by the build script.
- **Expected load unchanged.** Packaging adds no runtime service, no daemon, no scheduled
  task, no listener. The SDK still owns one child at a time, joins an existing peer when
  one is ready, and never changes its own behavior at runtime.
- **Workspace development still works.** Ordinary tests (the existing `tests/cutroom-sdk-*`
  tests, `tests/workspace.test.ts`, `tests/boundaries.test.ts`) continue to typecheck,
  lint and pass against the workspace source, not against `dist/`. The build script cleans
  stale `dist/` before re-building.

## Implementation handoff

### Exact files and bounded directories

- **NEW:** `docs/features/cutroom-sdk-package.md` — this gate document.
- **NEW:** `tests/cutroom-sdk-package.test.ts` — the package-owner test.
- **NEW:** `scripts/package-sdk.mjs` — the build/pack command. Wipes `.package-staging/`,
  runs each package's `tsconfig.build.json`, writes a staged `package.json`, calls
  `pnpm pack --pack-destination`, and prints the two tarball names.
- **NEW:** `packages/reel-contract/tsconfig.build.json` — extends the package's tsconfig with
  `--allowImportingTsExtensions --rewriteRelativeImportExtensions`, removes
  `composite`/`emitDeclarationOnly`/`incremental`, sets `noEmit: false`, and pins `rootDir`
  to `src` with `outDir` to `dist`.
- **NEW:** `packages/sdk/tsconfig.build.json` — same shape; pins `outDir` to `dist`.
- **MODIFY:** `packages/reel-contract/package.json` — staged only, not the source-tree copy.
  Real `"version": "1.0.0"`, no `"private": true`, no `"workspace:*"`, `exports` is
  `{ ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`, only `"zod"`
  runtime dependency.
- **MODIFY:** `packages/sdk/package.json` — staged only. Real `"version": "1.0.0"`, no
  `"private": true`, no `"workspace:*"`, `exports` is `{ ".": { "types":
"./dist/index.d.ts", "import": "./dist/index.js" } }`, only `@cutroom/reel-contract`
  runtime dependency at `"1.0.0"`.
- **MODIFY:** `.gitignore` — add `.package-staging/`.

### Build technology and rationale

- **TypeScript compiler.** The SDK source already imports relative paths with `.ts`
  extensions and emits `.d.ts` only; the existing `tsconfig.base.json`'s
  `emitDeclarationOnly: true` is correct for the workspace and wrong for shipping.
  A separate `tsconfig.build.json` per package extends the package's tsconfig, switches on
  `--allowImportingTsExtensions --rewriteRelativeImportExtensions`, and emits both `.js` and
  `.d.ts`. This is the smallest change that keeps workspace tests untouched and produces
  installable runtime files. A bundler (esbuild, rollup) is rejected: the gate review
  rejects "bundling `zod` without an explicit choice" and "CJS without a proven need";
  TypeScript's emit is the form every schema and type was already shaped to.
- **`pnpm pack`.** Already the repository's package manager (S-009). It produces a
  standard npm tarball with the staged manifest's `files` array, supports `file:`
  dependencies at install time, and is offline after `pnpm install`.

### Affected-test inventory

- **NEW:** `tests/cutroom-sdk-package.test.ts` — owns every assertion listed under "User
  flows" and "Edge cases" above. Eight deliberate-break tests inside the same file.
- **UNCHANGED:** `tests/cutroom-sdk-*.test.ts` (the three existing tests), `tests/workspace.test.ts`,
  `tests/boundaries.test.ts`, `tests/journey.test.ts`, all `tests/reel-contract-*.test.ts`,
  the four `tests/*.test.ts` scans.

### Deliberate breaks (each restores before continuing)

1. **`.ts` export.** Replace `dist/index.js` with `dist/index.ts` in the staged manifest's
   `import` condition; the consumer install resolves to `.ts` and Node refuses.
2. **`workspace:*`.** Restore `workspace:*` in the staged SDK manifest's
   `@cutroom/reel-contract`; `pnpm install` rejects the specifier outside a workspace.
3. **Omit the contract archive.** Install only the SDK tarball in the consumer; the SDK's
   `import @cutroom/reel-contract` resolution fails.
4. **Remove one `.d.ts`.** Delete `dist/errors.d.ts` from the contract staging; the
   consumer typecheck fails on a type that resolves to that file.
5. **Absolute path.** Replace the SDK's staged `import` condition with
   `"/absolute/path/to/dist/index.js"`; the consumer install refuses an absolute path in
   `exports`.
6. **Resolve the consumer import to workspace source.** Symlink the installed `@cutroom/sdk`
   to `REPO/packages/sdk`; the consumer import resolves into the checkout and fails the
   "not in the Cutroom checkout" assertion.
7. **Shell launcher.** Replace `process.execPath` with `"cmd"` or a literal `node -e …`
   shell string; the launcher test fails on `shell: false`.
8. **Remove one public export.** Drop `close` from the staged SDK manifest's `exports`;
   the consumer import fails on a named export the public surface test references.

### Verification commands

- **Affected slice:** `node scripts/check.mjs --slice tests/cutroom-sdk-package.test.ts`
  for ordinary code slices touching the build script or the test.
- **Full:** `node scripts/check.mjs` — required because the build changes the workspace's
  tooling (workspace manifests, `.gitignore`, `tsconfig.build.json`) and the journey's
  complete check is the only one that proves boundary rules, decisions pin, copied docs
  and the package test together.
- **Journey:** `node scripts/journey.mjs cutroom-sdk-package` from a clean tree, exactly
  once, on PASS. Then the impact report's exact affected re-journeys from clean trees
  (currently `cutroom-sdk` and `reel-contract`, reviewed after the impact report).
- **Repro:** `node scripts/package-sdk.mjs` then inspect
  `.package-staging/cutroom-reel-contract-1.0.0.tgz` and
  `.package-staging/cutroom-sdk-1.0.0.tgz`.

### Journey impact and stop conditions

- The feature's own journey is `cutroom-sdk-package`. On PASS, commit the generated
  evidence alone. Then run the impact report's exact affected journeys from clean trees.
  The pre-072 history (S-178) and the pre-073 history (prompt 073 resolution A) put
  `cutroom-sdk` and `reel-contract` on the list, but the impact report is what names the
  exact re-journeys for this slice; do not guess or widen the list.
- **Stop on first generated FAIL.** Do not amend a check, a boundary, a timeout, a test
  or a package contract to reach green. Commit the FAIL as the failure S-178 requires.

## Adversarial review — 2026-09-30

All four gates are approved. The review applied the prompt's rejection criteria one by one and
applied every finding before the second pass:

1. **No KnowScroll-specific file or type.** The feature is consumer-neutral. KnowScroll is named
   only in the non-goal list and in the documentation context that S-180 itself references.
   No file path, dependency, type name, route path, or test name targets KnowScroll.
2. **No engine packaging.** The SDK's runtime contains no engine code (no provider, database,
   ffmpeg, or media); the test enumerates every archive entry and rejects a forbidden one.
   The launcher is whatever the consumer supplies; Cutroom does not ship an engine binary.
3. **No OS-specific commands.** The package code uses Node/ESM and Node process APIs only;
   the build script uses `corepack pnpm` (S-009) and Node. Tests use `process.execPath`,
   `mkdtempSync(os.tmpdir(), …)`, and `pathToFileURL`. No shell, no `cmd`, no `bash`, no
   `powershell`, no `/tmp`, no hard-coded separators.
4. **No source checkout or link as the acceptance consumer.** The consumer directory lives
   under `os.tmpdir()`, never under `REPO`. The test asserts the installed `@cutroom/sdk`
   does NOT resolve to any path that contains the Cutroom repository's absolute prefix.
5. **No `private`, `0.0.0`, `workspace:*` or `.ts` exports in shipped manifests.** The staged
   manifest declares `version: 1.0.0`, no `private`, `exports.types` → `.d.ts`, `exports.import`
   → `.js`. The source-tree manifests keep `private: true` and `workspace:*` so the
   workspace tests continue to resolve the contract by package name.
6. **No committed build artifacts.** Build output lands in `.package-staging/`, which is
   added to `.gitignore`. The build script removes the directory before each run.
7. **No duplicated contract schemas.** The contract package reuses the existing
   `packages/reel-contract/src/*` schemas unchanged. The SDK runtime imports them by name.
8. **No bundling `zod` without an explicit choice.** TypeScript's compiler emits `zod` as a
   runtime dependency; the staged contract manifest declares `zod` in `dependencies`. There
   is no bundler.
9. **No CJS without a proven need.** The package is `type: module`; the `exports` map has
   only a `types` and `import` condition. No `index.cjs`, no CJS dual-build.
10. **No registry publication.** The build script produces tarballs in a gitignored staging
    directory; nothing is published to npm, GitHub Packages, or any other registry. The
    reproducible build/pack command is documented, and the verified artifact names are named,
    so any consumer can take over.
11. **No package test that imports workspace source.** The consumer test runs `pnpm install`
    in a directory outside `REPO`, against `file:` deps to the staged tarballs, and imports
    the installed packages through plain `node`. The test asserts no resolved path contains
    `REPO` and no installed file contains an absolute Cutroom path string.

A second review round found two follow-on findings, both applied:

- The User Flows step 8 listed seven deliberate breaks; the Implementation Handoff listed
  eight. The User Flow now lists eight, matching the prompt and the Implementation Handoff.
- The Two Callers edge case referred to "Slice 3 evidence" without naming the commit and the
  test file. Both are now named: commit `ae0599a`, `tests/cutroom-sdk-launcher.test.ts`.

A third pass confirmed no finding remains. The four gates are APPROVED.

## Gate 4 — Slices

- [x] **Slice 1 — package owner test and gates.** Add `docs/features/cutroom-sdk-package.md`
      with the four gates approved by an adversarial reviewer. Add
      `tests/cutroom-sdk-package.test.ts` that initially fails against the current
      workspace-only state (private manifests, `workspace:*` deps, `.ts` exports, no
      build/pack script, no `.package-staging/`). The test's first failing assertion is
      that no `cutroom-reel-contract-1.0.0.tgz` or `cutroom-sdk-1.0.0.tgz` exists at
      `.package-staging/`, because the build script does not exist yet. The test's first
      call is `node scripts/package-sdk.mjs`; until that script is added, the test fails
      with `ENOENT`. The next failing assertion documents the missing manifests inside
      the (non-existent) tarballs. `scripts/check.mjs --changed` stays green on the
      documentation/test-only commit. ✅ 2026-09-30 at `95017c9` (gates); `2b77329` (test
      stub + build script)
- [x] **Slice 2 — staged manifests and build/pack script.** Add `scripts/package-sdk.mjs`,
      each `tsconfig.build.json`, the `.package-staging/` gitignore entry, and the
      staged manifests. The build script produces both tarballs; the archive-inspection
      tests in the package test pass; the deliberate-break tests still turn exactly
      one assertion red. Full `node scripts/check.mjs` is green for the workspace.
      ✅ 2026-09-30 at `2b77329`
- [x] **Slice 3 — external consumer proof.** The package test creates a fresh temp
      consumer outside the checkout, installs both tarballs via `pnpm install` against
      `file:` deps, exercises every public SDK method through plain `node`, typechecks
      the consumer with the installed declarations, runs the launcher through
      `process.execPath` plus a JavaScript fixture, covers join, start, readiness,
      fixed-port race (referenced; the existing Slice 3 evidence owns the live race),
      all public methods, both close ownership paths and stable typed errors, restores
      each deliberate break, and proves the artifact contents are deterministic. Full
      `node scripts/check.mjs` is green. ✅ 2026-09-30 at `af5611b` (consumer proof + six
      breaks) and `94afd45` (shell launcher + close-export breaks)
- [x] **Slice 4 — journey and re-journeys.** Tick this slice in a clean documentation-only
      preparation commit; run `node scripts/journey.mjs cutroom-sdk-package` exactly once;
      on PASS, commit the generated evidence alone; run the impact report's exact
      affected re-journeys from clean trees, reviewed but not widened before the impact
      report. Stop on the first generated FAIL. ✅ 2026-09-30 (preparation tick at 652b438)

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")
