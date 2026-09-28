#!/usr/bin/env bash
# Stop hook. Exit 2 blocks the session from ending and returns the message to the model.
#
# Two conditions:
#   1. JOURNAL.md changed this session. A session that leaves no journal entry is a session
#      whose reasoning is lost the moment the context resets — and the reasoning is the part
#      git history cannot reconstruct.
#   2. Source work is committed with verification evidence for its exact tree. The checker itself
#      decides whether that evidence was targeted or full (S-177); the hook never reruns a suite.
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

# --- 2. source must be committed; HEAD must carry evidence for its exact tree ---
CHANGED_SOURCE="$(git status --porcelain -- packages apps tests scripts 2>/dev/null)"
if [ -n "$CHANGED_SOURCE" ]; then
  PROBLEMS="${PROBLEMS}  - source files are still uncommitted. Run the approved --slice or full check, commit its Verification trailers, then stop.\n"
fi
if ! OUTPUT="$(node scripts/verification-status.mjs 2>&1)"; then
  PROBLEMS="${PROBLEMS}  - HEAD has no valid commit-tree verification evidence:\n"
  PROBLEMS="${PROBLEMS}$(printf '%s' "$OUTPUT" | tail -n 25 | sed 's/^/      /')\n"
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
