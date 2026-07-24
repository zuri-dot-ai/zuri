#!/usr/bin/env bash
# Compress public/onboarding/onboarding-hero.mp4 to a web-safe ~2–3MB loop.
# Requires ffmpeg on PATH. See public/onboarding/README.md for diagnosis notes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/onboarding/onboarding-hero.mp4"
TMP="$ROOT/public/onboarding/onboarding-hero.tmp.mp4"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found on PATH. Install it, then re-run this script." >&2
  exit 1
fi

ffmpeg -y -i "$SRC" \
  -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p \
  -vf "scale='min(1280,iw)':-2" -movflags +faststart \
  "$TMP"

BYTES=$(wc -c < "$TMP" | tr -d ' ')
echo "Compressed size: $BYTES bytes"
if [ "$BYTES" -gt 3500000 ]; then
  echo "Still over 3.5MB — try -crf 30 or a shorter clip before replacing." >&2
  exit 1
fi

mv "$TMP" "$SRC"
echo "Replaced $SRC"
