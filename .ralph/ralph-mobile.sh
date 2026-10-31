#!/usr/bin/env bash
# Ralph 移动波（mobile-app 分支）单 lane 循环。用法: bash .ralph/ralph-mobile.sh <tasks-file> <lane-tag>
# 与 ralph.sh 相同机制，任务文件改为 tasks-mobile/ 目录。
set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
TASKS_FILE="tasks-mobile/$1"
LANE="$2"
LOG=".ralph/logs/$LANE.log"
ZCODE_CJS="/d/Program Files/zcode/resources/glm/zcode.cjs"

TIMEOUT_BIN=""
if command -v timeout >/dev/null 2>&1 && timeout --version >/dev/null 2>&1; then
  TIMEOUT_BIN="$(command -v timeout)"
fi

now=$(date +%s)
today8=$(date -d "today 08:00" +%s)
if [ "$now" -lt "$today8" ]; then DEADLINE=$today8; else DEADLINE=$(date -d "tomorrow 08:00" +%s); fi
echo "[$(date '+%F %T')] lane $LANE start; deadline: $(date -d "@$DEADLINE" '+%F %T')" >> "$LOG"

fails=0
while true; do
  if [ -f .ralph/STOP ]; then echo "[$(date '+%F %T')] STOP found -> exit" >> "$LOG"; exit 0; fi
  now=$(date +%s)
  if [ "$now" -ge "$DEADLINE" ]; then echo "[$(date '+%F %T')] DEADLINE reached -> exit" >> "$LOG"; exit 0; fi

  sed -i 's/^- \[~\]/- [ ]/' "$TASKS_FILE"
  line=$(grep -n '^- \[ \]' "$TASKS_FILE" | head -1 | cut -d: -f1)
  if [ -z "$line" ]; then echo "[$(date '+%F %T')] lane $LANE ALL DONE" >> "$LOG"; exit 0; fi
  sed -i "${line}s/^- \[ \]/- [~]/" "$TASKS_FILE"
  echo "[$(date '+%F %T')] lane $LANE pick task at line $line" >> "$LOG"

  PROMPT="You are lane worker '$LANE' in the mobile-app ralph loop (branch: mobile-app). Your cwd is the project root.
MUST READ FIRST with your file tools: AGENTS.md, and $TASKS_FILE.
YOUR TASK: do exactly the ONE item currently marked '- [~]' in $TASKS_FILE, end to end. Do not start any other task.
Follow AGENTS.md strictly: file ownership, Simplified Chinese text, git commit steps with index.lock retry (commit message tag [laneM*]).
Hard acceptance gate: cd app && npm run build must pass with 0 errors. If the build fails with ENOTEMPTY/EPERM on dist (concurrent writes), wait 5 seconds and retry once before judging.
When done: flip your checkbox from '- [~]' to '- [x]' in $TASKS_FILE, append one progress line (time + task name) to .ralph/logs/$LANE.log, run git add -A and git commit, then STOP.
If the file .ralph/STOP exists, do nothing and exit immediately."

  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" 2700 node "$ZCODE_CJS" -p "$PROMPT" --mode yolo --locale zh-CN --no-color >> "$LOG" 2>&1
  else
    node "$ZCODE_CJS" -p "$PROMPT" --mode yolo --locale zh-CN --no-color >> "$LOG" 2>&1
  fi
  rc=$?
  echo "[$(date '+%F %T')] lane $LANE zcode exit=$rc" >> "$LOG"

  if sed -n "${line}p" "$TASKS_FILE" | grep -q '^- \[x\]'; then
    fails=0
  else
    fails=$((fails+1))
    echo "[$(date '+%F %T')] lane $LANE task not completed (fail $fails/3)" >> "$LOG"
    if [ "$fails" -ge 3 ]; then
      sed -i "${line}s/^- \[~\]/- [!]/" "$TASKS_FILE"
      echo "[$(date '+%F %T')] lane $LANE task BLOCKED at line $line" >> "$LOG"
      fails=0
      git add -A >/dev/null 2>&1; git commit -m "[${LANE}] blocked task" >/dev/null 2>&1
    fi
  fi
  sleep 10
done
