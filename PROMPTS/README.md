# PROMPTS — what each session was asked to do

Every session's opening prompt is kept here, one file per prompt, so what a session was asked can be read beside what
its `JOURNAL.md` entry says it did (S-065).

- **Named `NNN-<feature>-<work>.md`**: `NNN` is the session's number in `JOURNAL.md`, three digits so the folder sorts
  in order.
- **Each file** opens with a title and a short label — the session it is for, the feature, the work, when it was
  written and whether it has run — then holds **the prompt verbatim in one fenced block**, which the formatter never
  rewrites and which can be copied whole.
- **A prompt is not edited once its session has run**, except its `Run` line. A changed prompt is a new file.
- **Committed**, never left untracked at the repository root: `node scripts/journey.mjs` refuses a dirty tree.

| #   | Prompt                                                                                 | Feature         | Work                           | Written    | Run        |
| --- | -------------------------------------------------------------------------------------- | --------------- | ------------------------------ | ---------- | ---------- |
| 020 | [020-reel-render-gates.md](020-reel-render-gates.md)                                   | `reel-render`   | gates 1–4                      | 2026-09-16 | session 20 |
| 021 | [021-reel-render-slice-1.md](021-reel-render-slice-1.md)                               | `reel-render`   | Slice 1                        | 2026-09-16 | session 21 |
| 022 | [022-reel-render-slice-2.md](022-reel-render-slice-2.md)                               | `reel-render`   | Slice 2                        | 2026-09-17 | session 22 |
| 023 | [023-reel-render-slice-3.md](023-reel-render-slice-3.md)                               | `reel-render`   | Slice 3                        | 2026-09-17 | session 23 |
| 025 | [025-reel-render-slice-4.md](025-reel-render-slice-4.md)                               | `reel-render`   | Slice 4                        | 2026-09-18 | session 25 |
| 027 | [027-reel-render-slice-5.md](027-reel-render-slice-5.md)                               | `reel-render`   | Slice 5                        | 2026-09-19 | session 27 |
| 028 | [028-reel-render-slice-6.md](028-reel-render-slice-6.md)                               | `reel-render`   | Slice 6                        | 2026-09-19 | session 28 |
| 029 | [029-reel-takes-gates.md](029-reel-takes-gates.md)                                     | `reel-takes`    | gates 1–4                      | 2026-09-19 | session 29 |
| 030 | [030-reel-takes-slice-1.md](030-reel-takes-slice-1.md)                                 | `reel-takes`    | Slice 1                        | 2026-09-19 | session 30 |
| 031 | [031-reel-takes-slice-2.md](031-reel-takes-slice-2.md)                                 | `reel-takes`    | Slice 2                        | 2026-09-19 | session 31 |
| 032 | [032-reel-takes-slice-3.md](032-reel-takes-slice-3.md)                                 | `reel-takes`    | Slice 3                        | 2026-09-19 | session 32 |
| 033 | [033-reel-takes-slice-4.md](033-reel-takes-slice-4.md)                                 | `reel-takes`    | Slice 4                        | 2026-09-20 | session 33 |
| 034 | [034-reel-takes-slice-5.md](034-reel-takes-slice-5.md)                                 | `reel-takes`    | Slice 5                        | 2026-09-20 | session 34 |
| 035 | [035-reel-takes-slice-6.md](035-reel-takes-slice-6.md)                                 | `reel-takes`    | Slice 6                        | 2026-09-20 | session 35 |
| 036 | [036-paid-path-slice-1.md](036-paid-path-slice-1.md)                                   | `paid-path`     | Slice 1                        | 2026-09-20 | session 36 |
| 037 | [037-paid-path-slice-2.md](037-paid-path-slice-2.md)                                   | `paid-path`     | Slice 2                        | 2026-09-20 | session 37 |
| 038 | [038-paid-path-slice-3.md](038-paid-path-slice-3.md)                                   | `paid-path`     | Slice 3                        | 2026-09-20 | session 38 |
| 039 | [039-paid-path-slice-4.md](039-paid-path-slice-4.md)                                   | `paid-path`     | Slice 4                        | 2026-09-20 | session 39 |
| 040 | [040-paid-path-slice-5.md](040-paid-path-slice-5.md)                                   | `paid-path`     | Slice 5                        | 2026-09-20 | session 40 |
| 041 | [041-paid-path-slice-6.md](041-paid-path-slice-6.md)                                   | `paid-path`     | Slice 6                        | 2026-09-21 | session 41 |
| 042 | [042-paid-path-slice-7.md](042-paid-path-slice-7.md)                                   | `paid-path`     | Slice 7                        | 2026-09-21 | session 42 |
| 043 | [043-paid-path-slice-8.md](043-paid-path-slice-8.md)                                   | `paid-path`     | Slice 8                        | 2026-09-21 | session 43 |
| 044 | [044-minimax-key.md](044-minimax-key.md)                                               | —               | research                       | 2026-09-21 | session 44 |
| 045 | [045-paid-path-real-reel.md](045-paid-path-real-reel.md)                               | `paid-path`     | the reel                       | 2026-09-21 | session 45 |
| 046 | [046-paid-path-gaps-then-gate-7.md](046-paid-path-gaps-then-gate-7.md)                 | `paid-path`     | the gaps, then Gate 7          | 2026-09-22 | session 46 |
| 047 | [047-second-ask-then-the-reel.md](047-second-ask-then-the-reel.md)                     | `second-ask`    | the second ask                 | 2026-09-22 | session 47 |
| 048 | [048-make-a-reel.md](048-make-a-reel.md)                                               | —               | make reels                     | 2026-09-23 | session 48 |
| 049 | [049-ask-again-then-the-reel.md](049-ask-again-then-the-reel.md)                       | `ask-again`     | ask again, then the reel       | 2026-09-24 | session 49 |
| 051 | [051-changed-checks-then-parallel-reels.md](051-changed-checks-then-parallel-reels.md) | —               | checks, then two reels at once | 2026-09-25 | session 51 |
| 052 | [052-resume-failed-gates-then-reviews.md](052-resume-failed-gates-then-reviews.md)     | `resume-failed` | gates, then the reviews        | 2026-09-25 | session 52 |
| 053 | [053-two-test-reels.md](053-two-test-reels.md)                                         | —               | two reels, no code touched     | 2026-09-25 | session 53 |
| 054 | [054-two-explainer-reels.md](054-two-explainer-reels.md)                               | —               | two explainer reels, healed    | 2026-09-25 | session 54 |
| 055 | [055-explainer-reels-again.md](055-explainer-reels-again.md)                           | —               | the two reels again, DNS first | 2026-09-26 | session 55 |
| 056 | [056-resume-failed-approve-then-build.md](056-resume-failed-approve-then-build.md)     | `resume-failed` | approve, then build            | 2026-09-25 | not yet    |

**No 024.** Session 24 opened with a question — _"What is next?"_ — pushed Slice 3 and wrote 025; it ran no prompt.

**No 026.** Session 26 opened with the same question — _"Whats next"_ — pushed Slice 4 and wrote 027; it ran no prompt.

**No 050.** Session 50 opened with the same question — _"Okay what is next?"_ — and made the first hybrid reel instead; it
ran no prompt. 050, written for it and never run, was carried to 051 with its standing and its reviews brought up to
date, then rewritten before it ran, at the owner's word, for time: `check.mjs --changed` and two reels made at once. Its
`resume-failed` gates and reviews go to 052, from 051's text at commit `01982a8`.

**053 was rewritten twice before it ran.** Written for `parallel-shots`' gates, it became `resume-failed`'s approving
read and build when the owner put reliability before speed (S-168). The `parallel-shots` text is at commit `b15d203`,
carried to the session that writes those gates. Then the owner put two test reels first: they are 053, and
`resume-failed` moved to 054, as committed at `b1ffcfd`. In session 53 the owner put two explainer reels first — video game graphics and JoJo's Bizarre
Adventure, their briefs approved — so they are 054, and `resume-failed` moved to 055. Session 54 made neither — one stop its brief caused, then this
machine's DNS (P-020) — and the owner asked for them again: they are 055, and `resume-failed` moved to 056.
