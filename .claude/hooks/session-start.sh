#!/usr/bin/env bash
# Runs at session start AND after /compact, so a session cannot begin uninformed and cannot
# forget after a context reset. Everything printed here lands in the context before turn one.
#
# It is deliberately short and deliberately fast: the pin, the boundaries, the last journal
# entries, the last commits. Not the test suite.
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
echo "---------------- last 2 journal entries ----------------"
if [ -f JOURNAL.md ]; then
  # Start at the second-to-last entry heading, or the last one when there is only one.
  # The steering repository's version of this splits on a record separator and drops the
  # first record, which prints NOTHING for a journal with a single entry — exactly the
  # state a new repository is in, and exactly when a session most needs to read it.
  START="$(grep -n '^## ' JOURNAL.md | tail -2 | head -1 | cut -d: -f1)"
  if [ -n "$START" ]; then
    tail -n +"$START" JOURNAL.md | head -n 60
  else
    echo "  (no entries yet)"
  fi
else
  echo "  (no journal yet)"
fi

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
echo "  Write a JOURNAL.md entry before you stop. The stop-gate checks."
echo "================================================================"
exit 0
