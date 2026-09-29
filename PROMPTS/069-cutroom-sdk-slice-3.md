# 069 — `cutroom-sdk`: build Slice 3, launcher lifecycle

- **For:** the next implementation session
- **Feature:** `cutroom-sdk` (S-173, S-175, S-176, S-177)
- **Work:** Slice 3 only — explicit launcher, bounded readiness, fixed-port race joining, and creator-owned shutdown
- **Written:** 2026-09-29, after Slice 2 review corrections were committed as `45b9de9` and evidence-bound
- **Run:** not yet run

```text
Build cutroom-sdk Slice 3 only. Do not begin Slice 4's journey or re-journeys.

Starting authority and evidence

1. Run, in this exact order:

   node scripts/decisions.mjs
   node scripts/drift.mjs
   Get-Content JOURNAL.md -Tail 40
   node scripts/verification-status.mjs

   If decisions.mjs reports unpushed steering commits, stop: that authority is newer than this
   prompt. Do not infer around it. The expected starting implementation commit is 45b9de9 and
   its tree 143d0bc4f3054ecacf854b8f5ff32a3c5a3d36b9 has targeted evidence for
   tests/cutroom-sdk-routes.test.ts, tests/workspace.test.ts, and tests/boundaries.test.ts.
   Slice 1 and Slice 2 are complete, read-only unless this slice's explicitly named public
   surface requires an amendment. Do not rerun an aggregate suite merely as a preflight.

2. Read docs/features/cutroom-sdk.md Gates 2–4 in full, this prompt, S-173, S-175, S-176 and
   S-177 in DECISIONS.md, packages/sdk/src/index.ts, apps/service/src/main.ts,
   apps/service/src/settings.ts, .dependency-cruiser.cjs, scripts/drift.mjs, and the current
   SDK route/readiness tests. Then read the service's existing stdin stop protocol before
   designing the launcher. The SDK must never import any service, API, worker, provider, domain,
   pipeline, database, ffmpeg, model-client, or generated-artifact code.

Slice outcome

Extend @cutroom/sdk so createCutroom first probes the configured loopback origin's
GET /v1/ready endpoint and returns a usable typed handle only after a strict
ReadyResponse { contractVersion: 1, ready: true } arrives. It must:

- join an already-ready engine without spawning;
- wait for a recognised strict 503 / ready:false peer at that same origin without spawning;
- if there is no listener and the caller supplied a launcher, spawn exactly that program and
  readonly argument vector with shell: false, then poll the same origin until ready;
- inject the normalized origin's actual explicit port as CUTROOM_API_PORT into the owned child;
- on a fixed-port race, wait for and join the winner rather than choose a second port or start a
  second worker; and
- retain and stop only the child this handle started, by writing the existing stdin `stop` protocol
  and awaiting its exit. A joined handle's close changes no external process.

The public configuration becomes:

  CreateCutroomOptions {
    baseUrl?: string
    launcher?: { command: string, args: readonly string[] }
    readyTimeoutMs?: positive whole milliseconds // default 30_000
  }

Keep the stable error union. Construction with no listener and no launcher throws
SdkConnectionError { kind: 'connection', stage: 'connect' }. A child error or exit with no
eligible winner throws stage: 'start'; expiry while waiting for a recognised non-ready peer or a
port-race winner throws stage: 'ready'; failure while closing the owned child throws stage:
'close'. A bad readiness body, a mismatched contractVersion, malformed JSON, or an unexpected
readiness status is SdkProtocolError { stage: 'ready' } and must never trigger a launch. Errors
and logs must not expose a child environment, provider key, or unparsed response body.

Readiness is the only bounded retry: poll only the configured normalized origin at 100 ms intervals
until readyTimeoutMs. It is not a reel retry and does not change a port. Validate a non-positive,
non-integer, or non-finite timeout before either fetch or spawn. Preserve every Slice 2 route,
its redirect: 'manual' guard, validation-before-fetch, and post-close local rejection. Once
close starts, all route methods reject locally and no later launcher action is possible. close()
is idempotent.

Implementation limits

- Add packages/sdk/src/launcher.ts as the only SDK file importing node:child_process. Keep process
  creation, stdin stop, child-exit observation, and launcher-specific failure classification in
  that private module. It is not a public package entry point.
- packages/sdk/src/index.ts remains the sole public entry point. It may coordinate the state
  machine and import the private launcher, but it must not import a child-process module itself.
- Do not alter apps/api, apps/service, apps/worker, contracts, reel-contract, providers, domain,
  pipeline, migrations, package dependencies, ports other than the existing CUTROOM_API_PORT
  injection, secrets configuration, media, or generated-file configuration. The service already
  owns the port setting and stdin protocol; Slice 3 consumes those contracts without changing them.
- Do not hard-code apps/service/src/main.ts, discover a checkout, compose a shell string, inspect
  provider keys, use signals for normal shutdown, choose another port, use a PID as ownership, or
  introduce reference counting/cross-process leases.
- Keep stdout and stderr ignored for the launched child. Readiness, not a banner, proves startup.

Boundary work

Change processes-only-in-providers only by its exact exception for
packages/sdk/src/launcher.ts. Add sdk-processes-only-launcher, which forbids node:child_process
from every other packages/sdk path. Leave sdk-no-engine-internals intact. Extend drift --prove so
it proves all three relevant facts independently:

1. node:child_process from apps/worker, apps/api, domain, or any other non-provider/non-launcher
   source still violates processes-only-in-providers;
2. node:child_process from packages/sdk/src/index.ts violates sdk-processes-only-launcher; and
3. node:child_process from packages/sdk/src/launcher.ts is legal while an SDK import of
   @cutroom/domain still violates sdk-no-engine-internals.

Run drift --audit after the launcher file exists. Do not weaken a generic rule to make the
launcher legal, and do not make a text-only import assertion: every proof is on resolved paths.

Test ownership and required behavior

Create tests/cutroom-sdk-launcher.test.ts as Slice 3's sole behavior owner. It may use a small
test-only child program/fixture that starts only a local HTTP readiness stand-in, records the port
and stop protocol, and never imports engine code or calls a provider. Use separate temporary
directories and a free explicit loopback port per case; clean up every spawned child in finally.
Do not start the real service, worker, database, or a provider in this test.

The test must prove all of the following, with assertions over effects rather than timing alone:

1. The public entry has the expanded CreateCutroomOptions type, including readonly launcher args
   and readyTimeoutMs; invalid timeout input produces no probe and no child.
2. A strict 200 ready peer is joined with zero launcher invocations; a joined handle can make a
   normal SDK route call, and close() neither sends `stop` nor takes the peer down.
3. With no listener, the SDK invokes exactly the supplied command/vector with shell disabled,
   injects the chosen port as CUTROOM_API_PORT, waits for strict ready, and only then returns a
   usable handle. close() writes `stop` to that exact child, awaits its exit, and is idempotent.
4. With no listener and no launcher, construction rejects at connection stage and creates no
   process.
5. A strict 503/ready:false peer is polled into a joined handle and creates no child; if it stays
   non-ready until a short test timeout, the error is stage ready and still no child starts.
6. A malformed, lookalike, wrong-version, or unexpected readiness response is protocol/ready and
   never launches a child.
7. An owned child that exits before a valid peer is ready is stage start. If it loses the fixed
   port and an eligible winner becomes ready, the SDK joins that winner; it does not select another
   port or launch again.
8. Two independently spawned SDK caller processes racing the same fixed port leave exactly one
   ready stand-in and one child that reached its worker/ready marker. Both clients join that same
   origin. Closing the joining client leaves it running; closing the launcher-owner stops it;
   the former then receives an ordinary connection error on a later request.
9. A PATH-only parent/child test has neither canary provider key in its launched test child, and
   no SDK failure message or captured output carries either canary. The child uses stand-ins only.
10. Post-close route methods reject locally, including after an owned close; no new HTTP request
    or process is created.

tests/cutroom-sdk-routes.test.ts and tests/cutroom-sdk-readiness.test.ts are read-only regression
owners and must run. tests/boundaries.test.ts is the boundary-proving owner. If a rule-count pin
test changes because the rule count increases, name and run it; do not leave an updated pin out of
the affected-test list. Before implementation, write the exact final list in the Slice 3 feature
entry, with a one-line reason for every test beyond these three SDK/boundary files.

Builder sequence

1. Use one fresh slice-builder context. Write the launcher tests and fixture first; observe every
   required behavior red before production code.
2. Add the private launcher module and the minimal index state machine. Keep the initial probe,
   wait-existing path, owned-start path, race-winner join path, and owned close distinguishable.
3. Add the boundary rules and their resolved-path drift cases only after the real launcher exists.
4. Deliberately break and restore: no-launch join, 503 polling, launcher vector/shell discipline,
   injected port, wrong readiness schema/version, no-launcher connection error, premature child
   exit, race-winner join, owned stdin close, joined close, timeout validation, and the two
   child-process boundary rules. Record the named catcher for each in the Slice 3 feature entry.
5. Independently review the diff. Reject any hidden source-entrypoint dependency, shell,
   provider-key handling, port fallback, signal shutdown, engine import, retry beyond readiness,
   journey, or Slice 4 evidence/re-journey work.

Verification and stop boundary

During development, run the new launcher test and node scripts/drift.mjs --prove for focused
feedback. The final verification is the full command, not --slice: this slice changes
.dependency-cruiser.cjs and scripts/drift.mjs, which S-177 treats as verification infrastructure.

Before that final run, update docs/features/cutroom-sdk.md only to tick/document Slice 3 after the
required facts have been proved, and append the required compact JOURNAL.md entry describing the
scope, exact affected tests, evidence command, and that Slice 4 remains unstarted. Then run exactly:

  node scripts/check.mjs

If it fails, record the failure and stop. Do not weaken a test, rule, timeout, or check. On green,
commit Slice 3 alone, with:

  Verification: full
  Verification-Tree: <exact committed tree>

Run node scripts/verification-status.mjs against that committed tree. Stop. Do not run Slice 4's
no-provider journey, append generated Evidence, or re-run another feature's journey.
```
