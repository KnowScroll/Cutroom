---
status: current
authority: plan
---

# run-provenance — every run records what made it, so any two runs can be told apart

Status: planned
Decisions: D-001, D-022, D-028, D-086, D-094, D-100, S-108, S-109, S-128, S-150, S-153, S-155, S-158, S-162, S-177, S-182
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-10-12 at the owner's request**, in session 83, out of a finding the benchmark's first adversarial
> review made and its second confirmed: **no row in the record says which engine made a run.** The owner asked for
> it by name — _"it should be named, we should have this so each run is specifiable"_ — and it is what turns
> `docs/features/yield-benchmark.md`'s fingerprint into a binding.
>
> **Its gates are not written.** This file records what was found, what it must carry, what it may not do, and what
> the gates must settle. No implementation file until all four are approved by an adversarial reviewer.

## The finding

Measured this session, read-only, over all 52 runs in `data/cutroom.sqlite`: no table in
`packages/domain/src/schema.ts` carries a commit, a version or a settings record. The only things a run stores
about how it was made are the caller's own — `styleId` and `styleVersion` on its receipts, and
`depictionPolicyVersion` inside the request.

Three consequences, each already paid for:

1. **No comparison of two runs can be controlled.** The 52 runs span 25 brief groups and a code base that changed
   several times a day; `yield-benchmark` must therefore stamp every comparison of them "engine version: not
   recorded" and refuse to call a change the cause of a difference.
2. **A setting that changes what the engine makes leaves no trace.** The picture rule is `CUTROOM_PICTURES`
   (S-150, S-153), read at startup and written on no row, so whether a run made standalone pictures can only be
   inferred from the pictures it happens to have.
3. **A rate change is invisible except where it was charged.** S-155 moved the video rate; the only reason the
   change is visible at all is that each receipt stores its own `rate_cents`.

## What it must carry

Decided by the gates, but the list the benchmark needs is known: **the engine's commit** and whether its tree was
clean; the **five adapter names** and the image model slug (S-108, S-128); the **picture rule**; the
**rates** the plan settings were built from; the **contract version**; and the **questions file's** identity, since
Gate 7's question set has already changed once (S-158). Nothing a key could be read from, and no absolute path
(D-022, D-086).

## What it must not do

- **Never a second authority on what the code is.** A recorded commit is a fact about a run, not a thing any check
  may read back as verification evidence — S-177's trailers stay the only verification authority, and S-183 already
  settled that a hosted run corroborates and never verifies.
- **Never a key, a URL or an absolute path**, and never a provider's secret-shaped setting value.
- **Never break a run that cannot determine its provenance.** A worker outside a git checkout must still run; the
  gates decide what an unknown commit is recorded as, and the benchmark already treats absent as absent.

## What the gates must settle

- **Where it lives**: columns on `run`, a `run_provenance` table of its own, or a row written per job. A migration
  either way (D-001), and the run row's shape is asserted in several verified features' checks, so the amendment
  list is part of the work.
- **Who writes it, and when.** The API at submission, the service at startup, or the worker on its first claim —
  and what a resumed run records, since it inherits pieces from a run made by a different engine (S-162).
- **How the commit is obtained without a process in the wrong place.** Reading git at runtime is a child process,
  which only `packages/providers` and the SDK's launcher may start (S-075, S-175); the alternative is a build-time
  constant or a service setting, each with its own failure mode.
- **What an unknown provenance is**, and whether a run may proceed without one.
- **Which verified features' checks move**, in S-099's form, and what each amendment says.

## What it unlocks

`yield-benchmark`'s verdicts stop being conditional: two sides whose recorded provenance differs only in the
declared change can be compared without the "not recorded" stamp. It is also what would let the deferred paid pass
reuse a baseline bought weeks earlier, and what would let `self-heal` (S-169, S-170) learn from runs made by an
engine it can identify.
