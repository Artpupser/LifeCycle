# Frontend

## Centralized systems (mandatory)

Use only the existing centralized system for each area below. Never implement these ad hoc in components. If a system lacks a capability, extend it instead of adding a parallel solution.

- **Search & filters:** one unified filter system driven by a single search bar (`src/<path>`). No separate filter forms or dropdowns.
- **Date & time:** one unified date/time system (`src/<path>`). Always display and parse relative to the user's settings (timezone, format). No direct `new Date()`, `toLocaleString`, or manual date formatting in components.
- **Notifications & confirmations:** one unified system (`src/<path>`). No `alert`, `confirm`, or custom one-off modals.
- **Tags & categories:** one unified tag management system (`src/<path>`).

## New centralized systems

If a task needs a new centralized system (a new shared module for a cross-cutting concern, not covered above), STOP. Do not create it. Tell the user what is needed and why, and wait for explicit confirmation. Create it only after the user confirms.

## UI principles

Before building or changing UI, briefly weigh usability: clicks, speed, responsiveness.

- Optimize for fast creation first, editing afterwards. Minimal required fields; everything else editable later.
- Prefer sensible defaults, keyboard-friendly input, instant feedback (optimistic updates where appropriate).
- Do not add required fields or steps that creation does not strictly need.

## Before finishing

Run: `<lint>`, `<test>`, `<build>`.
