#!/usr/bin/env bash
# Design guard for frontend/src: fails on the usual "AI dashboard" look.
#   gradients (except the paper vignette in paper.css), blur and glass, glow and coloured shadows,
#   big radii and pills (except the avatar medallion and radio buttons), third-party icon packs,
#   emoji in the UI (the share-text module is exempt: chats expect 🟩🟨⬛), Cinzel/Manrope/Inter.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SRC="${1:-frontend/src}"
fail=0

check() { # $1 description, $2 regex, $3 grep exclude regex for files (optional)
  local hits
  hits=$(grep -rnE --include='*.ts' --include='*.tsx' --include='*.css' --exclude-dir=__tests__ -- "$2" "$SRC" | grep -vE "${3:-^$}" || true)
  if [[ -n "$hits" ]]; then
    echo "check_design: $1" >&2
    echo "$hits" | sed 's/^/  /' >&2
    fail=1
  fi
}

check "gradients" 'linear-gradient|radial-gradient|conic-gradient|bg-gradient' 'paper\.css:'
check "blur / glass" 'backdrop-filter|backdrop-blur|blur\(|feGaussianBlur|blur-(sm|md|lg|xl|2xl|3xl)'
check "glow and coloured shadows" 'text-shadow|drop-shadow|shadow-\[0_0|glow'
check "big radii and pills" 'rounded-(xl|2xl|3xl)|rounded-full' 'components/Avatar\.tsx:|components/ui\.tsx:.*(Radio|h-2 w-2|h-\[18px\])'
check "third-party icon packs" "from ['\"](lucide-react|@heroicons|react-icons)"
check "fonts we do not use" 'Cinzel|Manrope|"Inter"|Inter,'

# emoji: Extended_Pictographic, everywhere except the share-text module
emoji=$(python3 - "$SRC" <<'PY'
import re, sys, pathlib
pat = re.compile(r"[\U0001F000-\U0001FAFF☀-⛿✀-➿⬀-⯿️]")
allowed = {"✓", "✔"}  # the ledger marks are typographic ticks, not pictographs
for p in pathlib.Path(sys.argv[1]).rglob("*.ts*"):
    if p.name == "share.ts":
        continue
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        found = [c for c in pat.findall(line) if c not in allowed]
        if found:
            print(f"{p}:{i}: {''.join(found)}")
PY
)
if [[ -n "$emoji" ]]; then
  echo "check_design: emoji in the UI" >&2
  echo "$emoji" | sed 's/^/  /' >&2
  fail=1
fi

if ((fail)); then
  echo "check_design: FAILED" >&2
  exit 1
fi
echo "check_design: OK"
