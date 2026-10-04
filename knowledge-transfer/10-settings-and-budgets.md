# 10 — Settings and budgets

This document is a reference for the settings the service reads, the budgets the engine
honours, and the paths it writes to. Use it when you are configuring a service or wondering
why a given path is where it is.

## Where settings come from

`apps/service/src/main.ts` loads the `CUTROOM_ENV_FILE` file (`.env` by default) **underneath** the
process environment, and `readSettings` in `apps/service/src/settings.ts` reads every `CUTROOM_*`
setting from the result and refuses a bad one before anything is built. The
composition root prefers a value set by hand over a value left in a file the operator
forgot about, and a key already exported is not quietly replaced.

A key is read **only** in `packages/providers/src/env.ts`, never here. The composition root
hands the `env` to the port factories; the factories decide whether the value is enough.

## The settings

The full list is `SETTING_NAMES` in `apps/service/src/settings.ts`:

| Variable                       | Default                                                                   | What it does                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `CUTROOM_ENV_FILE`             | `<repo>/.env`                                                             | The dotenv-style file loaded under the process environment; a key may be in it.                 |
| `CUTROOM_DB_PATH`              | `<repo>/data/cutroom.sqlite`                                              | The SQLite database file (gitignored). Its folder is created at startup.                        |
| `CUTROOM_ARTIFACT_ROOT`        | `<repo>/.artifacts`                                                       | Where every generated file goes (gitignored; D-086).                                            |
| `CUTROOM_QUESTIONS_PATH`       | `<repo>/QUESTIONS.md`                                                     | The owner-questions file a cap refusal, a cap stop or a resume question is appended to.         |
| `CUTROOM_BUDGET_PATH`          | `<repo>/steering-ref/steering/BUDGET.md`                                  | The file the per-reel cap is read from.                                                         |
| `CUTROOM_API_PORT`             | `8787`                                                                    | The HTTP port (loopback only — D-098). `0` takes any free port.                                 |
| `CUTROOM_LEASE_MS`             | `60000` with every port a stand-in; the floor as soon as any port is real | The job-claim lease. With a real adapter, a value below the floor is refused.                   |
| `CUTROOM_LEASE_FLOOR_MS`       | `DEFAULT_LEASE_FLOOR_MS` (4 h)                                            | The least lease a real job may have.                                                            |
| `CUTROOM_STAND_IN_SCRIPT`      | unset                                                                     | A JSON file the stand-ins answer from (S-116). Without it the stand-in model throws.            |
| `CUTROOM_MINIMAX_BASE_URL`     | `MINIMAX_BASE_URL`                                                        | Where MiniMax is.                                                                               |
| `CUTROOM_FAL_BASE_URL`         | `FAL_BASE_URL`                                                            | Where fal's queue is.                                                                           |
| `CUTROOM_FAL_STORAGE_BASE_URL` | `FAL_STORAGE_BASE_URL`                                                    | Where fal's storage is.                                                                         |
| `CUTROOM_FAL_IMAGE_MODEL`      | `fal-ai/flux-2-pro/edit`                                                  | Which admitted registry entry the image port uses (D-028).                                      |
| `CUTROOM_NARRATION_VOICE`      | `'stand-in'`                                                              | The voice the narration adapter sends as MiniMax's `voice_id` (S-070, D-008).                   |
| `CUTROOM_PICTURES`             | `'upToThree'`                                                             | The picture rule (S-150, S-153). `'recurring'` (D-027's rule) must be asked for.                |
| `CUTROOM_RESUME_DELAY_MS`      | `900000` (15 min)                                                         | How long after a provider's fault the engine's own resume is due.                               |
| `CUTROOM_PROVIDER_<PORT>`      | `'fake'`                                                                  | Which adapter to build, one setting per port: `MODEL`, `IMAGE`, `SENSOR`, `VIDEO`, `NARRATION`. |

The image and video rates are not settings: with a real image port the worker prices pictures at
the configured registry entry's own rate, and with a real video port at H3's 0.5¢ a second
(S-124, S-125).

The lease floor is derived:

```ts
DEFAULT_LEASE_FLOOR_MS = CLIPS_A_JOB * DEFAULT_VIDEO_WAIT_MS + LEASE_SLACK_MS
```

Where `CLIPS_A_JOB` is `clipsAJob(shotCountUnits, TAKES_A_SHOT)` (eighteen) and
`DEFAULT_VIDEO_WAIT_MS` is the wait the video adapter allows per call (ten minutes), and
`LEASE_SLACK_MS = 3_600_000` (one hour). The relationship is **arithmetic, not a comment**:
the floor must outlast the longest possible single job, because nothing renews a lease
(D-002) — a job whose lease runs out is taken to be abandoned, claimed again, and run from
the start, paying for the take in flight a second time (S-092, D-014).

## The BUDGET.md

The per-reel cap is read from a markdown file (default `BUDGET.md` in the pinned
`steering-ref/`). The reader is `readReelCapCents` in `packages/domain/src/budget.ts`. The
expected row is:

```
| Per reel, all-in | **$3.00** | worker pre-flight |
```

The figure is dollars (`$3`, `$3.00` or `**$3.00**`) and is read as integer cents — 300 today.
The reader is strict: a file with no such row, or a figure that is not dollars, throws — a cap that
cannot be read is not a cap of 0. A plan job that cannot read it fails the run (`engine`); the
keyframes and clips jobs fail it the same way. The cap is read once per job attempt (plan,
keyframes, clips), by the engine's resume before its transaction, and by the API for each resume
request — never inside a transaction. The assemble job does not read it: it buys nothing.

## The QUESTIONS.md

The questions file is `QUESTIONS.md` by default (`apps/worker/src/questions.ts`). It is
**append-only**, and it is written only when the engine's own per-reel cap fires — a refusal or
stop at the caller's ceiling is returned, never written — plus one kind of note:

1. **Plan refused at the cap** (every plan over it) — `appendBudgetQuestion` (D-097, D-100).
2. **Stills stage stopped at the cap** — `appendBudgetStopQuestion` (S-035).
3. **Clips stage stopped at the cap** — `appendClipsStopQuestion`, naming the clip or narration
   the guard refused (S-087).
4. **A resume over the cap** — `appendResumeQuestion`, with `by: 'engine'` (written after the
   failing transaction) or `by: 'caller'` (written by the API's `ResumeService`).
5. **An engine resume that could not be made** — `appendResumeUnmade`, one line naming the run
   and why (S-163).

Each entry is written after the run's transaction, never inside it (S-026), and carries the run,
the request, the figures the decision was made on (estimate, spent, cap, ceiling, rates) and, for
a plan refusal, the plans considered.

## The artifact root

Every generated file — stills, clips, narrations, renders, frame strips — goes under
`artifactRoot` (default `<repo>/.artifacts/`). The folder is gitignored. The convention
(D-086, D-087):

- No absolute path is written in the repository; every generated path is one setting.
- The default for every path is a gitignored folder in this repository.
- Every adapter takes its file paths from `artifactPath` in `packages/providers/src/artifacts.ts`,
  which builds them under the root, a folder per run, and refuses any id that would leave it.

Results carry the absolute path of each file on the engine's machine, never its bytes.

## The lease

A job claimed has a `leaseMs` window before another claim may take it (D-002). The worker's
default is `60_000` (one minute), and the service keeps it while every port is a stand-in. As soon
as any port is real, the service uses `DEFAULT_LEASE_FLOOR_MS` (four hours) and refuses a lower
`CUTROOM_LEASE_MS`, because a real clips job can take minutes per clip and nothing renews a lease.

When a claimed job's lease runs out:

1. `claimJob` sees `state = 'running' AND leaseUntil <= now` and the row is re-eligible.
2. The next claim's `UPDATE … RETURNING` sets `state = 'running'`, increments `attempts`, and
   extends `leaseUntil`.
3. The runner is called again, from the beginning.

There is no in-place resume. A job that crashes mid-stage is not kept and not resumed (S-063,
I-15): it is made again under this attempt's id, under the same number, counting against no
cap.

## The picture rule

`CUTROOM_PICTURES` is `'upToThree'` unless set (S-153) or `'recurring'` (D-027's rule, and the
pipeline's own default, which a worker started outside the service uses). The setting becomes
`PlanSettings.pictures`; a plan made under `upToThree` carries the rule with it, and the stills
are placed under the rule the plan was priced and admitted under, whichever worker makes them.

- `'recurring'`: pictures only for subjects that appear in two or more shots — the rank-1
  subject's canonical, ranks 2 and 3 derived from it. A plan with no recurring subject has no
  pictures; every clip is made from words.
- `'upToThree'`: the same, then free slots — up to three pictures in all — go to the earliest
  shots that hold no picture and name no pictured subject, as standalone pictures.

A value outside the closed set `PICTURE_RULES` is refused by `readSettings`, and a worker handed
one directly refuses to start.

## The cap and the ceiling — the two budgets

There are two budgets to keep separate:

- **The per-reel cap** — the engine's owner-set budget, read from `BUDGET.md`. The engine
  refuses to spend over it.
- **The caller's ceiling** — `request.options.budgetCents`, set per-request by the caller.

A refusal at the per-reel cap asks the owner (D-097, D-100). A refusal at the caller's
ceiling does not — it returns the refusal to the caller and only the caller.

For a `video` run, the ceiling is compared against the plan's **whole estimate** (pictures and
clip seconds; narration and model calls cost 0 and are not in it — D-014, D-083). For a `stills`
run, the ceiling is compared against the **pictures' estimate** (the rest does not happen).
For a `plan` run, no ceiling comparison at all — planning costs nothing (D-083).

## What you can re-configure without breaking anything

| Setting                        | Reconfigurable? | Notes                                                                                         |
| ------------------------------ | --------------- | --------------------------------------------------------------------------------------------- |
| `CUTROOM_API_PORT`             | yes             | Must remain loopback; default `8787`                                                          |
| `CUTROOM_DB_PATH`              | yes             | The path is gitignored                                                                        |
| `CUTROOM_ARTIFACT_ROOT`        | yes             | The folder is gitignored; every artifact goes under it                                        |
| `CUTROOM_QUESTIONS_PATH`       | yes             | Append-only                                                                                   |
| `CUTROOM_BUDGET_PATH`          | yes             | The cap file must exist; reader is strict                                                     |
| `CUTROOM_LEASE_MS`             | yes             | With a real port, at least the floor; a lower value is refused                                |
| `CUTROOM_STAND_IN_SCRIPT`      | yes             | A JSON file the stand-ins answer from (S-116)                                                 |
| `CUTROOM_MINIMAX_BASE_URL`     | yes             | For recorded-wire tests                                                                       |
| `CUTROOM_FAL_BASE_URL`         | yes             | For recorded-wire tests; must be set together with storage URL                                |
| `CUTROOM_FAL_STORAGE_BASE_URL` | yes             | For recorded-wire tests                                                                       |
| `CUTROOM_FAL_IMAGE_MODEL`      | yes             | Must be in `IMAGE_REGISTRY` (D-028)                                                           |
| `CUTROOM_NARRATION_VOICE`      | yes             | A real voice for a paid run; `'stand-in'` for the default                                     |
| `CUTROOM_PICTURES`             | yes             | `'upToThree'` (default) or `'recurring'`                                                      |
| `CUTROOM_RESUME_DELAY_MS`      | yes             | Whole milliseconds ≥ 0; `0` makes the resume due at once. The service's worker always resumes |
| `CUTROOM_PROVIDER_<PORT>`      | yes             | `fake` or the port's real adapter; a real one needs its key                                   |
