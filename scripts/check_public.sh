#!/usr/bin/env bash
# Guard for the public engine repository.
#
# 1. Stop list: names of third-party franchises and private tenants must never land here.
#    The list is base64-encoded so that this script itself does not contain the words.
#    Add more words with EXTRA_STOPLIST="word1,word2" or a local, untracked .stoplist file.
# 2. Secrets: Telegram bot tokens, database URLs with passwords, private keys, GitHub tokens.
#
# Scans tracked files (git ls-files) plus staged changes. Exit code 1 blocks the push / CI job.
set -euo pipefail
export LC_ALL=C.UTF-8

cd "$(git rev-parse --show-toplevel)"

STOPLIST_B64="0KHRgtCw0YDQugrQm9Cw0L3QvdC40YHRgtC10YAK0JLQtdGB0YLQtdGA0L7RgQrQotCw0YDQs9Cw0YDQuNC10L0KU3RhcmsKTGFubmlzdGVyCldlc3Rlcm9zClRhcmdhcnllbgpibGFja3RpeWFyCtC80LXQudGB0YLQtdGACm1hZXN0ZXIK0JjQs9GA0LAg0L/RgNC10YHRgtC+0LvQvtCyCkdhbWUgb2YgVGhyb25lcwrQn9C10YHQvdGMINC70YzQtNCwCkhvdXNlIG9mIHRoZSBEcmFnb24K0JTQvtC8INCU0YDQsNC60L7QvdCwCg=="

words_file="$(mktemp)"
trap 'rm -f "$words_file"' EXIT
echo "$STOPLIST_B64" | base64 -d >"$words_file"
if [[ -n "${EXTRA_STOPLIST:-}" ]]; then tr ',' '\n' <<<"$EXTRA_STOPLIST" >>"$words_file"; fi
if [[ -f .stoplist ]]; then cat .stoplist >>"$words_file"; fi
sed -i '/^[[:space:]]*$/d' "$words_file"

# Binary files and lock files are skipped; this script is skipped because it holds only the encoded list.
mapfile -t files < <(git ls-files -co --exclude-standard | grep -vE '(^|/)(package-lock\.json|.*\.(png|jpg|jpeg|webp|ico|woff2?|ttf))$' | grep -vx 'scripts/check_public.sh' || true)

fail=0
if ((${#files[@]})); then
  # -i is case-insensitive for Cyrillic too under a UTF-8 locale
  if hits=$(grep -n -i -F -f "$words_file" -- "${files[@]}" 2>/dev/null); then
    echo "check_public: stop-list words found (third-party IP / private tenant data):" >&2
    echo "$hits" | sed 's/^/  /' >&2
    fail=1
  fi

  secret_re='([0-9]{8,10}:AA[A-Za-z0-9_-]{30,})|(postgres(ql)?(\+asyncpg)?://[^:/ ]+:[^@ ]{3,}@)|(-----BEGIN [A-Z ]*PRIVATE KEY-----)|(gh[pousr]_[A-Za-z0-9]{30,})|(github_pat_[A-Za-z0-9_]{30,})'
  if hits=$(grep -n -E -- "$secret_re" "${files[@]}" 2>/dev/null | grep -v 'user:password@' ); then
    echo "check_public: possible secrets found:" >&2
    echo "$hits" | sed 's/^/  /' >&2
    fail=1
  fi
fi

if ((fail)); then
  echo "check_public: FAILED. Remove the matches above before pushing." >&2
  exit 1
fi
echo "check_public: OK (${#files[@]} files scanned)"
