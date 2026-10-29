#!/usr/bin/env bash
# Ralph 总启动器：4 条 lane 并行，全部退出后结束。删除 .ralph/STOP 文件可随时叫停。
cd "$(dirname "$0")/.." || exit 1
rm -f .ralph/STOP
mkdir -p .ralph/logs
echo "[$(date '+%F %T')] ralph-all start"
bash .ralph/ralph.sh lane-1-data.md lane1 &
bash .ralph/ralph.sh lane-2-chant.md lane2 &
bash .ralph/ralph.sh lane-3-rules-quiz.md lane3 &
bash .ralph/ralph.sh lane-4-review-polish.md lane4 &
wait
echo "[$(date '+%F %T')] ralph-all: all lanes exited"
