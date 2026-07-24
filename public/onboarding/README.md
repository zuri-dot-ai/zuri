# Onboarding desktop hero (docs/01_ONBOARDING_V2.md §4)

Place these files in this folder:

| File | Role |
|------|------|
| `onboarding-hero.mp4` | Primary looping hero (H.264 / `avc1`, muted, short clip ~5–15s, **target ?2–3MB**) |
| `onboarding-hero.jpg` | Poster + fallback still (also used when `prefers-reduced-motion`) |

Served at:
- `/onboarding/onboarding-hero.mp4`
- `/onboarding/onboarding-hero.jpg`

Used only on desktop ?1025px (`lg` breakpoint). If the video fails, the JPG is shown; if the JPG is missing too, a dark gradient placeholder is used.

## Delivery diagnosis (2026-07)

| Check | Result |
|-------|--------|
| CSP `media-src` | Already allows `'self'` — same-origin MP4 is **not** blocked by CSP |
| Codec | File brands include `avc1` (H.264) — web-safe |
| Size | Source was ~6.7–7.0MB — too heavy for a hero loop on slower links; compress before shipping |

### Re-encode (when ffmpeg is available)

```bash
ffmpeg -y -i public/onboarding/onboarding-hero.mp4 \
  -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p \
  -vf "scale='min(1280,iw)':-2" -movflags +faststart \
  public/onboarding/onboarding-hero.tmp.mp4

# Replace only after confirming size is under ~3MB:
# mv public/onboarding/onboarding-hero.tmp.mp4 public/onboarding/onboarding-hero.mp4
```
