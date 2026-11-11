# Frontend

## Skils
Use `lifecycle-frontend-team` skill

## Centralized systems (mandatory)

Use only the existing centralized system for each area below. Never implement these ad hoc in components. If a system lacks a capability, extend it instead of adding a parallel solution.

- **Search & filters:** one unified filter system driven by a single search bar. No separate filter forms or dropdowns.
- **Date & time:** `src/lib/dates.ts` owns the Luxon adapter and civil-date/DST policy; one unified date/time system. Always display and parse relative to the user's settings (timezone, format). No direct `new Date()`, `toLocaleString`, or manual date formatting in components.
- **Save controls:** `components/ui/save.tsx` owns SaveForm/SaveButton. Preserve native form submission/validation and disabled states, including ancestor fieldsets when portaled; one save action uses the Dialog header, independent forms keep their own top-right circular disk control in a narrow transparent sticky lane. Dialog content scrolls below its header. Never add fixed bottom save bars.
- **Choice fields:** `components/ui/choice-picker.tsx` owns the searchable single-choice input/dialog reused by country and interface-language adapters; use the same input row, keyboard opening, common FilterSearch and domain catalogs. `systems/i18n/locale.ts` owns language resolution: unavailable translations resolve to English, with shared notifications from the language adapter/preferences flow; persist only supported interface languages.
- **Notifications & confirmations:** one unified system. No `alert`, `confirm`, or custom one-off modals.
- **Tags & categories:** one unified tag management system.
- **Markdown:** one shared editor and renderer. No custom markdown editors or renderers.
- **Images:** one private upload, validation and display system. No ad hoc `<input type="file">` or direct image rendering.
- **Icons & logos:** Iconify with the shared visual picker system.
- **Country flags:** a dedicated pack inside the shared icon catalog. No separate flag assets or libraries.
- **Languages:** `src/systems/i18n/locale.ts` owns i18next/react-i18next, lazy catalogs and language fallback; Russian and English. No hardcoded user-visible strings; add keys for both languages.
- **Themes:** ready palettes, editor, custom background. Use theme tokens only; no hardcoded colors.
- **Sounds:** Foley system with volume, separate channels and full mute. No direct `Audio` or `<audio>` playback; always respect user sound settings.
- **Phones & countries:** one search-with-flags, dial code and number formatting system. No custom phone inputs or formatting.
- **Holidays:** `src/systems/holidays/` owns holiday objects, country associations, country-specific civil dates, sources, worker loading, search and reusable lists. Calendar and future holiday pages must use it. Keep international observances distinct from national days off; profile residence country is the default context.
- **Animations:** `src/systems/animations/` is the only Motion integration and owns presets, gestures, surfaces, loading indicators, scrolling and simple CSS transitions. Reuse it, respect system reduced motion and the account switch. `motion-ai` is a development tool.
- **Visual effects / particles:** `src/systems/effects/` is the only tsParticles integration. Emit effects after confirmed success, through the shared mutation/feedback flow. Keep one bounded, non-interactive layer; stop it on reduction, disabling, backgrounding and unmount.
- **Sidebar icons:** route-to-icon assignments live in `src/systems/icons/navigation.ts`. Every destination has a different semantic Iconify icon from the existing catalog.
- **Labels and categories:** `src/systems/labels/` owns the registry, normalization, input, selection, chips, event category choices and `/labels` management page. Use `/api/labels`; `/task-tags` is only a compatibility alias. `/collections` manages personal reference items through the same registry and CollectionEditor/CollectionPicker; shared/collections.json defines expandable and fixed kinds for both frontend and backend. All choices are backed by /labels registry rows, including seeded fixed emotions/sex types. Expandable lists show personal items; archived historical references remain registered without repopulating personal inventory. Fixed lists cannot be extended. Keep historical selections when removing an item; metadata/images stay encrypted and use the shared private media owner. Preserve label names containing punctuation. Registry icons use the shared IconPicker. Functional labels use typed capability adapters in the label owner; AI access delegates to existing per-object permissions, cost values use exact decimal strings and encrypted subject bindings. Event categories are the fixed enum or a registry category ID; never collect arbitrary event categories in a text input.
- **History:** `src/systems/history/` owns history query routes and removal controls. Use `useHistory` and `HistoryRemove`/`HistoryEntries`. Removing a log from history must preserve operational results, statistics and AI idempotency; only terminal Pomodoro/workout sessions can be removed from history.
- **External/social links:** `src/systems/links/` owns URL validation, protocol adapters and Iconify service icons. Use `ExternalLink` and `ContactActions`. Links open the appropriate service; sending a message or placing a call remains the user's action.
- **Contact relationships and tree:** `src/features/contacts/relationships.ts`, `relationship-editor.tsx` and the backend contacts owner define one typed relationship registry. `/tree` projects the existing contacts and `/contacts/relationships` resources; never duplicate people or store another graph in localStorage. Family parent/child, sibling and partner links stay distinct from social links; the server checks ownership, duplicates and ancestry cycles. Inferred relatives remain projections. Reuse the same editor/panel in contacts and tree, `ContactEditor`, `contact-actions.ts` deletion policy, shared phone actions, labels and cache. `/contacts?contact=…` and `/tree?contact=…` identify the same person. Contact deletion removes their links; relationship deletion preserves both contacts.
- **Zodiac:** `src/systems/icons/zodiac-badge.tsx` and `lib/dates.ts` own the shared badge and civil-date calculation. Birthday countdowns use `features/countdowns/birthday.ts` for the same birthday classification as their age counters; use the original birth date, preserve unlinked snapshots and hide the badge for missing/suspended dates. Never derive zodiac from the next occurrence or a timezone-shifted instant.
- **Mobile operators:** `src/systems/operators/` owns normalized lookup, request deduplication, bounded concurrency, cache, allocation fallback and provider settings. The backend owns the external provider call and encrypted credentials/cache. Never send a phone to an external provider directly from a component, expose API keys, or describe an allocation range as the current carrier after number portability.
- **Loading and preloading:** `src/systems/loading/` owns the single TanStack Query client; `useResource` is the domain adapter for shared snapshots, in-flight deduplication, route preloading and invalidation. Keep ready content visible during refresh and reset private caches when the account changes. Extend this cache instead of adding component-level loading caches.
- **Forms:** `src/systems/forms/use-editor.ts`, `schemas.ts` and `editor.tsx` own React Hook Form/Zod editor state and submission. Use `useEditorState`/`useEditorField` and `EditorForm`; use `saveControls={false}` for action/quick-entry forms without a SaveButton. Keep UI-only state separate and retain native required/disabled/fieldset validation. Extend these adapters and domain schemas rather than maintaining another draft store.
- **Long lists:** `components/ui/virtual-grid.tsx` owns TanStack Virtual measurement and responsive rows. Icons, games and history reuse it; keep selection keyed by the complete domain collection, outside mounted rows.
- **Dialogs:** `components/dialog.tsx` owns Radix Dialog/AlertDialog and the shared save header. Dialog scope is `[data-dialog-root]`; never depend on native `dialog`/`showModal`.
- **API mocks and component tests:** `src/testing/` owns MSW handlers/server/browser startup and Testing Library setup. Mock mode is explicit (`VITE_MOCK_API=true`); never start it in production or copy real account data into fixtures.
- **Drag feedback:** use `src/systems/animations/drag.ts` and shared Gantt surfaces. `systems/animations/drag-drop.tsx` owns dnd-kit sensors and drag scopes, and `drag-order.ts` owns array ordering helpers. Stable `data-drag-key`/`data-drag-item` markers connect these scopes to Motion; account/system reduced motion still applies.
- **Task sounds:** confirmed occurrence changes go through the shared API feedback event and Foley sound owner. Respect the UI channel and global mute independently of particle settings.
- **Daily holidays:** Calendar and Today must use the same holiday objects, country rules, worker and `HolidayList`; do not create a second holiday catalog.
- **Action menus:** `src/systems/actions/` owns the declarative action registry and Radix ContextMenu/DropdownMenu rendering, placement, focus and dismissal. Use ObjectActions with ContextAction arrays or declarative action controls; the same declarations supply icon click, right click and ContextMenu/Shift+F10. Never discover actions by scraping DOM controls. Use data-action-subject for non-article subjects and ActionMenuButton for explicit touch access. Submenus and numeric entry are declared with ContextAction children/numberInput and rendered by this owner. Feature-specific actions contain behavior only; do not create separate popup implementations.
- **Multiple selection:** `src/systems/selection/` owns selection state, keyed snapshots, scope changes and declarative first-N/all actions. Use selectionMenuActions/SelectionActions inside the shared Actions Menu and highlight selected objects; do not add separate selection toolbars or checkboxes to object lists. EntitySelectionArea/SelectionItem provide shared bulk execution and declarative item/menu registration for entity lists; SelectionGesture adds mouse marquee, additive modifiers and touch hold selection. Preserve native input, scrolling, task dragging and Gantt gestures. Bulk tag deltas belong to the label owner. Entity lists, note folders, contact imports, daily tasks and history lists reuse it. History batch removal stays in `src/systems/history/`; preserve operational results and handle partial batch success.

## New centralized systems

If a task needs a new centralized system (a new shared module for a cross-cutting concern, not covered above), STOP. Do not create it. Tell the user what is needed and why, and wait for explicit confirmation. Create it only after the user confirms.

## UI principles

Before building or changing UI, briefly weigh usability: clicks, speed, responsiveness.

- Optimize for fast creation first, editing afterwards. Minimal required fields; everything else editable later.
- Prefer sensible defaults, keyboard-friendly input, instant feedback (optimistic updates where appropriate).
- Do not add required fields or steps that creation does not strictly need.

## Before finishing

Run: `<lint>`, `<test>`, `<build>`.
