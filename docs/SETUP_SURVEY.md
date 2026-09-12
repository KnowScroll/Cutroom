---
status: current
authority: record of a survey, not a plan
date: 2026-09-12
---

# What the steering repository's Claude Code setup actually contains

The bootstrap prompt listed eight things to study in the KnowScroll repository and asked for a
written note of **anything else found there**, and whether this repository should have an
equivalent. This is that note.

## Listed, and what was done with each

| In the steering repo                                                                                              | Here                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`, 54 lines, architecture deliberately left out                                                         | Written, same shape, ~70 lines. Architecture stays in `README.md` and the boundary rules.                                                                              |
| `AGENTS.md`, **0 bytes**                                                                                          | Written. The gap was the point.                                                                                                                                        |
| `.claude/settings.json`                                                                                           | Written — and see below: the original has no permissions at all.                                                                                                       |
| `.claude/hooks/session-start.sh`                                                                                  | Adapted: the pin, the boundaries, the journal, the commits. Not a steering `STATE.md`, which does not exist here.                                                      |
| `.claude/hooks/stop-gate.sh`                                                                                      | Adapted: journal entry required, plus the code checks must pass when source changed. Dropped the proof-manifest condition, which belongs to a ritual that stays there. |
| `.claude/skills/run/SKILL.md`                                                                                     | Became `.claude/skills/checks/SKILL.md`. There is no app to launch yet; the recipe worth recording is how to install and check on a machine without pnpm.              |
| nine `scripts/*.mjs`                                                                                              | Only `drift` was taken, and rewritten. See below.                                                                                                                      |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.dependency-cruiser.cjs`, `.editorconfig`, `.npmrc` | All present, all changed where this repository's runtime differs.                                                                                                      |

### The nine scripts, one sentence each

`state`, `journey`, `proof`, `handoff` and `archive` all read a `steering/` tree that is not here
and, by Q18 point 2, never will be — **not copied.** `truth` compares a running server against the
repository; there is no server yet, and when there is, what it should compare is not yet known —
**not copied, worth revisiting.** `cost` reads a budget ledger that does not exist until the domain
package does — **not copied yet; it becomes relevant with the first `model_receipt` row.** `env.sh`
reads the macOS Keychain — **not copied, and it cannot be: this is Windows.** Secrets here will
need a different mechanism, and that is an open question, not a decision. `drift` — **taken, and
rewritten**: same name, narrower job, plus a `--prove` mode the original does not have.

## Not listed, and found anyway

| Found                                                                                                                               | Does this repository want it?                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No `.gitattributes` at all**                                                                                                      | **Yes, and it is the first file here.** `.editorconfig` says `end_of_line = lf` while the machine's git says `autocrlf=true`, so the steering working tree is CRLF. That is the afternoon §8 of the bootstrap records.         |
| `.claude/settings.json` has **no `permissions` key** — only hook wiring, despite being described as "permissions, env, hook wiring" | Yes. Written here with `allow`, `ask` (push, submodule update) and `deny` (reading `.env`, force-push).                                                                                                                        |
| `playwright.config.ts` and `journeys/`                                                                                              | Not yet. Journeys for these features run here once their gates are approved, and what they drive is not decided.                                                                                                               |
| `proof/` with a committed `manifest.json` per bundle                                                                                | No. D-089 settles it: the tests run here and answer to nothing there, so there is no manifest to write.                                                                                                                        |
| `db/` at the repository root, separate from the domain package                                                                      | Yes, kept — `db/migrations/` is drizzle's output and is not source.                                                                                                                                                            |
| Root `tsconfig.json` as a **solution file** with `references`                                                                       | Yes, and with a twist: empty packages are deliberately unreferenced, and a test catches the reference someone forgets to add later (S-011).                                                                                    |
| `scripts/spikes/`                                                                                                                   | No.                                                                                                                                                                                                                            |
| `.npmrc` with `link-workspace-packages` and `prefer-workspace-packages`                                                             | Yes, copied verbatim. It is what makes `workspace:*` resolve to the local package.                                                                                                                                             |
| **No `.mcp.json`**                                                                                                                  | No. Nothing here needs an MCP server.                                                                                                                                                                                          |
| **No `.claude/agents/`**                                                                                                            | Not yet. An adversarial reviewer as a defined subagent is plausible, but the review process lives in the steering repository and changing where it runs is a decision nobody has made.                                         |
| **No `.claude/commands/`**                                                                                                          | No. `node scripts/check.mjs` is one command already.                                                                                                                                                                           |
| **No `.github/`** — no CI, no workflows, no templates                                                                               | **Worth a decision, and not mine.** Every check here runs locally and nothing enforces them on a push. CI would catch exactly the case the checks cannot: a commit made on a machine where nobody ran them. Raised, not built. |
| **No `.vscode/`**                                                                                                                   | No.                                                                                                                                                                                                                            |
| `AGENTS.md` existing but empty, while `CLAUDE.md` is thorough                                                                       | Taken as a warning, not a pattern.                                                                                                                                                                                             |

## One thing found by reading rather than listing

`contentions.md` contains a **lone carriage return** inside a code span at line 550 — a document
about the CRLF trap, holding the literal byte. It is content, not damage. The copy in
`docs/design/` preserves it, `scripts/docs-check.mjs` normalises `\r\n` but never a lone `\r`, and
`tests/line-endings.test.ts` skips `docs/design/` for exactly this reason.
