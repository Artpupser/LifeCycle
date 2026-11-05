# Frontend

## Skils
Use `lifecycle-frontend-team` skill

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
- **Labels and categories:** `src/systems/labels/` owns the registry, normalization, input, selection, chips, event category choices and `/labels` management page. Use `/api/labels`; `/task-tags` is only a compatibility alias. Preserve label names containing punctuation. Registry icons use the shared IconPicker. Functional labels use typed capability adapters in the label owner; AI access delegates to existing per-object permissions, cost values use exact decimal strings and encrypted subject bindings. Event categories are the fixed enum or a registry category ID; never collect arbitrary event categories in a text input.
- **History:** `src/systems/history/` owns history query routes and removal controls. Use `useHistory` and `HistoryRemove`/`HistoryEntries`. Removing a log from history must preserve operational results, statistics and AI idempotency; only terminal Pomodoro/workout sessions can be removed from history.
- **External/social links:** `src/systems/links/` owns URL validation, protocol adapters and Iconify service icons. Use `ExternalLink` and `ContactActions`. Links open the appropriate service; sending a message or placing a call remains the user's action.
- **Mobile operators:** `src/systems/operators/` owns normalized lookup, request deduplication, bounded concurrency, cache, allocation fallback and provider settings. The backend owns the external provider call and encrypted credentials/cache. Never send a phone to an external provider directly from a component, expose API keys, or describe an allocation range as the current carrier after number portability.
- **Loading and preloading:** `src/systems/loading/` and `useResource` own shared API snapshots, in-flight deduplication, route preloading and invalidation. Keep ready content visible during refresh and reset private caches when the account changes. Extend this cache instead of adding component-level loading caches.
- **Drag feedback:** use `src/systems/animations/drag.ts` and shared Gantt surfaces. Stable `data-drag-key`/`data-drag-item` markers connect native drag implementations to Motion; account/system reduced motion still applies.
- **Task sounds:** confirmed occurrence changes go through the shared API feedback event and Foley sound owner. Respect the UI channel and global mute independently of particle settings.
- **Daily holidays:** Calendar and Today must use the same holiday objects, country rules, worker and `HolidayList`; do not create a second holiday catalog.
- **Action menus:** `src/systems/actions/` owns right-click/keyboard menus, viewport placement, focus and dismissal. Use ObjectActions with ContextAction arrays or declarative action controls; the same declarations supply icon click, right click and ContextMenu/Shift+F10. Never discover actions by scraping DOM controls. Use data-action-subject for non-article subjects and ActionMenuButton for explicit touch access. Submenus and numeric entry are declared with ContextAction children/numberInput and rendered by this owner. Feature-specific actions contain behavior only; do not create separate popup implementations.
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
