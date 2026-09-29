# JOURNAL

The operational journal stays short. Sessions 01–64, including their full reasoning and raw verification notes,
are preserved byte-for-byte in [the historical journal](docs/history/JOURNAL-through-session-64.md). Read that
archive only by its session heading. New entries state the decision, commit/evidence reference and next action;
feature files, commit messages and verification trailers carry the durable detail (S-177).

## 2026-09-29 — session 68, cutroom-sdk Slice 3 handoff written

**Decision.** `PROMPTS/069-cutroom-sdk-slice-3.md` is the next-session handoff: explicit launcher configuration,
bounded strict readiness polling, fixed-port race joining, and creator-owned stdin shutdown only. It starts from
Slice 2 correction commit `45b9de9`, whose tree `143d0bc4f3054ecacf854b8f5ff32a3c5a3d36b9` has valid targeted
evidence.

**Scope and evidence.** The prompt confines `node:child_process` to a private SDK launcher module, requires
resolved-path proof for the launcher exception and companion rule, uses stand-in-only child-process tests, and
requires a final full `node scripts/check.mjs` because it changes boundary configuration and proof tooling. It also
repairs the prompt index: the already-run Slice 2 handoff now has its `Run` line and README row.

**Next.** Session 69 runs `PROMPTS/069-cutroom-sdk-slice-3.md`; it must not begin Slice 4's journey or re-journeys.

## 2026-09-29 — session 68, cutroom-sdk Slice 2 review corrections committed

**Findings.** A review of Slice 2 found three outstanding findings that the original slice did not address,
plus one housekeeping gap: (1) every `fetch` call lacked an explicit `redirect: 'manual'`, so a 3xx response
would have been followed — a redirect from the configured loopback could forward a request body to a peer
outside it; (2) the public-surface test in `tests/cutroom-sdk-routes.test.ts` only typed `SdkApiError` and
`SdkProtocolError`, not `CreateCutroomOptions`, `Cutroom`, `SdkConnectionError`, or `SdkError`, so removing any
of those exports would not have failed compilation; (3) `normaliseLoopbackOrigin` rejected an explicit
`http://127.0.0.1:80` and `http://[::1]:80` because WHATWG strips the scheme's default port from `URL.port`,
so an explicit default port was indistinguishable from no port at all; (4) `PROMPTS/065-cutroom-sdk-slice-2.md`
was untracked even though session 66's journal entry claimed it was added.

**Changed.** Added one private `sendRequest` helper in `packages/sdk/src/index.ts` that every route now uses;
it passes `redirect: 'manual'` and throws `SdkProtocolError { stage: 'request', status: <3xx> }` for any
redirect. Added `hasExplicitPort(raw)` to inspect the original URL authority, accepting `http://127.0.0.1:80`
and `http://[::1]:80` while keeping `http://127.0.0.1` and `http://[::1]` rejected (the canonical origin
`parsed.host` still omits the default port for `http:`, and requests still use it correctly). Updated test `1`
to import and reference all six required public types in a typed literal — removing any export fails
compilation. Added three new tests owning each finding: `6. loopback confinement across redirects` (POST with a
JSON body proves the body cannot be forwarded by a redirect), `6. an explicit default HTTP port (:80) is
accepted and used`, and `6. an origin whose port was not written at all is rejected`. Preserved the existing
`'http://127.0.0.1' / 'missing port'` case in the invalid-URL test, so the port-80 acceptance does not weaken
the no-port rejection. Added a `Review corrections (2026-09-29)` paragraph to Slice 2's feature entry in
`docs/features/cutroom-sdk.md`. Staged and committed `PROMPTS/065-cutroom-sdk-slice-2.md` with its contents
unchanged.

**Observed.** `node scripts/check.mjs --slice tests/cutroom-sdk-routes.test.ts tests/workspace.test.ts
tests/boundaries.test.ts` green at this commit: typecheck 2.2 s, lint 5.4 s, format 12.6 s, boundaries 1.3 s,
boundaries proven 3.7 s, no dead rule 65 ms, slice tests 6.1 s (54 subtests: 33 in the SDK routes test, 5
boundaries, 4 pin tests in reel-render/reel-stills/paid-path, 12 workspace and rule-count pin tests; all
green), decisions pin 188 ms, copied docs 65 ms. The full test file expanded from 30 to 33 tests, all 33
green. `node scripts/drift.mjs`, `--prove`, and `--audit` all green; the rule count and audit remain
unchanged. The redirect test uses two local HTTP servers: the configured loopback returns a 307 to the
second, and the test asserts the SDK throws `SdkProtocolError { kind: 'protocol', stage: 'request',
status: 307 }` and the second server receives zero requests. The POST route is `resume`, which carries a
JSON body, so a successful follow would forward that body — a leak the test would prevent.

**Why.** The four findings are scope-bound: they correct Slice 2's behavior without changing any feature
boundary, rule, env var, port, launcher, or child-process shape. A targeted `--slice` is appropriate because
every changed path is well-classified (no infrastructure, no `FULL_ONLY`, no unknown); a document-only run
is not, because the production code and its test file also changed. The 33 SDK-route tests already exercise
every route and every error type, and the boundaries, workspace, and rule-count pin tests prove the
configuration the slice introduced — no other test was touched. The corrections match the Slice 2 prompt's
standing rule that `JOURNAL.md` reflects what was actually committed: a journal entry that names a file as
added but never staged it is the gap this commit closes.

**Next.** Commit the corrections alone with `Verification: targeted`, `Verification-Tree: <exact tree>`,
`Verification-Tests: tests/cutroom-sdk-routes.test.ts tests/workspace.test.ts tests/boundaries.test.ts`;
run `node scripts/verification-status.mjs` against the committed tree; do not begin Slice 3.
