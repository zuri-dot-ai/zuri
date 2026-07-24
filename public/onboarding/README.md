# Onboarding desktop hero (docs/01_ONBOARDING_V2.md §4)

Place these files in this folder:

| File | Role |
|------|------|
| `onboarding-hero.mp4` | Primary looping hero (H.264, muted, short clip ~5–15s) |
| `onboarding-hero.jpg` | Poster + fallback still (also used when `prefers-reduced-motion`) |

Served at:
- `/onboarding/onboarding-hero.mp4`
- `/onboarding/onboarding-hero.jpg`

Used only on desktop ?1025px (`lg` breakpoint). If the video fails, the JPG is shown; if the JPG is missing too, a dark gradient placeholder is used.
