#!/usr/bin/env bash
# preflight-public-commit.sh
#
# Scans outgoing commits and their diffs for internal vocabulary or private
# workspace references that must NEVER appear in public TRAIL repositories.
#
# Usage:
#   scripts/preflight-public-commit.sh                 # check commits ahead of origin
#   scripts/preflight-public-commit.sh <range>         # check arbitrary range, e.g. HEAD~3..HEAD
#
# Used as pre-push hook; also safe to run manually before a force-push.
#
# Exits 1 on first detected leak. Exits 0 when clean.

set -u

RANGE="${1:-}"
if [ -z "$RANGE" ]; then
  # default: everything on the current branch not yet on its upstream
  if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    RANGE="$(git rev-parse --abbrev-ref --symbolic-full-name @{u})..HEAD"
  else
    RANGE="HEAD~1..HEAD"
  fi
fi

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YLW=$'\033[0;33m'
NC=$'\033[0m'

echo "${YLW}[preflight]${NC} scanning range: $RANGE"

FAIL=0

# Banned regex patterns. Each line: <label>|<regex>
PATTERNS=$(cat <<'EOF'
notion-url|notion\.so/[a-zA-Z0-9_-]*[a-f0-9]{32}
private-notion-page-id|\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b
private-roadmap-filename|TRAIL_Roadmap_v[0-9]
private-projektgedaechtnis|TRAIL_Projektgedaechtnis
private-eisenhower-file|eisenhower_(prioritaeten|trail)
private-workspace-path|/Users/chrisho/
private-sales-disrupt-path|Sales Disrupt
tsai-gmbh-framing|TrailSign AI GmbH
private-email-trailsignai|@trailsignai\.com
private-email-gmail|christian\.hommrich@gmail\.com
internal-superspreading|[Ss]uperspreading
internal-projektgedaechtnis|[Pp]rojektgedaechtnis
internal-founding-slots|[Ff]ounding [Ss]lots
internal-dogfooding|[Dd]ogfooding
internal-flywheel|\b[Ff]lywheel\b
internal-kunden-deliverable|Kunden-Deliverable
EOF
)

check_text() {
  local label="$1"
  local text="$2"
  while IFS='|' read -r pat_label pat_regex; do
    [ -z "$pat_label" ] && continue
    # shellcheck disable=SC2086
    if echo "$text" | grep -E -n "$pat_regex" >/dev/null 2>&1; then
      echo "${RED}[LEAK]${NC} $label :: pattern=$pat_label"
      echo "$text" | grep -E -n "$pat_regex" | sed 's/^/    /'
      FAIL=1
    fi
  done <<< "$PATTERNS"
}

# 1) commit messages in range
MSGS=$(git log --format='----COMMIT %H%n%B' "$RANGE" 2>/dev/null || true)
if [ -n "$MSGS" ]; then
  check_text "commit-message($RANGE)" "$MSGS"
fi

# 2) diffs in range
DIFF=$(git diff "$RANGE" 2>/dev/null || true)
if [ -n "$DIFF" ]; then
  # Skip the T[0-9] eisenhower pattern inside diff context lines that are
  # legitimately discussing protocol terms. We only flag it in +added lines.
  ADDED_ONLY=$(echo "$DIFF" | grep -E '^\+' | grep -Ev '^\+\+\+')
  check_text "added-lines($RANGE)" "$ADDED_ONLY"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "${GRN}[preflight]${NC} OK — no internal vocabulary detected in $RANGE"
  exit 0
else
  echo ""
  echo "${RED}[preflight]${NC} FAIL — fix the flagged strings before pushing."
  echo "  Tip: amend with ${YLW}git commit --amend${NC} (last commit) or"
  echo "       rebase --exec to edit older commits."
  exit 1
fi
