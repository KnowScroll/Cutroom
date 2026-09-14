# Cutroom

The **reel creation engine** for [KnowScroll](https://github.com/Legend101Zz/Knowscroll-v2) — a
personal anti-doomscroll app for its owner and about four friends. Short vertical videos are
researched from cited sources, planned, drawn, and assembled.

The work is split in two, at the stills:

| part            | from              | to                                                  |
| --------------- | ----------------- | --------------------------------------------------- |
| **reel-engine** | a brief           | a plan, then **approved still pictures**. No video. |
| **reel-render** | approved pictures | clips, narration, **one finished video file**       |

Later this repository becomes part of **Cutroom** proper — an interactive video agent, "Claude
Code for video". The reel engine will be **one consumer of Cutroom's core**, not the whole of it.
That core is not built, and the framework question behind it is deliberately unanswered. Nothing
here is shaped around an answer to it.

## What this is not

- **Not the steering system.** Decisions, gates, the journal and the feature plans live in the
  KnowScroll repository. See below.
- **Not a product with users.** Five people, one machine, no scale.
- **Not started.** At the time of writing there is **no feature code at all**: no contracts, no
  tables, no stages, no providers. The gates that precede them are still in review.

## Where the decisions live

There is exactly **one** `steering/DECISIONS.md`, it lives in the KnowScroll repository, and it is
the authority for both repositories (**D-088**). This repository gets no copy that can drift — it
gets a **pinned submodule**:

```bash
git submodule update --init            # check out steering-ref/
node scripts/decisions.mjs             # which commit we can see; is it stale
node scripts/decisions.mjs --fetch     # ask the remote instead of a local ref
node scripts/decisions.mjs D-086       # print one decision
```

`scripts/decisions.mjs` fails loudly in **both** directions: when the pin is behind the remote,
and when the remote is behind a local steering checkout — because a decision that exists only on
one machine is invisible to the first check.

Setup choices made **in this repository** are in [`DECISIONS.md`](DECISIONS.md), numbered `S-`.
They cover the room, never the furniture, and they never contradict a `D-` decision.

## Layout

```text
packages/contracts   shared types, and the ports as types. Imports nothing internal.
packages/pipeline    pure functions: stages and gates. No database, provider, file or socket.
packages/providers   adapters behind the ports, including the stand-ins. No durable state.
packages/domain      tables, migrations, the job queue, the budget ledger.
apps/worker          the runner. The only place that knows both a stage and a table.
apps/api             submitting work and reading records. Never calls a provider.
```

`pipeline` and `providers` are still **empty on purpose**, until `reel-plan`'s Slice 3. The
boundaries between them are not a convention — seventeen rules over the real dependency graph,
three of them between two folders of a single package, two of them about npm packages:

```bash
node scripts/drift.mjs            # no forbidden edge exists
node scripts/drift.mjs --prove    # each rule still CATCHES one written to break it
node scripts/drift.mjs --audit    # no rule has quietly stopped applying to anything
```

The rules are matched on **resolved file paths**, not on the text of an import line. That is what
lets them express a boundary between `src/plan/` and `src/split/` inside one package, where
every import is relative — the check D-073 calls for, and the one a specifier-prefix match can
never make.

## Running the checks

`pnpm` is **not on this machine's PATH**. `corepack` is, and the pnpm version is pinned:

```bash
corepack pnpm install
node scripts/check.mjs             # every check, one summary
node scripts/check.mjs --code      # only the checks about code in this repo
```

The full recipe, including the Node 22.14 type-stripping flags and what to do when install
misbehaves, is `.claude/skills/checks/SKILL.md`.

## The rule that matters most

**Gates before code.** No implementation file exists for a feature whose four planning gates —
product, architecture, program design, slices — have not been approved by an adversarial reviewer.
The gates are written and reviewed in the steering repository. `CLAUDE.md` has the rest of the
rules.
