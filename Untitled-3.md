# SESSION — UI/UX Polish Pass: Marketplace, Preview, Controls, Settings
Model: claude-sonnet-4-5
Prereqs: All previous sessions complete
Read the current implementations of the files referenced below before making changes.

Task: Fix a security/CSP bug in the preview iframe, then address five specific styling/UX issues found in a mobile screenshot audit.

---

## Priority 0 — Preview iframe CSP + sandbox bug (fix first)

Console shows the preview iframe is blocked from loading Google Fonts and reaching Supabase/Flutterwave/Pexels/etc. due to a `connect-src 'self'` CSP directive scoped too narrowly for iframe content, and Chrome is flagging the iframe's combined `allow-scripts` + `allow-same-origin` sandbox attributes as a sandbox-escape risk.

1. Update the CSP header/meta applied to the preview route so the iframe's `connect-src` allows the same origins the app itself needs (fonts, Supabase, image APIs), scoped as tightly as possible — do not just set it to `*`.
2. Re-evaluate the iframe `sandbox` attribute. If `allow-same-origin` is not actually required for preview functionality, remove it. If it is required, document why and confirm there's no script-injection vector given the site content is user/AI-generated.
3. Confirm fonts and live data actually render correctly in preview after the fix — this may explain any preview-vs-published visual mismatches reported earlier.

---

## Issue 1 — Agency Marketplace redesign

Currently reads as a separate, plainer app from the rest of Zuri.

4. Unify the nav bar component used on `/agencies` (and other marketing pages) with the in-app header — same wordmark, same styling, one shared `<NavBar>` component rather than two implementations.
5. **Logo**: use the wordmark exactly as it appears on the homepage and other in-app sections, everywhere — including `/agencies`. Remove the small triangle mark version wherever it currently appears (found on the marketing-page header in the current screenshots) so there is exactly one logo lockup used app-wide.
6. Bring the dashboard's card language (bordered cards, subtle depth/shadow, gold accents) into the agency directory: each agency listing gets a card with initial-avatar or logo, name, service-tag pills, price-range badge — not plain text rows.
7. Address the flatness of the page background relative to the dashboard — dashboard cards have visible depth/border; the marketplace currently reads as flat black. Bring it to the same visual weight.

## Issue 2 — Website preview top bar

8. Rebuild the bar directly under the back button on `/website-preview`. Remove the duplicated "Preview · Preview" label and the leftover white editor-toolbar block. Replace with a single dark bar: back arrow + site name only. This bar should not contain the Publish action (see Issue 4 — Publish moves to the floating pill).

## Issue 3 — Dropdown arrows (global)

9. Replace the raw OS-default `<select>` chevron across the app with a styled custom SVG chevron, token-colored, consistently sized and positioned to match existing input padding. Apply globally — confirmed present on Price Range and Brand Tone selects, audit for any other `<select>` elements in Settings, Website editor, and Agency filters.

## Issue 4 — Preview/Publish buttons: floating pill

10. Replace the current inline Preview/Publish buttons (currently cramped in the scrollable section list, directly above "Theme") with a **floating pill**, fixed to the bottom-right of the viewport in the Website editor:
    - Publish is the primary action — filled gold, most visually prominent.
    - Preview is a secondary action — either a smaller icon-only button attached to the pill, or revealed on tap/expand, per your preference at implementation time; default to a compact two-segment pill (Preview icon | Publish label) if no stronger preference emerges.
    - Pill should have proper elevation (shadow) and stay fixed above the bottom tab bar, not overlap it.
    - Remove the buttons from the scrollable content flow entirely once the floating pill is in place.

## Issue 5 — Settings Profile mobile horizontal overflow (bug, not just spacing)

11. The Profile panel in Settings is horizontally scrolling on mobile, clipping the left edge of "Full name," "Email," and "Appearance" labels. Diagnose the actual overflow source (likely the avatar row or an input exceeding container width) and fix at the root — apply the same systemic overflow-prevention rule used for the text-truncation fix in the earlier session, rather than patching this one panel in isolation. Audit the rest of Settings (Business Profile, Brand Voice, Billing, Notifications, Danger Zone) for the same bug while in this code.

## Additional item found during review

12. Confirm the notification bell in the top bar is wired to show an unread-count badge — none of the audited screenshots show one despite the notification system being built in an earlier session. If the badge component exists but isn't connected, wire it up; if it doesn't exist, add it.

---

## Success criteria
- Preview route loads with no CSP console errors and no sandbox warning.
- `/agencies` uses the same nav/logo/card language as the rest of the app.
- Website preview top bar shows a single clean bar with no duplicated label and no leftover white block.
- All `<select>` elements app-wide show the custom chevron, not the OS default.
- Website editor shows a floating Publish/Preview pill fixed above the bottom tab bar; no buttons remain inline in the section list.
- Settings Profile panel on mobile shows no horizontal scroll/clipping at any of the audited viewport widths.
- Notification bell shows an unread badge when unread notifications exist.
- TypeScript: zero errors.