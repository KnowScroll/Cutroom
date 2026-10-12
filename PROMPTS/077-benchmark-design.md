# 077 — design the benchmark that every later fix is measured against

- **For:** session 83
- **Feature:** a new one, slug to be chosen in the session; nothing else is worked on
- **Work:** design and specify the benchmark — four gates written and reviewed, the `S-` entry
  drafted. No implementation of any kind
- **Written:** 2026-10-12
- **Run:** session 83, 2026-10-12

```text
Read docs/context.md first, then session 82's two new documents: docs/research/yield-baseline.md and
docs/features/picture-prompt.md. They are the reason for this session.

Design a benchmark. Do not build it. No implementation file, no script, not even a throwaway one — this
session thinks the thing through and writes it down. The deliverable is a feature document in
docs/features/ with all four gates written, sent to the gate-reviewer and carried through its rounds, plus
the S- entry drafted for the choices it settles. Gates before code, as always.

What the benchmark is for: we are about to change the engine to raise its yield, starting with the picture
prompt. Right now we have no way to tell whether a change helped. The baseline we have — 8 of 52 runs
produced a reel, Gate 1 refusing 53% of pictures — was measured across runs made on different briefs while
the engine itself was changing. It is a historical record, not a controlled measurement, and no fix can be
attributed against it. The benchmark has to fix that.

Settle at least these, each as a real choice with what was rejected:

1. What one benchmark run is. Stills only, a full reel, or tiers of each — and what each tier can and
   cannot detect. A stills-only pass cannot see Gate 5, Gate 7 or the take ladder.
2. The fixed brief set: how many briefs, chosen how, and frozen where. They must span the failure
   families we actually have — lettering, many-thing subjects, crowded shots, screens and hardware — or
   the benchmark will be blind to the thing being fixed.
3. Repeats and the threshold. Providers are not deterministic. S-149 set the pattern — six runs, keep the
   change only at three of six and baseline plus three, decided before the first call. Say what the
   equivalent is here, and say it before any number is measured.
4. What is recorded. At minimum the measures in yield-baseline.md: completion rate; Gate 1 refusal rate
   overall and split by subjects named in the shot; Gate 5 and Gate 7 rates; reason families; degraded
   shots; image calls used of the six; the text-to-video share; cost; and wall clock per stage.
5. Where results live. Reusing the run/picture/take rows with a marker, a separate table, or files outside
   the database. A benchmark pass must not pollute the real-run record that refusals.md and
   yield-baseline.md are read from, and nothing generated may be committed.
6. How a result is bound to what produced it. This repository already binds evidence to an exact tree
   (S-177, scripts/verification-status.mjs). Decide whether a benchmark result carries the same binding,
   and what makes two results comparable.
7. Money, and who agrees to spend it. A reel is about 55¢ against a 250¢ per-reel cap (D-014, D-100); a
   picture is 5¢; planner calls are free under the Token Plan (S-129). Price one benchmark pass, give it a
   ceiling, and say how it is confirmed — paid runs are confirmed by hand here.
8. Whether stand-in providers can carry any part of it. They do not reproduce the failures we are
   measuring. If the answer is no, write that down rather than leaving it assumed.
9. Whether anything can be re-judged from artifacts already on disk instead of regenerated. Cheap if it
   works, and it would let a gate or prompt change be scored without buying new pictures. Say what it can
   and cannot catch.
10. How this differs from scripts/journey.mjs. That proves a feature's checks pass; this measures how well
    the engine works. Say whether any of it is shared and why.

Hard limits. The benchmark never weakens a gate, loosens a check, raises a cap, or edits a brief to make a
number look better — CLAUDE.md rule 3 holds here exactly as it does in a slice. It changes no engine
behaviour at all: if designing it turns up something that must change in the engine, that is a finding to
report, not work to do in this session.

Do not start picture-prompt. Do not start the subjects-per-shot cap or a-picture-for-every-shot. Those wait
for the benchmark to exist, which is the whole point of doing this first.

Before you stop: the JOURNAL.md entry and this session's entry in docs/context.md, and set this prompt's
Run line.
```
