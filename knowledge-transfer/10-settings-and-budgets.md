# 10 — Settings and budgets

This document is a reference for the settings the service reads, the budgets the engine
honours, and the paths it writes to. Use it when you are configuring a service or wondering
why a given path is where it is.

## Where settings come from

`apps/service/src/settings.ts` reads `CUTROOM_*` environment variables, then the
`CUTROOM_ENV_FILE` file (`.env` by default) if a value was not already set. The
composition root prefers a value set by hand over a value left in a file the operator
forgot about, and a key already exported is not quietly replaced.

A key is read **only** in `packages/providers/src/env.ts`, never here. The composition root
hands the `env` to the port factories; the factories decide whether the value is enough.

## The settings

The full list is in `apps/service/src/settings.ts:84-110`. The most common ones:

| Variable                       | Default                                        | What it does                                                                            |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `CUTROOM_ENV_FILE`             | `<repo>/.env`                                  | Path to the dotenv-style file a key may be in.                                          |
| `CUTROOM_DB_PATH`              | `<repo>/data/cutroom.sqlite`                   | The SQLite database file (gitignored).                                                  |
| `CUTROOM_ARTIFACT_ROOT`        | `<repo>/.artifacts/`                           | Where every generated file goes (gitignored; D-086).                                    |
| `CUTROOM_QUESTIONS_PATH`       | `<repo>/QUESTIONS.md`                          | The questions file a cap refusal or stop is appended to.                                |
| `CUTROOM_BUDGET_PATH`          | `<repo>/BUDGET.md` (the pinned steering-ref's) | The cap file the per-reel cap is read from.                                             |
| `CUTROOM_API_PORT`             | `8787`                                         | The HTTP port (loopback only — D-098).                                                  |
| `CUTROOM_LEASE_MS`             | the floor                                      | The job-claim lease. The service uses `DEFAULT_LEASE_FLOOR_MS` (4 h).                   |
| `CUTROOM_STAND_IN_SCRIPT`      | unset                                          | A JSON file the stand-ins answer from (S-116).                                          |
| `CUTROOM_MINIMAX_BASE_URL`     | `MINIMAX_BASE_URL`                             | Where MiniMax is.                                                                       |
| `CUTROOM_FAL_BASE_URL`         | `FAL_BASE_URL`                                 | Where fal's queue is.                                                                   |
| `CUTROOM_FAL_STORAGE_BASE_URL` | `FAL_STORAGE_BASE_URL`                         | Where fal's storage is.                                                                 |
| `CUTROOM_FAL_IMAGE_MODEL`      | the registry's default                         | Which admitted entry the image port uses (D-028).                                       |
| `CUTROOM_NARRATION_VOICE`      | `'stand-in'`                                   | The voice the narration adapter sends (S-070, D-008).                                   |
| `CUTROOM_PICTURES`             | `'recurring'`                                  | The picture rule (D-027, S-150).                                                        |
| `CUTROOM_RESUME_DELAY_MS`      | `15 * 60_000` (15 min)                         | How long the engine's resume of a failed run is due after the failure.                  |
| `CUTROOM_PROVIDER_<PORT>`      | `'stand-in'` (the default)                     | Which adapter to build. One per port: `model`, `image`, `sensor`, `video`, `narration`. |

Two settings are derived:

```ts
DEFAULT_LEASE_FLOOR_MS = CLIPS_A_JOB * DEFAULT_VIDEO_WAIT_MS + LEASE_SLACK_MS
```

Where `CLIPS_A_JOB` is `clipsAJob(shotCountUnits, TAKES_A_SHOT)` (eighteen) and
`DEFAULT_VIDEO_WAIT_MS` is the wait the video adapter allows per call, and
`LEASE_SLACK_MS = 3_600_000` (one hour). The relationship is **arithmetic, not a comment**:
the floor must outlast the longest possible single job, because nothing renews a lease
(D-002) — a job whose lease runs out is taken to be abandoned, claimed again, and run from
the start, paying for the take in flight a second time (S-092, D-014).

## The BUDGET.md

The per-reel cap is read from a markdown file (default `BUDGET.md` in the pinned
`steering-ref/`). The reader is `readReelCapCents` in `packages/domain/src/budget.ts`. The
expected row is:

```
| Per reel, all-in | … cents |
```

The exact format is in the file's head comment. The reader is strict — a missing row, an
empty cell or a malformed number is an error that the engine surfaces as `the budget could
not be read`. The cap is read **once per job** (`apps/worker/src/plan-job.ts:66`); once per
clips attempt; once per assemble attempt. Reading the file inside a transaction would be wrong.

## The QUESTIONS.md

The questions file is `QUESTIONS.md` by default (`apps/worker/src/questions.ts`). It is
**append-only**. The engine writes to it in three situations:

1. **Plan-stage refusal at the per-reel cap** — `appendBudgetQuestion`. The owner is the one
   who can clear it (D-097, D-100).
2. **Engine resume of a failed run that is over the cap** — `appendResumeQuestion` with
   `by: 'engine'`. Written after the finishing transaction, in the question's normal place
   (S-026).
3. **Caller resume of a failed run that is over the cap** — `appendResumeQuestion` with
   `by: 'caller'`. The API's `ResumeService` writes it.

The file's format is markdown: a header per refusal, with the runId, the requestId, the
estimate, the spent figure, the cap, the ceiling, the rates, and (for a budget refusal) the
plans that were considered.

## The artifact root

Every generated file — stills, clips, narrations, renders, frame strips — goes under
`artifactRoot` (default `<repo>/.artifacts/`). The folder is gitignored. The convention
(D-086, D-087):

- No file the engine writes is on an absolute path.
- One configured path per generated artifact.
- The default for every path is a gitignored folder in this repository.

`setLong`, `getLong`, `setShort`, `getShort` helpers in
`packages/providers/src/artifacts.ts` make sure every artifact goes under the root.

## The lease

A job claimed has a `leaseMs` window before another claim may take it (D-002). The default is
`60_000` (one minute). The service raises it to `DEFAULT_LEASE_FLOOR_MS` (about four hours)
because a real clips job can take minutes per clip and nothing renews a lease.

When a claimed job's lease runs out:

1. `claimJob` sees `state = 'running' AND leaseUntil <= now` and the row is re-eligible.
2. The next claim's `UPDATE … RETURNING` sets `state = 'running'`, increments `attempts`, and
   extends `leaseUntil`.
3. The runner is called again, from the beginning.

There is no in-place resume. A job that crashes mid-stage is not kept and not resumed (S-063,
I-15): it is made again under this attempt's id, under the same number, counting against no
cap.

## The picture rule

`CUTROOM_PICTURES` is either `'recurring'` (default, D-027's rule) or `'upToThree'` (S-150).
The setting is part of `PlanSettings.pictures`, the plan carries it, and the stills make the
pictures under the rule the plan was priced and admitted under. The default rule places one
canonical plus one per distinct subject; `'upToThree'` caps the total at three.

The rule is read **before** the worker starts, and the worker refuses to start with one that
is not in the closed set `PICTURE_RULES` (D-027's reading).

## The cap and the ceiling — the two budgets

There are two budgets to keep separate:

- **The per-reel cap** — the engine's owner-set budget, read from `BUDGET.md`. The engine
  refuses to spend over it.
- **The caller's ceiling** — `request.options.budgetCents`, set per-request by the caller.

A refusal at the per-reel cap asks the owner (D-097, D-100). A refusal at the caller's
ceiling does not — it returns the refusal to the caller and only the caller.

For a `video` run, the ceiling is compared against the **whole estimate** (pictures +
clips + narration, the caller's ceiling is across the whole reel — D-014). For a `stills`
run, the ceiling is compared against the **pictures' estimate** (the rest does not happen).
For a `plan` run, no ceiling comparison at all — planning costs nothing (D-083).

## What you can re-configure without breaking anything

| Setting                        | Reconfigurable? | Notes                                                          |
| ------------------------------ | --------------- | -------------------------------------------------------------- |
| `CUTROOM_API_PORT`             | yes             | Must remain loopback; default `8787`                           |
| `CUTROOM_DB_PATH`              | yes             | The path is gitignored                                         |
| `CUTROOM_ARTIFACT_ROOT`        | yes             | The folder is gitignored; every artifact goes under it         |
| `CUTROOM_QUESTIONS_PATH`       | yes             | Append-only                                                    |
| `CUTROOM_BUDGET_PATH`          | yes             | The cap file must exist; reader is strict                      |
| `CUTROOM_LEASE_MS`             | yes             | Must outlast the longest job; service enforces the floor       |
| `CUTROOM_STAND_IN_SCRIPT`      | yes             | A JSON file the stand-ins answer from (S-116)                  |
| `CUTROOM_MINIMAX_BASE_URL`     | yes             | For recorded-wire tests                                        |
| `CUTROOM_FAL_BASE_URL`         | yes             | For recorded-wire tests; must be set together with storage URL |
| `CUTROOM_FAL_STORAGE_BASE_URL` | yes             | For recorded-wire tests                                        |
| `CUTROOM_FAL_IMAGE_MODEL`      | yes             | Must be in `IMAGE_REGISTRY` (D-028)                            |
| `CUTROOM_NARRATION_VOICE`      | yes             | A real voice for a paid run; `'stand-in'` for the default      |
| `CUTROOM_PICTURES`             | yes             | `'recurring'` or `'upToThree'`                                 |
| `CUTROOM_RESUME_DELAY_MS`      | yes             | Engine's resume delay; `0` or absent turns the switch off      |
| `CUTROOM_PROVIDER_<PORT>`      | yes             | Adapter name; must be in the closed set for that port          |
