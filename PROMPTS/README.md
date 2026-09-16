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

| #   | Prompt                                                   | Feature       | Work      | Written    | Run        |
| --- | -------------------------------------------------------- | ------------- | --------- | ---------- | ---------- |
| 020 | [020-reel-render-gates.md](020-reel-render-gates.md)     | `reel-render` | gates 1–4 | 2026-09-16 | session 20 |
| 021 | [021-reel-render-slice-1.md](021-reel-render-slice-1.md) | `reel-render` | Slice 1   | 2026-09-16 | not yet    |
