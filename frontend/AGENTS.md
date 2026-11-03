# Frontend

## Centralized systems (mandatory)

Use only the existing centralized system for each area below. Never implement these ad hoc in components. If a system lacks a capability, extend it instead of adding a parallel solution.

- **Search & filters:** one unified filter system driven by a single search bar. No separate filter forms or dropdowns.
- **Date & time:** one unified date/time system. Always display and parse relative to the user's settings (timezone, format). No direct `new Date()`, `toLocaleString`, or manual date formatting in components.
- **Notifications & confirmations:** one unified system. No `alert`, `confirm`, or custom one-off modals.
- **Tags & categories:** one unified tag management system.
- **Markdown:** one shared editor and renderer. No custom markdown editors or renderers.
- **Images:** one private upload, validation and display system. No ad hoc `<input type="file">` or direct image rendering.
- **Icons & logos:** Iconify with the shared visual picker system.
- **Country flags:** a dedicated pack inside the shared icon catalog. No separate flag assets or libraries.
- **Languages:** Russian and English. No hardcoded user-visible strings; add keys for both languages.
- **Themes:** ready palettes, editor, custom background. Use theme tokens only; no hardcoded colors.
- **Sounds:** Foley system with volume, separate channels and full mute. No direct `Audio` or `<audio>` playback; always respect user sound settings.
- **Phones & countries:** one search-with-flags, dial code and number formatting system. No custom phone inputs or formatting.
- **Holidays:** `src/systems/holidays/` owns holiday objects, country associations, country-specific civil dates, sources, worker loading, search and reusable lists. Calendar and future holiday pages must use it. Keep international observances distinct from national days off; profile residence country is the default context.
- **Animations:** `src/systems/animations/` is the only Motion integration and owns presets, gestures, surfaces, loading indicators, scrolling and simple CSS transitions. Reuse it, respect system reduced motion and the account switch. `motion-ai` is a development tool.
- **Visual effects / particles:** `src/systems/effects/` is the only tsParticles integration. Emit effects after confirmed success, through the shared mutation/feedback flow. Keep one bounded, non-interactive layer; stop it on reduction, disabling, backgrounding and unmount.
- **Sidebar icons:** route-to-icon assignments live in `src/systems/icons/navigation.ts`. Every destination has a different semantic Iconify icon from the existing catalog.

## New centralized systems

If a task needs a new centralized system (a new shared module for a cross-cutting concern, not covered above), STOP. Do not create it. Tell the user what is needed and why, and wait for explicit confirmation. Create it only after the user confirms.

## UI principles

Before building or changing UI, briefly weigh usability: clicks, speed, responsiveness.

- Optimize for fast creation first, editing afterwards. Minimal required fields; everything else editable later.
- Prefer sensible defaults, keyboard-friendly input, instant feedback (optimistic updates where appropriate).
- Do not add required fields or steps that creation does not strictly need.

## Before finishing

Run: `<lint>`, `<test>`, `<build>`.
