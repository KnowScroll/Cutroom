#!/usr/bin/env bash
# Stop hook. Exit 2 blocks the session from ending and returns the message to the model.
#
# Two conditions:
#   1. JOURNAL.md changed this session. A session that leaves no journal entry is a session
#      whose reasoning is lost the moment the context resets — and the reasoning is the part
#      git history cannot reconstruct.
#   2. If any source file changed this session, the code checks must pass. "Done" with a red
#      typecheck is the failure this whole setup exists to make impossible.
cd "$(dirname "$0")/../.." || exit 0

TODAY="$(date +%Y-%m-%d)"
PROBLEMS=""

# --- 1. journal touched? ---
if git rev-parse HEAD >/dev/null 2>&1; then
  JOURNAL_DIRTY="$(git status --porcelain -- JOURNAL.md 2>/dev/null)"
  JOURNAL_TODAY="$(git log --since="$TODAY 00:00" --format=%H -- JOURNAL.md 2>/dev/null | head -1)"
  if [ -z "$JOURNAL_DIRTY" ] && [ -z "$JOURNAL_TODAY" ]; then
    PROBLEMS="${PROBLEMS}  - JOURNAL.md was not touched this session. Append one entry: date | session name | changed | observed | why | next.\n"
  fi
else
  [ -f JOURNAL.md ] || PROBLEMS="${PROBLEMS}  - JOURNAL.md does not exist.\n"
fi

# --- 2. did source change? then the code checks must be green ---
# Only the code checks (--code): the authority checks talk to another repository and can be
# red for reasons this session cannot fix, which would make the gate unpassable rather than
# informative.
CHANGED_SOURCE="$(git status --porcelain -- packages apps tests scripts 2>/dev/null)"
if [ -n "$CHANGED_SOURCE" ]; then
  if ! OUTPUT="$(node scripts/check.mjs --code 2>&1)"; then
    PROBLEMS="${PROBLEMS}  - source files changed and 'node scripts/check.mjs --code' is red:\n"
    PROBLEMS="${PROBLEMS}$(printf '%s' "$OUTPUT" | tail -n 25 | sed 's/^/      /')\n"
  fi
fi

if [ -n "$PROBLEMS" ]; then
  {
    echo "The stop-gate refuses to end this session:"
    echo ""
    printf "%b" "$PROBLEMS"
    echo ""
    echo "Fix these, then stop. Do not weaken a check or a test to get past this."
  } >&2
  exit 2
fi

exit 0
