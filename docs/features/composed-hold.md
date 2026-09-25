---
status: current
authority: plan
---

# composed-hold — a shot held on its approved picture is animated by code, not only pushed in

Status: planned
Gates: product pending · architecture pending · program-design pending · slices pending

> **Created 2026-09-25 at the owner's request** (S-166), in session 52, from `docs/research/hyperframes.md` §4 A and §8.
> **Its gates come before `diagram-shots`'**: it builds the port, the headless-Chrome adapter, its stand-in and its
> startup check that the diagram shots reuse.
>
> **Its gates are not written.** This file records what the owner chose and what the gates must settle. No
> implementation file until all four are approved by an adversarial reviewer.

## What the owner chose (S-166)

A shot held on its approved picture (D-025, S-090, S-097) is composed by code over that picture — the kind of motion
the research spike made in §3 — where today it is pushed in. Words on screen, if any, come only from the narration and
the brief's criteria texts. Headless Chrome is a machine dependency like ffmpeg: on PATH, never installed or pathed by
this repository, behind a port, checked when a worker starts that has a feature needing it switched on.

## What the gates must settle

1. **What a composition may do to a held picture**, and which of S-097's push-in rules it supersedes (D-059's render
   manifest carries it).
2. **The port**: its shape, its stand-in (writing a real clip through ffmpeg alone, as the other stand-ins do), and
   where Chrome is found and checked (S-075's form).
3. **How a composed hold is checked** before assembly — Gate 2's scan, and what else — and how Gate 7 sees it.
4. **Determinism and repeatability** (§3 measured 47.2 dB between one worker and two), and the render's time on this
   machine.
5. **Which verified checks it moves**, found by `test-impact` first.

## Evidence (newest first; appended by the journey, never typed by hand)

## Divergence (the first broken boundary, or "none")

none

## Deferred

1. **Parallel shots** (D-023, S-115) — held by the owner.
