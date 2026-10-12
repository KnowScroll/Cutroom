---
status: current
authority: a measurement of this repository's history, not a decision
---

# Public exposure audit — 2026-10-12

The owner made `KnowScroll/Cutroom` public before session 84. A public repository's whole history is readable
by anyone, so the question is not whether `.env` is ignored today. It is whether a secret was ever committed, in
any commit, on any branch, in any tag, or in any object left behind — and what else a reader can now learn.

**Result: no secret was found.** Every key-shaped string in the history is a deliberate fixture or canary. No
`.env`, no media, no database, no archive and no verbatim provider response was ever committed. One thing the
owner should know is not a secret and is not new: **the steering repository the submodule points at is also
public**, so the founding research, all 115 `D-` decisions and `BUDGET.md` were already readable before Cutroom
was.

Nothing here is a fix and nothing was rewritten. A scrub would not be a fix either: a public commit may already
be cloned, forked or cached.

## What is public, confirmed from GitHub rather than assumed

| repository                                                                  | visibility | last push            | role                                        |
| --------------------------------------------------------------------------- | ---------- | -------------------- | ------------------------------------------- |
| [`KnowScroll/Cutroom`](https://github.com/KnowScroll/Cutroom)               | **public** | 2026-10-02T17:51:52Z | this repository                             |
| [`Legend101Zz/Knowscroll-v2`](https://github.com/Legend101Zz/Knowscroll-v2) | **public** | 2026-09-14T16:01:40Z | the steering authority, pinned at `e05e9f0` |

Read from `https://api.github.com/repos/<owner>/<name>` unauthenticated: both answer `"private": false`,
`"visibility": "public"`. `git ls-remote origin` returns exactly two lines — `HEAD` and `refs/heads/main`, both
at `94ee04a` — so `origin` publishes one branch and no tag.

## What was searched

Not the working tree. The **object database**, which is larger than the history: `git cat-file
--batch-all-objects` reads every object the repository holds, including ones no branch reaches.

| searched                     | how                                                                 | count    |
| ---------------------------- | ------------------------------------------------------------------- | -------- |
| every blob, reachable or not | `git cat-file --batch-all-objects --batch`                          | **1857** |
| every commit                 | `git rev-list --all --count`, `git for-each-ref`                    | 287      |
| every ref                    | `git for-each-ref` — `main`, `origin/main`, 16 local `refs/codex/*` | 18       |
| every tag                    | `git tag`                                                           | 0        |
| every path ever committed    | `git rev-list --objects --all`                                      | 599      |
| every commit message         | `git log --all --format='%H%n%B'`                                   | 287      |
| objects no ref reaches       | `git fsck --lost-found`                                             | ~20      |
| the steering clone           | the same blob scan inside `steering-ref/` (full clone, not shallow) | 401      |
| every wire fixture version   | every version of every `tests/fixtures/wire/*.json` ever committed  | 77       |
| blobs skipped as binary      | one, named and accounted for below                                  | 1        |

The patterns, applied to the bytes of every text blob: `sk-…`; JWT (`eyJ….….…`, which is the shape of a real
MiniMax key); fal's `uuid:hex` key id and secret; `fal_key`/`fal_secret`; `API_KEY`, `APIKEY`, `ACCESS_KEY`,
`SECRET_KEY`, `CLIENT_SECRET`, `AUTH_TOKEN`, `ACCESS_TOKEN`, `PASSWORD`, `SECRET`, `TOKEN` assigned a value of
12 characters or more; `Authorization:` headers and `Bearer <token>`; AWS `AKIA`/`ASIA`; GitHub `ghp_`, `gho_`,
`ghu_`, `ghs_`, `ghr_`, `github_pat_`; `-----BEGIN … PRIVATE KEY-----`; Slack `xox[abprs]-`; Google `AIza…`;
**any URL whose query string names a parameter matching key/token/secret/signature/sig/credential/password/auth**
(D-022's rule, applied to the history rather than to the recorder); `aliyuncs`, `OSSAccessKeyId`, `oss-<region>-`;
and every run of 40 or more base64 characters and every 64-character hex string, each one then read and accounted
for.

Two traps were hit and are worth keeping. `git grep` over 287 revisions reads the trees, not the loose and
unreachable objects, which is why the scan is written against `--batch-all-objects`. And a regex passed through a
heredoc arrived with its backslashes halved — the trap CLAUDE.md already records — so the scanner was written to
a file with an editor and run from there.

## What was found, and why each one is a fixture

| string                          | blobs | where                                                        |
| ------------------------------- | ----- | ------------------------------------------------------------ |
| `sk-canary-not-a-real-key`      | 40    | the `tests/*-secrets.test.ts` canaries and `docs/context.md` |
| `sk-test-api-key-123`           | 2     | `tests/cutroom-sdk-launcher.test.ts`                         |
| `sk-abcdefghijklmnop`           | 1     | `tests/ask-again-record.test.ts`                             |
| `sk-abcdefghijklmnopqrs`        | 1     | `tests/ask-again-structured.test.ts`                         |
| `sk-abcdefghijklmnopqrstuvwxyz` | 1     | `tests/ask-again-record.test.ts`                             |
| `X-Amz-Signature=deadbeef`      | 3     | the redaction tests' fixture URL                             |
| `X-Amz-Credential=AKIAEXAMPLE`  | 3     | the same fixture                                             |

That is the whole list. **Zero** JWT-shaped strings, zero `uuid:hex` fal keys, zero real `AKIA`, zero GitHub
token, zero private-key block, zero `Authorization` header carrying a value, zero credential-named query
parameter. Eleven `.npmrc`-and-`.env`-shaped candidates in the path list resolve to `.env.example`, `.npmrc` and
the nine `tests/*-secrets.test.ts` files, which are the tests that assert redaction.

Everything else the entropy sweep raised is accounted for: 1919 integrity hashes in `pnpm-lock.yaml`; git tree
hashes quoted in `JOURNAL.md`, `docs/context.md` and the feature files; base64 PNG bodies in four
`tests/fixtures/wire/fal-picture-*.json`; and long slash-separated source paths that match a base64 pattern by
accident.

### The one blob the text scan skipped

The scan skips a blob containing a NUL byte, because a key is a text string and a binary blob would
only produce noise. **Exactly one blob was skipped**, and it is accounted for: a 24-byte UTF-16LE
`README.md` holding `# Cutroom` and nothing else — the repository's first README, written by a
PowerShell redirection, which is what produces UTF-16 on Windows. It appears in `c0243df` and
`aebcea4`. Twenty-four bytes cannot hold a key, so no blob in this repository is unexamined.

(`aebcea4`'s commit message is `slkdfjsd`. That is now permanently public. It is cosmetic, it is not
worth a history rewrite, and it is mentioned here so nobody discovers it and wonders whether the
audit saw it.)

### `.env` was never committed

`.env.example` is the only `.env`-shaped path in the 599, added once in `c0243df` and never changed. It holds two
settings and no key. `.env` exists on this machine and `git check-ignore -v .env` answers `.gitignore:4`.

### Nothing generated was ever committed

No `.png`, `.jpg`, `.mp4`, `.wav`, `.sqlite`, `.db` or `.tgz` path appears in the 599. So no run's media, no
`data/cutroom.sqlite`, and no packed SDK artifact is in the history — which also means no reel, no receipt row
and no cost ledger leaked through a committed artifact.

### D-022: no provider response is held verbatim

D-022 exists because the T2A spike once stored MiniMax's `subtitle_file` verbatim — a presigned Alibaba OSS URL
carrying `OSSAccessKeyId` and `Signature`, a live credential belonging to MiniMax, and GitHub's push protection
rejected that push. Every version of every wire fixture was re-read against that rule. Two OSS references exist
and both are correct:

- `tests/fixtures/wire/minimax-t2a-clipped.json` carries `subtitle_file` as
  `https://minimax-algeng-chat-tts-us.oss-us-east-1.aliyuncs.com/audio_subtitle/recorded/subtitle.json` — the
  host, and **no query string at all**, which is exactly the shape D-022 requires, since it drops the whole query
  once any parameter matches.
- `tests/fixtures/wire/minimax-t2a-redacted.json` carries a note saying the real value is a presigned OSS link
  with `OSSAccessKeyId`, `Signature` and `Expires`, and that it is deliberately not reproduced.

## What the submodule now exposes

`.gitmodules` publishes the URL `https://github.com/Legend101Zz/Knowscroll-v2.git` and `git ls-tree HEAD
steering-ref` publishes the pin `e05e9f0257f3066b441f6554b67a786d6635c6a4`. **That repository is public.** A
reader of Cutroom therefore needs nothing from the owner to read, at the exact commit this repository answers to:

- `steering/DECISIONS.md` — all 115 `D-` entries, which CLAUDE.md names as binding here;
- `docs/founding/RESEARCH.md` — the founding research, including §19, which the copy rules cite;
- `steering/BUDGET.md`;
- the rest of that repository at that commit: `apps/`, `packages/`, `db/`, `journeys/`, `proof/`, `scripts/`.

**Making Cutroom public did not expose it.** It was already public, and it was pushed last on 2026-09-14, before
Cutroom's own history was readable. The submodule makes it easier to find, not newly readable. Its clone here is
a full clone of 76 commits, and the same blob scan over its 401 blobs found **zero** hits of any pattern; its
only `.env`-shaped path is `.npmrc`.

## What is public, is not a secret, and the owner may still not have intended

1. **The author's email.** All 287 commits are authored and committed by `XZNON <shivaliksingh09@gmail.com>`.
   Commit metadata is permanent and now world-readable.
2. **Real spend.** `docs/context.md`, `JOURNAL.md` and `docs/research/yield-baseline.md` publish the cost of
   every one of the 52 runs, the ~55¢ per reel, the 250¢ ceiling, and which provider calls were wasted.
3. **The provider and model choices.** MiniMax `chat/completions` and `t2a_v2`, fal `flux-2-pro/edit` and
   `minimax-h3-turbo`, with endpoints and request shapes.
4. **The engine's measured yield.** 8 reels from 52 runs, and every refusal reason.
5. **`BUDGET.md` and the founding research**, through the submodule.

## What is on this machine and is not published

| thing                                    | published?                                         |
| ---------------------------------------- | -------------------------------------------------- |
| 16 `refs/codex/turn-diffs/checkpoints/*` | **no** — `ls-remote` shows only `refs/heads/main`  |
| ~20 dangling commits, trees and blobs    | **no** — unreachable, and never pushed             |
| `1cfc90e`, `de22116` on local `main`     | **not yet** — `origin/main` is at `94ee04a`        |
| `.env`, `data/`, `.artifacts/`           | **no** — gitignored, and absent from all 599 paths |

`git push origin main` and `git push --all` do not publish `refs/codex/*`. **`git push --mirror` would.** Those
refs were scanned with everything else and are clean, so this is a habit to avoid rather than a problem to fix.

## What has to happen

Nothing is urgent, because nothing was found. No key needs rotating and no history needs rewriting — and had a
key been found, the order would have been: rotate the key first, then decide about the history, and never treat
the scrub as the fix.

Worth doing, in this order:

1. **Turn on secret scanning and push protection** on both repositories, in Settings → Code security. D-022 was
   caught by push protection, not by a sweep: scanning for your own keys proves nothing about what a provider
   handed you, and the next presigned URL will arrive in a response no one is watching.
2. **Decide whether `BUDGET.md` and the founding research should be public.** They are, today, and that is the
   owner's call rather than an accident to correct quietly.
3. **Prune the local `refs/codex/*` refs**, or simply never run `git push --mirror` from this clone.
4. **Re-run this audit before any history rewrite is ever considered**, since a rewrite changes every commit id
   and invalidates every `Verification-Tree` trailer S-177 depends on.

## Reproducing it

The scanners are not committed: they are three throwaway Node scripts, and a committed scanner would become a
check this repository has to maintain without a gate. What is committed is the list of patterns above and the
commands in the table, which is enough to write them again. The counts to expect at `de22116`: 1857 blobs, 287
commits, 599 paths, 18 refs, 0 tags, 5 distinct `sk-` fixtures, 0 JWTs, 1 blob skipped as binary.
