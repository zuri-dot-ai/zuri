# Onboarding desktop hero (docs/01_ONBOARDING_V2.md �4)

Place these files in this folder:

| File | Role |
|------|------|
| `onboarding-hero.mp4` | Primary looping hero (H.264 / `avc1`, muted, short clip ~5�15s, **target 2�3MB**) |
| `onboarding-hero.png` (or `.jpg`) | Poster + fallback still (also used when `prefers-reduced-motion`) |

Served at:
- `/onboarding/onboarding-hero.mp4`
- `/onboarding/onboarding-hero.png`

Used only on desktop `lg`+ (`OnboardingHeroPanel`). Poster sits under the video; video fades in when `playing`. Transient decode/abort errors retry `load()`/`play()` (see component). `/start` layout preloads the MP4 so download begins before onboarding API bootstrap.

## Delivery diagnosis (2026-07)

| Check | Result |
|-------|--------|
| CSP `media-src` | Already allows `'self'` � same-origin MP4 is **not** blocked by CSP |
| Codec | File brands include `avc1` (H.264) � web-safe |
| Size | Uncompressed source can be ~20MB+ � **too heavy**; compress before shipping |

### Re-encode (requires ffmpeg on PATH)

```bash
# macOS/Linux:
bash scripts/compress-onboarding-hero.sh

# Or manually:
ffmpeg -y -i public/onboarding/onboarding-hero.mp4 \
  -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p \
  -vf "scale='min(1280,iw)':-2" -movflags +faststart \
  public/onboarding/onboarding-hero.tmp.mp4

# Replace only after confirming size is under ~3.5MB:
# mv public/onboarding/onboarding-hero.tmp.mp4 public/onboarding/onboarding-hero.mp4
```

Windows: install [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) (or `winget install Gyan.FFmpeg`), then run the same `ffmpeg` command from the repo root.
