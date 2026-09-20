#!/usr/bin/env bash
#
# Scrub leaked secrets and ~190 MB of node_modules out of ALL git history.
#
# ============================================================================
# READ THIS FIRST — rewriting history does NOT un-expose a secret.
# ============================================================================
#
# The Apps Script URL, the API password and the app PIN were committed in
# src/constants.js (commit 8ce1dd68) and pushed to a PUBLIC repository:
#
#     https://github.com/iNiketan/budgetApp
#
# Forks, clones, GitHub's internal caches, search-engine crawlers and anyone
# who already ran `git log -p` are NOT affected by this script. This script
# only stops the leak from continuing into new clones.
#
# So do this in order:
#
#   1. ROTATE the Apps Script password.
#      Google Sheet -> Extensions -> Apps Script -> change the password
#      constant -> Deploy -> Manage deployments -> pencil icon -> Version: New
#      version -> Deploy.
#      NOTE: a plain Save does NOT take effect. This trips people up constantly.
#
#   2. ROTATE the PIN, and update .env with both new values.
#      chmod 600 .env
#
#   3. Rebuild the APK. Every APK built before the rotation still contains the
#      old password in plain text (Expo inlines EXPO_PUBLIC_* into the bundle).
#      Anyone holding an old APK can still read the old credentials.
#
#   4. Then run this script, and force-push.
#
#   5. Consider making the repository private, or deleting and recreating it.
#      That is the only way to drop GitHub's cached copies of the old commits.
#
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; RST=$'\033[0m'
say()  { printf '%s\n' "$*"; }
warn() { printf '%s%s%s\n' "$YEL" "$*" "$RST"; }
err()  { printf '%s%s%s\n' "$RED" "$*" "$RST"; }
ok()   { printf '%s%s%s\n' "$GRN" "$*" "$RST"; }

# ---------------------------------------------------------------- guard rails

if [[ ! -f .env ]]; then
  err "No .env found in $REPO_ROOT."
  err "This script needs it to know which strings to scrub."
  err "Restore .env (or create it from .env.example) and re-run."
  exit 1
fi

if [[ -n "$(git status --porcelain -- ':!node_modules' | head -n1)" ]]; then
  warn "Working tree has uncommitted changes outside node_modules."
  warn "Commit or stash them first — filter-repo refuses to run on a dirty tree."
  exit 1
fi

ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ -z "$ORIGIN_URL" ]]; then
  warn "No 'origin' remote found. You will need to re-add it after the rewrite."
fi

# --------------------------------------------------------------- confirmation

say ""
warn "This rewrites EVERY commit in this repository and force-pushes the result."
warn "Have you already rotated the Apps Script password and the PIN?"
say ""
read -r -p "Type exactly 'I have rotated the secrets' to continue: " CONFIRM
if [[ "$CONFIRM" != "I have rotated the secrets" ]]; then
  err "Aborted. Rotate first — history rewriting alone does not revoke anything."
  exit 1
fi

# ------------------------------------------------------------------- backups

BACKUP="../$(basename "$REPO_ROOT")-backup-$(date +%Y%m%d-%H%M%S).git"
say ""
say "Creating a full mirror backup at: $BACKUP"
git clone --mirror . "$BACKUP"
ok "Backup created."

# --------------------------------------------------------------- secret list

EXPRESSIONS="$(mktemp)"
trap 'rm -f "$EXPRESSIONS"' EXIT

# Strip the key names, keep the values. Values are written to a temp file that
# is deleted on exit, and never echoed to the terminal.
python3 - "$EXPRESSIONS" <<'PY'
import sys, re
out = sys.argv[1]
values = []
for line in open('.env', encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, val = line.split('=', 1)
    val = val.strip().strip('"').strip("'")
    if key.strip().startswith('EXPO_PUBLIC_') and len(val) >= 4:
        values.append(val)

with open(out, 'w', encoding='utf-8') as fh:
    for v in values:
        # filter-repo --replace-text syntax: <literal>==>replacement
        fh.write(f"{v}==>***REMOVED-ROTATED-SECRET***\n")
    # Blank out the whole of .env wherever it appears in history.
    fh.write("EXPO_PUBLIC_PASSWORD==>***REMOVED***\n")
    fh.write("EXPO_PUBLIC_PIN==>***REMOVED***\n")
    fh.write("EXPO_PUBLIC_SHEET_URL==>***REMOVED***\n")

print(f"prepared {len(values)} literal secret(s) plus key-name patterns", file=sys.stderr)
PY

# -------------------------------------------------------------- filter-repo

if ! command -v git-filter-repo >/dev/null 2>&1; then
  err "git-filter-repo is not installed."
  say ""
  say "Install it with any one of:"
  say "    pipx install git-filter-repo"
  say "    uv tool install git-filter-repo"
  say "    pip install --user git-filter-repo"
  say ""
  say "Then re-run this script."
  exit 1
fi

say ""
say "Rewriting history..."

# 1. Scrub every secret literal from every blob in every commit.
# 2. Drop node_modules (17,410 files) and build artifacts from history entirely.
git filter-repo --force \
  --replace-text "$EXPRESSIONS" \
  --path node_modules --invert-paths \
  --path-glob '*.apk' --invert-paths \
  --path-glob '*.aab' --invert-paths \
  --path-glob 'build-*' --invert-paths

ok "History rewritten."

# filter-repo strips the remote as a safety measure.
if [[ -n "$ORIGIN_URL" ]]; then
  git remote add origin "$ORIGIN_URL"
  say "Re-added origin: $ORIGIN_URL"
fi

# ------------------------------------------------------------------ verify

say ""
say "Verifying no secret survives in history..."
LEAKS=0
while IFS= read -r value; do
  [[ -z "$value" ]] && continue
  if git log --all -p --pickaxe-regex -S"$value" --format=%h 2>/dev/null | grep -q .; then
    err "  STILL PRESENT in history: (value withheld)"
    LEAKS=$((LEAKS + 1))
  fi
done < <(python3 -c "
for line in open('.env'):
    line=line.strip()
    if line.startswith('EXPO_PUBLIC_') and '=' in line:
        v=line.split('=',1)[1].strip().strip('\"').strip(\"'\")
        if len(v) >= 4: print(v)
")

if [[ "$LEAKS" -eq 0 ]]; then
  ok "Clean — no secret found in the rewritten history."
else
  err "$LEAKS secret(s) still present. Do NOT force-push; investigate first."
  exit 1
fi

say ""
say "Repo size now: $(du -sh .git | cut -f1)  (was ~197M)"
say ""
warn "NEXT STEP — force-push the rewritten history:"
say ""
say "    git push --force --all origin"
say "    git push --force --tags origin"
say ""
warn "Then tell anyone else with a clone to delete it and re-clone."
warn "Consider making the repo private, or deleting and recreating it on GitHub:"
warn "that is the only way to drop GitHub's cached copies of the old commits."
say ""
