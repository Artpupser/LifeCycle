# Frontend

## Centralized systems (mandatory)

Use only the existing centralized system for each area below. Never implement these ad hoc in components. If a system lacks a capability, extend it instead of adding a parallel solution.

- **Search & filters:** one unified filter system driven by a single search bar. No separate filter forms or dropdowns.
- **Date & time:** one unified date/time system. Always display and parse relative to the user's settings (timezone, format). No direct `new Date()`, `toLocaleString`, or manual date formatting in components.
- **Notifications & confirmations:** one unified system. No `alert`, `confirm`, or custom one-off modals.
- **Tags & categories:** one unified tag management system.
- **Markdown:** `src/components/markdown.tsx` owns rendering, editing and link policy. Reuse it in every Markdown field.
- **User images:** `src/systems/media/` owns validation, upload, authenticated URLs and display. No separate upload handlers or raw image rendering in features.
- **Icons & logos:** `src/systems/icons/` and `src/components/icons.tsx` use Iconify with the local catalog, including country flags. Reuse `AppIcon` and `IconPicker`; never import another icon library or fetch icons from a third party at runtime.
- **Interface languages:** `src/systems/i18n/` owns RU/EN messages, interpolation and locale. Use `t` for authored interface copy and `useLanguage` for reactive components; never translate user content.
- **Themes:** `src/systems/themes/` owns palettes, contrast, CSS tokens and backgrounds; account settings persist choices.
- **Sounds:** `src/systems/sounds/` is the only Foley integration. Respect master mute, separate UI/notification switches and volume.
- **Phone & country:** `src/systems/phone/` owns country names, calling codes, phone parsing and the shared country/phone inputs. Flags come from the icon catalog.

## New centralized systems

If a task needs a new centralized system (a new shared module for a cross-cutting concern, not covered above), STOP. Do not create it. Tell the user what is needed and why, and wait for explicit confirmation. Create it only after the user confirms.

## UI principles

Before building or changing UI, briefly weigh usability: clicks, speed, responsiveness.

- Optimize for fast creation first, editing afterwards. Minimal required fields; everything else editable later.
- Prefer sensible defaults, keyboard-friendly input, instant feedback (optimistic updates where appropriate).
- Do not add required fields or steps that creation does not strictly need.

## Before finishing

Run: `<lint>`, `<test>`, `<build>`.
