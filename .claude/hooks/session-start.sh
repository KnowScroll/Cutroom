#!/usr/bin/env bash
# Runs at session start AND after /compact, so a session cannot begin uninformed and cannot
# forget after a context reset. Everything printed here lands in the context before turn one.
#
# It is deliberately short and deliberately fast: the pin, the boundaries, where things stand
# (docs/context.md, S-160), the last commits. Not the test suite, and not the journal: its entries
# run to a hundred lines, and everything printed here is re-read on every call of the session.
cd "$(dirname "$0")/../.." || exit 0

echo "==================== Cutroom ===================="
echo
echo "  The reel engine. Brief -> plan -> approved stills -> finished video."
echo "  Later: one consumer of Cutroom's core, which is not built yet."
echo

echo "---------------- the authority ----------------"
# steering/DECISIONS.md lives in the KnowScroll repository (D-088) and does not move.
# This prints which commit of it we can currently see, and whether that is stale.
node scripts/decisions.mjs 2>&1 | sed 's/^/  /'

echo
echo "---------------- boundaries ----------------"
node scripts/drift.mjs 2>&1 | sed 's/^/  /'

echo
echo "---------------- where things stand (docs/context.md) ----------------"
if [ -f docs/context.md ]; then
  # The one section, from its heading to the next; the runs and the changes are read when needed.
  awk '/^## Where things stand$/ { on = 1; next } /^## / { on = 0 } on' docs/context.md
else
  echo "  (no docs/context.md)"
fi
# One line, so the journal's newest entry is named without being read.
NEWEST="$(grep '^## [0-9]' JOURNAL.md 2>/dev/null | tail -1)"
[ -n "$NEWEST" ] && echo "  journal's newest entry: $(printf '%s' "$NEWEST" | cut -c4-)"
echo
echo "---------------- last 5 commits ----------------"
git log -5 --oneline 2>/dev/null || echo "  (no commits yet)"

echo
echo "================================================================"
echo "  Gates before code. No implementation file for a feature whose"
echo "  four planning gates are not approved. The engine's gates are"
echo "  reviewed in the steering repository, not here."
echo
echo "  pnpm is NOT on this machine's PATH. Use: corepack pnpm <script>"
echo "  or run the scripts directly: node scripts/check.mjs"
echo
echo "  Before you stop: a JOURNAL.md entry, and this session's entry in"
echo "  docs/context.md. The stop-gate and tests/context-file.test.ts check."
echo "================================================================"
exit 0
