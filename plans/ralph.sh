#!/bin/bash
# ============================================
# RALPH WIGGUM LOOP — Claude Code + Codex Review
# ============================================
# Usage: ./plans/ralph.sh <max-iterations>
# Example: ./plans/ralph.sh 10
#
# The full cycle:
#   1. Claude Code reads PRD + progress → picks next task → implements
#   2. TypeScript check (feedback loop)
#   3. Build check (feedback loop)
#   4. Codex reviews the changes (reviewer loop)
#   5. Claude Code fixes Codex findings (if any)
#   6. Final build verify
#   7. Git commit
#   8. Update progress.txt
#   9. Repeat until COMPLETE
# ============================================

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <max-iterations>"
  echo "Example: $0 10"
  exit 1
fi

MAX_ITERATIONS=$1
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PRD="$PROJECT_DIR/plans/prd.md"
PROGRESS="$PROJECT_DIR/plans/progress.txt"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

cd "$PROJECT_DIR"

echo "============================================"
echo "🔄 RALPH WIGGUM LOOP"
echo "   Project: $PROJECT_DIR"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   PRD: $PRD"
echo "============================================"

for ((i=1; i<=$MAX_ITERATIONS; i++)); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔁 ITERATION $i / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # ==========================================
  # STEP 1: Claude Code — Implement next task
  # ==========================================
  echo ""
  echo "🤖 [STEP 1] Claude Code: Implementing..."

  CLAUDE_PROMPT="You are working on the S&OP Dashboard project.

Read these files carefully:
@plans/prd.md
@plans/progress.txt

Instructions:
1. Look at the PRD and find the NEXT unchecked task (marked with - [ ])
2. Skip any tasks that progress.txt says are already done
3. Implement ONLY that ONE task completely
4. After implementing, run these checks:
   - npx tsc --noEmit (must pass)
   - npm run build (must pass)
5. If checks fail, fix the issues before continuing
6. Mark the task as done in prd.md by changing - [ ] to - [x]
7. Append your progress to plans/progress.txt with format:
   [Iteration $i] [$TIMESTAMP] — Task X.Y: <description of what you did>
   Files changed: <list>
   Checks: tsc ✅/❌ | build ✅/❌
8. Git add and commit your changes with a descriptive message

If ALL tasks in the PRD are already marked [x] (complete), output:
<promise>COMPLETE</promise>

IMPORTANT: Only work on ONE task per iteration. Be thorough but focused."

  result=$(claude -p "$CLAUDE_PROMPT" --allowedTools "Edit,Write,Bash(npm run build),Bash(npx tsc*),Bash(git add*),Bash(git commit*),Bash(git status),Bash(npm test*),Bash(npm install*),Bash(npm prune*),Read,Glob,Grep" 2>&1)

  echo "$result"

  # Check for completion
  if echo "$result" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "============================================"
    echo "🎉 ALL TASKS COMPLETE!"
    echo "============================================"
    exit 0
  fi

  # ==========================================
  # STEP 2: Feedback loops — Type check + Build
  # ==========================================
  echo ""
  echo "🔍 [STEP 2] Feedback loops..."

  echo "  → TypeScript check..."
  if npx tsc --noEmit 2>&1; then
    echo "  ✅ TypeScript: PASS"
    TSC_STATUS="PASS"
  else
    echo "  ❌ TypeScript: FAIL"
    TSC_STATUS="FAIL"
  fi

  echo "  → Build check..."
  if npm run build 2>&1 | tail -5; then
    echo "  ✅ Build: PASS"
    BUILD_STATUS="PASS"
  else
    echo "  ❌ Build: FAIL"
    BUILD_STATUS="FAIL"
  fi

  # ==========================================
  # STEP 3: Codex Review — Find bugs & issues
  # ==========================================
  echo ""
  echo "🔎 [STEP 3] Codex: Reviewing changes..."

  # Get the diff of what Claude just changed
  DIFF=$(git diff HEAD~1 --stat 2>/dev/null || echo "No previous commit to diff")
  CHANGED_FILES=$(git diff HEAD~1 --name-only 2>/dev/null || echo "")

  if [ -n "$CHANGED_FILES" ]; then
    CODEX_PROMPT="Review the following code changes for bugs, security issues, and improvements. Be specific and actionable. Focus on:
1. Logic errors or broken functionality
2. Missing null checks or error handling
3. TypeScript type mismatches
4. Dark mode issues (hardcoded colors)
5. Unused imports or dead code
6. Performance issues (missing useMemo deps, unnecessary re-renders)

Files changed:
$CHANGED_FILES

Changed files diff summary:
$DIFF

Read each changed file and provide a concise list of issues found. If no issues, say 'NO_ISSUES_FOUND'."

    codex_result=$(npx codex -p "$CODEX_PROMPT" --approval-mode full-auto 2>&1 || echo "Codex review skipped")

    echo "$codex_result" | tail -20
  else
    echo "  ⏭️  No files changed, skipping review"
    codex_result="NO_ISSUES_FOUND"
  fi

  # ==========================================
  # STEP 4: Claude fixes Codex findings (if any)
  # ==========================================
  if echo "$codex_result" | grep -qv "NO_ISSUES_FOUND"; then
    echo ""
    echo "🔧 [STEP 4] Claude Code: Fixing Codex findings..."

    FIX_PROMPT="Codex reviewed your recent changes and found these issues:

$codex_result

Fix ALL the issues listed above. Then verify:
- npx tsc --noEmit passes
- npm run build passes

Git commit the fixes with message: 'fix: address codex review findings (iteration $i)'

If there are no real issues (false positives), just say SKIPPED."

    fix_result=$(claude -p "$FIX_PROMPT" --allowedTools "Edit,Write,Bash(npm run build),Bash(npx tsc*),Bash(git add*),Bash(git commit*),Bash(git status),Read,Glob,Grep" 2>&1)

    echo "$fix_result" | tail -10
  else
    echo "  ✅ No issues found by Codex"
  fi

  # ==========================================
  # STEP 5: Final verification
  # ==========================================
  echo ""
  echo "✅ [STEP 5] Final verification..."

  if npm run build 2>&1 | grep -q "Compiled successfully"; then
    echo "  ✅ Final build: PASS"
  else
    echo "  ⚠️  Final build: FAIL — will be picked up next iteration"
  fi

  echo ""
  echo "  Iteration $i complete. Moving to next..."
  echo ""
done

echo ""
echo "============================================"
echo "⏰ Max iterations ($MAX_ITERATIONS) reached."
echo "   Check plans/progress.txt for status."
echo "============================================"
