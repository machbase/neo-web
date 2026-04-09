#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
TOPIC_FILE="${NOTIFICATION_TOPIC_FILE:-$REPO_ROOT/agent_local/NotificationTopic.md}"

if [ ! -f "$TOPIC_FILE" ]; then
  echo "Missing $TOPIC_FILE. Ask the user for the ntfy topic name and write it as 'topic: your_topic_name'." >&2
  exit 1
fi

TOPIC_NAME=$(sed -n 's/^[[:space:]]*topic[[:space:]]*:[[:space:]]*//p' "$TOPIC_FILE" | head -n 1)

case "$TOPIC_NAME" in
  ""|ASK_USER*)
    echo "The topic in $TOPIC_FILE is not configured yet. Ask the user for the ntfy topic name and save it there." >&2
    exit 1
    ;;
esac

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 TEAM_NAME" >&2
  exit 1
fi

TEAM_NAME=$1
MESSAGE="$TEAM_NAME task finished"

curl -d "$MESSAGE" "https://ntfy.sh/$TOPIC_NAME"
