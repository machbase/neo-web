#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
AGENT_LOCAL_DIR="$REPO_ROOT/agent_local"

mkdir -p "$AGENT_LOCAL_DIR"

write_if_missing() {
  FILE_PATH=$1
  TITLE=$2

  if [ ! -f "$FILE_PATH" ]; then
    printf '# %s\n\n' "$TITLE" > "$FILE_PATH"
  fi
}

write_if_missing "$AGENT_LOCAL_DIR/README.md" "Agent Local"
write_if_missing "$AGENT_LOCAL_DIR/PlanningReview.md" "Planning Review"
write_if_missing "$AGENT_LOCAL_DIR/DecisionLog.md" "Decision Log"
write_if_missing "$AGENT_LOCAL_DIR/FuturePotentialChanges.md" "Future Potential Changes"
write_if_missing "$AGENT_LOCAL_DIR/TestPlan.md" "Test Plan"
write_if_missing "$AGENT_LOCAL_DIR/BreakTests.md" "Break Tests"
write_if_missing "$AGENT_LOCAL_DIR/ImplementationLog.md" "Implementation Log"
write_if_missing "$AGENT_LOCAL_DIR/ReportToUser.md" "Report To User"

if [ ! -f "$AGENT_LOCAL_DIR/NotificationTopic.md" ]; then
  printf '# Notification Topic\n\ntopic: ASK_USER_AND_SET_ONCE\n' > "$AGENT_LOCAL_DIR/NotificationTopic.md"
fi

echo "Initialized agent_local at $AGENT_LOCAL_DIR"
echo "After setting agent_local/NotificationTopic.md, run ./agent_workflow_configure/SendCompletionNotification.sh NotificationSetup once to approve the reusable notification command."
