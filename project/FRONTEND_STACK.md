# Frontend technology owners

The approved stack is integrated through the existing application adapters. Feature components must reuse the owners below; the import boundaries are enforced by ESLint.

| Area | Owner | Implementation |
| --- | --- | --- |
| API reads, prefetch, invalidation | `frontend/src/systems/loading/`, `hooks/use-resource.ts` | One TanStack Query client; pending invalidation repeats only successful reads; refresh retains ready content. Existing cooldown policy stays in `retry.ts`. Auth changes cancel and clear private queries. |
| Shared mutations | `frontend/src/hooks/use-action.ts` | TanStack Query mutations; one error/notification policy and duplicate-submit lock. Integration actions delegate here. |
| Editor state and validation | `frontend/src/systems/forms/` | React Hook Form, Zod and resolvers. `EditorForm` gates submission; `useEditorState` and `useEditorField` adapt existing controlled fields. Extend domain schemas here. Native constraints and domain-specific conflict/permission checks remain required. |
| Save controls | `frontend/src/components/ui/save.tsx` | Existing shared SaveForm/SaveButton and header portal; original form/fieldset association is preserved. Quick/action forms use `EditorForm saveControls={false}`. |
| Dialogs and confirmations | `frontend/src/components/dialog.tsx` | Radix Dialog/AlertDialog; shared save header and scrolling. Dialog scope uses `[data-dialog-root]`. |
| Object actions | `frontend/src/systems/actions/` | One declarative registry; Radix ContextMenu/DropdownMenu own focus, placement, keyboard and submenus. Numeric actions open the shared dialog. |
| Drag and ordering | `frontend/src/systems/animations/drag-drop.tsx`, `drag-order.ts` | dnd-kit sensors for navigation, Kanban, Pomodoro, contact tree and Gantt. Domain owners retain persistence/relationship/interval rules. Motion retains feedback; the native HTML5 transport/observer was removed. |
| Dates and timezones | `frontend/src/lib/dates.ts` | Luxon behind existing exports; civil dates stay independent of browser timezone, DST gaps are rejected and overlaps retain both instants. |
| Translation | `frontend/src/systems/i18n/locale.ts` | i18next/react-i18next behind existing `t`/`useLanguage`; lazy English catalog, interpolation, fallback and selection race policy stay centralized. |
| Long catalogs and lists | `frontend/src/components/ui/virtual-grid.tsx` | TanStack Virtual measured rows and keyboard focus. Used by choices, icons, game offers/library and history; selection state remains outside virtual rows. |
| API mocks and component tests | `frontend/src/testing/` | MSW handlers shared by Node/browser, Testing Library, user-event, jest-dom and jsdom. Production never starts mocks. |

## Development

Run normal development with `pnpm dev`. For the explicit mock mode use `VITE_MOCK_API=true pnpm dev`; add fixtures to `src/testing/handlers.ts` for the routes being developed. Missing routes fail rather than reaching a real API. Push worker registration is disabled in mock mode to avoid replacing the MSW worker with the account notification worker.

Existing Iconify, Foley, Motion, themes, private media, labels, phone normalization, holidays and Markdown remain their sole owners. Installing a library does not authorize feature-level parallel implementations.
