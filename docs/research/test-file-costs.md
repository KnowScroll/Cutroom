# What every test file costs alone

Merged 2026-10-15T15:13:16.278Z from 4 slice file(s).
One file per process, each run alone, free memory sampled every 500 ms.

**Provenance.** §3 of `docs/research/test_fixes_and_research.md`, taken 2026-10-15 across sessions 88 and 89
by a throwaway runner in `.tmp/` (not committed, so it carries no verification obligation — S-190). Each file
was invoked on its own as `node --experimental-strip-types --test <file>` and timed, with `os.freemem()`
sampled every 500 ms. The table is kept because the numbers are what §4.2 and §4.6 are sized from; the runner
is not.

**The free-memory column is comparable within a slice, not across slices.** The 80 files of session 88 were
measured on a machine with about 4 GB free at rest; the 73 of session 89 with about 7.5 GB. A file that shows
3443 MB and one that shows 7469 MB may cost the same — what each column says is how much was left while that
file ran, on that machine in that state. The one number that is safe to carry is the floor: **3045 MB of
15.3 GB, and never lower, with every file running alone.**

**One red, cause unrecovered.** `tests/reel-render-secrets.test.ts` failed once here at 123.8 s and passed
alone immediately afterwards at 100.6 s. The runner discarded child output at the time, so the failing
assertion is not recoverable; it now writes `.tmp/red-<file>.log` on a non-zero exit. See S-191.

- files measured: **153**, of which secrets journeys **12**
- red files: **1** (tests/reel-render-secrets.test.ts)
- sum of wall times alone: **1501.7 s**
- the 12 secrets journeys: **423.9 s**
- the other 141 files: **1077.8 s**
- lowest free memory seen anywhere: **3045 MB**

## The subtraction

- the suite's own tests step, serial outer runner: **1455.0 s**
- minus the secrets journeys measured alone: **1031.1 s** for everything else
- the same files measured alone: **1077.8 s**
- so the outer runner carries no overhead of its own worth naming: **-46.7 s**, which is the measuring
  runner spending about 0.3 s per file more than the suite does (its own spawn and TAP parse, 153 times).

**What that answers.** The serial suite costs what its files cost, to within 3 %. There is no overlap to
recover and no scheduler overhead to remove, so §4.2 cannot win anything by being tidier — its whole case is
genuine parallelism, and its ceiling is `Σ ÷ concurrency` with the longest single file as a floor:

- the 141 ordinary files: **1077.8 s** serial, longest 73.4 s, median 3.7 s. At an outer concurrency of 4 the
  arithmetic floor is **269 s**; the longest file never binds.
- the 12 secrets children: **423.9 s** serial, longest 123.8 s. At a pool of 2 the floor is **212 s**, at 3 it
  is **141 s**, and the longest child binds at 123.8 s.
- so two non-overlapping classes at 4 and 2 put the tests step near **480 s** against 1455 s today, if memory
  allows it. Memory is the open question, not arithmetic: these floors assume four ordinary files, or two
  secrets children each running 2–4 nested processes with ffmpeg inside them, fit at once.

**Where the time actually is**, among the ordinary files: 24 files under 1 s cost 11.6 s together, 43 more
under 3 s cost 79.1 s, and **35 files cost 742 s of the 1078 s** (31 between 10 s and 30 s, 4 above 30 s).
Shortening the suite means shortening those 35, which is §4.6, or running them beside each other, which is
§4.2. Making the 67 quick files quicker buys nothing.

## Secrets journeys, against their own bounds

| file                                    | alone (s) | bound (s) | margin at least (s) | concurrency | lowest free (MB) | tests |
| --------------------------------------- | --------- | --------- | ------------------- | ----------- | ---------------- | ----- |
| `tests/reel-render-secrets.test.ts`     | 123.8     | 300.0     | 176.2               | 4           | 4893             | 1     |
| `tests/resume-failed-secrets.test.ts`   | 83.6      | 600.0     | 516.4               | 2           | 6965             | 1     |
| `tests/reel-takes-secrets.test.ts`      | 65.5      | 300.0     | 234.5               | 4           | 6468             | 1     |
| `tests/paid-path-secrets.test.ts`       | 49.4      | 360.0     | 310.6               | 4           | 3045             | 1     |
| `tests/reel-stills-secrets.test.ts`     | 27.6      | 300.0     | 272.4               | default     | 5577             | 1     |
| `tests/yield-benchmark-secrets.test.ts` | 24.8      | 600.0     | 575.2               | 2           | 7421             | 1     |
| `tests/ask-again-secrets.test.ts`       | 15.5      | 600.0     | 584.5               | 2           | 3584             | 1     |
| `tests/cut-rules-secrets.test.ts`       | 10.3      | 600.0     | 589.7               | 2           | 3763             | 1     |
| `tests/reel-plan-secrets.test.ts`       | 8.5       | 300.0     | 291.5               | default     | 3075             | 1     |
| `tests/second-ask-secrets.test.ts`      | 7.4       | 600.0     | 592.6               | 2           | 7494             | 1     |
| `tests/three-pictures-secrets.test.ts`  | 5.8       | 600.0     | 594.2               | 2           | 7579             | 1     |
| `tests/paid-failures-secrets.test.ts`   | 1.7       | 300.0     | 298.3               | 4           | 3881             | 1     |

## The suite runs most of itself twice

Each secrets check re-runs its own feature's other test files inside a PATH-only child, so one full suite is
**153 direct file runs plus 121 nested ones — 274 executions of 153 files.** What each one re-runs:

| secrets check     | files it re-runs | alone (s) | nested concurrency |
| ----------------- | ---------------- | --------- | ------------------ |
| `reel-render`     | 28               | 123.8     | 4                  |
| `reel-stills`     | 23               | 27.6      | default            |
| `reel-takes`      | 20               | 65.5      | 4                  |
| `reel-plan`       | 12               | 8.5       | default            |
| `paid-path`       | 11               | 49.4      | 4                  |
| `resume-failed`   | 6                | 83.6      | 2                  |
| `ask-again`       | 5                | 15.5      | 2                  |
| `yield-benchmark` | 5                | 24.8      | 2                  |
| `paid-failures`   | 4                | 1.7       | 4                  |
| `cut-rules`       | 3                | 10.3      | 2                  |
| `second-ask`      | 2                | 7.4       | 2                  |
| `three-pictures`  | 2                | 5.8       | 2                  |

This is the design, not a fault: the property is _this journey passes with no secrets in its environment_, and
only running the journey in such an environment proves it. It is also the whole of §4.4 — a secrets check
narrowed to the files that read an environment variable or reach a provider would drop most of those 121, and
would narrow what a proven property covers, which is why S-028's narrowing is the owner's call and not a
tuning decision.

## Every file, slowest first

| file                                         | alone (s) | tests | lowest free (MB) |
| -------------------------------------------- | --------- | ----- | ---------------- |
| `tests/reel-render-secrets.test.ts`          | 123.8     | 1     | 4893             |
| `tests/resume-failed-secrets.test.ts`        | 83.6      | 1     | 6965             |
| `tests/resume-failed-contract.test.ts`       | 73.4      | 9     | 6603             |
| `tests/reel-takes-secrets.test.ts`           | 65.5      | 1     | 6468             |
| `tests/paid-path-secrets.test.ts`            | 49.4      | 1     | 3045             |
| `tests/paid-path-refusals.test.ts`           | 39.3      | 7     | 3949             |
| `tests/resume-failed-resume.test.ts`         | 35.4      | 15    | 7567             |
| `tests/resume-failed-engine.test.ts`         | 35.3      | 6     | 7521             |
| `tests/reel-render-gates.test.ts`            | 29.6      | 6     | 4002             |
| `tests/reel-render-faults.test.ts`           | 27.7      | 14    | 3819             |
| `tests/reel-stills-secrets.test.ts`          | 27.6      | 1     | 5577             |
| `tests/reel-render-pass.test.ts`             | 27.0      | 6     | 3657             |
| `tests/paid-path-video.test.ts`              | 26.1      | 19    | 3456             |
| `tests/yield-benchmark-secrets.test.ts`      | 24.8      | 1     | 7421             |
| `tests/paid-path-sensor.test.ts`             | 24.7      | 13    | 3888             |
| `tests/paid-path-service.test.ts`            | 24.5      | 3     | 3443             |
| `tests/reel-takes-record.test.ts`            | 23.2      | 6     | 7469             |
| `tests/reel-stills-restart-reserve.test.ts`  | 22.1      | 5     | 7072             |
| `tests/reel-render-cut.test.ts`              | 21.0      | 7     | 3880             |
| `tests/yield-benchmark-reader.test.ts`       | 21.0      | 3     | 7553             |
| `tests/paid-path-image.test.ts`              | 20.6      | 26    | 3925             |
| `tests/reel-render-endings.test.ts`          | 20.5      | 12    | 3912             |
| `tests/cutroom-sdk-package-build.test.ts`    | 19.8      | 19    | 3998             |
| `tests/paid-path-env.test.ts`                | 19.6      | 2     | 3887             |
| `tests/reel-takes-again.test.ts`             | 17.9      | 3     | 7289             |
| `tests/reel-takes-endings.test.ts`           | 17.2      | 6     | 7331             |
| `tests/reel-takes-hold.test.ts`              | 17.2      | 5     | 7440             |
| `tests/reel-render-stops.test.ts`            | 16.6      | 3     | 7540             |
| `tests/reel-render-gate2.test.ts`            | 15.6      | 3     | 4017             |
| `tests/ask-again-secrets.test.ts`            | 15.5      | 1     | 3584             |
| `tests/reel-takes-takes.test.ts`             | 14.9      | 4     | 7527             |
| `tests/reel-render-clips.test.ts`            | 13.6      | 3     | 3838             |
| `tests/reel-takes-labels.test.ts`            | 13.4      | 4     | 7499             |
| `tests/reel-render-spending.test.ts`         | 13.0      | 4     | 7532             |
| `tests/reel-takes-retry.test.ts`             | 12.8      | 3     | 7460             |
| `tests/reel-render-narration.test.ts`        | 12.4      | 3     | 3971             |
| `tests/reel-render-ports.test.ts`            | 12.2      | 2     | 3303             |
| `tests/reel-takes-still-render.test.ts`      | 11.6      | 2     | 7489             |
| `tests/reel-render-manifest.test.ts`         | 11.3      | 8     | 3959             |
| `tests/journey.test.ts`                      | 11.1      | 19    | 4067             |
| `tests/reel-render-restart.test.ts`          | 11.0      | 2     | 3944             |
| `tests/cut-rules-secrets.test.ts`            | 10.3      | 1     | 3763             |
| `tests/reel-render-completed.test.ts`        | 10.1      | 3     | 3871             |
| `tests/reel-takes-cap.test.ts`               | 9.9       | 4     | 7394             |
| `tests/cut-rules-sound.test.ts`              | 9.4       | 2     | 3922             |
| `tests/reel-takes-transient.test.ts`         | 9.0       | 5     | 7557             |
| `tests/reel-render-files.test.ts`            | 8.8       | 4     | 4000             |
| `tests/reel-plan-secrets.test.ts`            | 8.5       | 1     | 3075             |
| `tests/ask-again-witness.test.ts`            | 8.4       | 6     | 3915             |
| `tests/reel-contract-following.test.ts`      | 8.1       | 10    | 4082             |
| `tests/reel-takes-guard.test.ts`             | 8.0       | 4     | 7468             |
| `tests/resume-failed-stills.test.ts`         | 7.9       | 6     | 7506             |
| `tests/reel-takes-still-shapes.test.ts`      | 7.9       | 3     | 7291             |
| `tests/reel-stills-ports.test.ts`            | 7.8       | 2     | 7281             |
| `tests/second-ask-secrets.test.ts`           | 7.4       | 1     | 7494             |
| `tests/reel-takes-ports.test.ts`             | 7.2       | 2     | 7275             |
| `tests/reel-takes-kept.test.ts`              | 7.2       | 3     | 7407             |
| `tests/reel-render-advance.test.ts`          | 7.2       | 3     | 3916             |
| `tests/reel-render-restart-cut.test.ts`      | 7.0       | 1     | 3930             |
| `tests/second-ask-worker.test.ts`            | 6.9       | 3     | 7612             |
| `tests/reel-stills-rules.test.ts`            | 6.7       | 3     | 7251             |
| `tests/check-changed.test.ts`                | 6.7       | 10    | 4074             |
| `tests/reel-plan-rules.test.ts`              | 6.1       | 4     | 3913             |
| `tests/ask-again-record.test.ts`             | 6.0       | 4     | 3867             |
| `tests/reel-takes-restart-budget.test.ts`    | 6.0       | 2     | 7481             |
| `tests/resume-failed-kinds.test.ts`          | 5.8       | 9     | 7651             |
| `tests/three-pictures-secrets.test.ts`       | 5.8       | 1     | 7579             |
| `tests/reel-plan-service.test.ts`            | 5.7       | 2     | 3966             |
| `tests/reel-stills-restart.test.ts`          | 5.7       | 2     | 7442             |
| `tests/three-pictures-standalone.test.ts`    | 5.5       | 6     | 7655             |
| `tests/reel-takes-still-manifest.test.ts`    | 5.5       | 1     | 7514             |
| `tests/yield-benchmark-boundary.test.ts`     | 5.5       | 3     | 7674             |
| `tests/boundaries.test.ts`                   | 5.5       | 5     | 4009             |
| `tests/ask-again-structured.test.ts`         | 5.4       | 9     | 3971             |
| `tests/reel-takes-degradations.test.ts`      | 5.4       | 1     | 7528             |
| `tests/reel-render-rules.test.ts`            | 5.4       | 3     | 4059             |
| `tests/paid-path-keys.test.ts`               | 5.4       | 6     | 4013             |
| `tests/reel-takes-unclaimed.test.ts`         | 4.7       | 1     | 7559             |
| `tests/cut-rules-gate7.test.ts`              | 4.6       | 1     | 3951             |
| `tests/reel-stills-spending.test.ts`         | 4.2       | 4     | 7428             |
| `tests/reel-render-cancel.test.ts`           | 3.9       | 2     | 3975             |
| `tests/reel-stills-score.test.ts`            | 3.7       | 3     | 7241             |
| `tests/reel-plan-cancel.test.ts`             | 3.7       | 2     | 3920             |
| `tests/cutroom-sdk-launcher.test.ts`         | 3.5       | 22    | 3995             |
| `tests/reel-plan-restart.test.ts`            | 3.3       | 1     | 3901             |
| `tests/reel-contract-endings.test.ts`        | 3.0       | 9     | 4093             |
| `tests/reel-plan-shapes.test.ts`             | 2.9       | 6     | 3893             |
| `tests/ask-again-reader.test.ts`             | 2.9       | 1     | 4010             |
| `tests/check-receipt.test.ts`                | 2.7       | 24    | 4090             |
| `tests/feature-files.test.ts`                | 2.7       | 4     | 4115             |
| `tests/reel-stills-faults.test.ts`           | 2.6       | 2     | 7524             |
| `tests/reel-plan-repair.test.ts`             | 2.6       | 3     | 4001             |
| `tests/reel-plan-endings.test.ts`            | 2.5       | 6     | 4005             |
| `tests/reel-stills-reconcile.test.ts`        | 2.4       | 2     | 7245             |
| `tests/reel-stills-derived-repair.test.ts`   | 2.3       | 2     | 7496             |
| `tests/reel-render-stills-stops.test.ts`     | 2.3       | 1     | 7648             |
| `tests/reel-stills-gate1.test.ts`            | 2.3       | 6     | 7590             |
| `tests/reel-stills-endings.test.ts`          | 2.3       | 1     | 7401             |
| `tests/reel-render-chain.test.ts`            | 2.1       | 2     | 4007             |
| `tests/reel-stills-admission.test.ts`        | 2.1       | 3     | 7433             |
| `tests/reel-stills-gate1s.test.ts`           | 2.1       | 1     | 7574             |
| `tests/reel-render-profile.test.ts`          | 2.1       | 3     | 4039             |
| `tests/reel-stills-completed.test.ts`        | 1.9       | 2     | 7502             |
| `tests/reel-stills-placing.test.ts`          | 1.9       | 5     | 7477             |
| `tests/reel-stills-prompts.test.ts`          | 1.9       | 3     | 7453             |
| `tests/reel-render-readiness.test.ts`        | 1.8       | 1     | 4111             |
| `tests/reel-stills-canonical-repair.test.ts` | 1.8       | 2     | 7495             |
| `tests/verification-status.test.ts`          | 1.7       | 2     | 7765             |
| `tests/paid-failures-secrets.test.ts`        | 1.7       | 1     | 3881             |
| `tests/reel-stills-files.test.ts`            | 1.7       | 3     | 7558             |
| `tests/reel-plan-score.test.ts`              | 1.7       | 4     | 3972             |
| `tests/reel-render-admission.test.ts`        | 1.5       | 2     | 4007             |
| `tests/reel-takes-settings.test.ts`          | 1.5       | 3     | 7593             |
| `tests/cutroom-sdk-readiness.test.ts`        | 1.5       | 10    | 4033             |
| `tests/reel-stills-reserve.test.ts`          | 1.5       | 1     | 7353             |
| `tests/yield-benchmark-measures.test.ts`     | 1.4       | 19    | 7769             |
| `tests/resume-failed-script.test.ts`         | 1.4       | 8     | 7625             |
| `tests/reel-plan-run.test.ts`                | 1.4       | 2     | 4031             |
| `tests/reel-contract-restart.test.ts`        | 1.3       | 1     | 4101             |
| `tests/paid-failures-retry.test.ts`          | 1.3       | 4     | 4008             |
| `tests/paid-failures-record.test.ts`         | 1.3       | 5     | 4019             |
| `tests/reel-plan-asking.test.ts`             | 1.2       | 5     | 4043             |
| `tests/reel-render-shapes.test.ts`           | 1.2       | 2     | 7480             |
| `tests/reel-stills-asking.test.ts`           | 1.2       | 1     | 7453             |
| `tests/reel-render-asking.test.ts`           | 1.1       | 1     | 4016             |
| `tests/paid-path-narration.test.ts`          | 1.1       | 15    | 4047             |
| `tests/reel-stills-shapes.test.ts`           | 1.0       | 3     | 7405             |
| `tests/three-pictures-placing.test.ts`       | 1.0       | 5     | 7761             |
| `tests/reel-stills-criteria.test.ts`         | 1.0       | 1     | 7519             |
| `tests/paid-path-real-reel.test.ts`          | 1.0       | 8     | 4130             |
| `tests/reel-render-validator.test.ts`        | 0.9       | 3     | 7570             |
| `tests/reel-contract-asking.test.ts`         | 0.9       | 11    | 4095             |
| `tests/reel-render-names.test.ts`            | 0.8       | 1     | 4134             |
| `tests/reel-plan-planning.test.ts`           | 0.8       | 10    | 4062             |
| `tests/reel-plan-gate0.test.ts`              | 0.8       | 5     | 4078             |
| `tests/paid-failures-adapters.test.ts`       | 0.6       | 6     | 4088             |
| `tests/cutroom-sdk-routes.test.ts`           | 0.6       | 33    | 4099             |
| `tests/paid-path-model.test.ts`              | 0.6       | 17    | 4080             |
| `tests/ask-again-shape.test.ts`              | 0.5       | 2     | 4134             |
| `tests/cut-rules-score.test.ts`              | 0.5       | 1     | 4138             |
| `tests/second-ask-gate.test.ts`              | 0.4       | 5     | 7773             |
| `tests/paid-failures-boundary.test.ts`       | 0.4       | 1     | 4138             |
| `tests/reel-contract-shapes.test.ts`         | 0.3       | 11    | 4152             |
| `tests/line-endings.test.ts`                 | 0.3       | 2     | 4144             |
| `tests/reel-takes-shapes.test.ts`            | 0.3       | 3     | 7708             |
| `tests/reel-stills-contract.test.ts`         | 0.3       | 5     | 7582             |
| `tests/yield-benchmark-ratings.test.ts`      | 0.3       | 15    | 7819             |
| `tests/no-absolute-paths.test.ts`            | 0.3       | 1     | 4137             |
| `tests/yield-benchmark-schema.test.ts`       | 0.3       | 2     | 7838             |
| `tests/paid-path-fixtures.test.ts`           | 0.2       | 3     | 4189             |
| `tests/workspace.test.ts`                    | 0.2       | 4     | 7809             |
| `tests/context-file.test.ts`                 | 0.2       | 4     | 4165             |
| `tests/toolchain.test.ts`                    | 0.2       | 2     | 7800             |
