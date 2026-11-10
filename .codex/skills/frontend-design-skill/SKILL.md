---
name: frontend-design-skill
description: Apply the project's Apple-style minimalist Bento design system and full-workspace page layouts in this React 19 + Vite + Tailwind v4 app. Use whenever creating or modifying components, pages, layouts, or styles.
---

# Apple + Minimalism + Bento

Style lives in tokens in one CSS file; components consume them through Tailwind utilities. Never style with raw values.

## Stack (fixed)
React 19, Vite, Tailwind CSS 4 (`@tailwindcss/vite`, CSS-first config), class-variance-authority, clsx, tailwind-merge, `@radix-ui/react-slot`, `motion`, `@iconify/react`, react-router 7, pnpm.
MUST NOT add UI kits (shadcn CLI, MUI, Chakra...), CSS-in-JS, `tailwind.config.*`, or new dependencies. Use `pnpm` only.

## Workflow
1. Locate existing pieces: global CSS entry, `cn` helper, `components/ui/`, Icon wrapper. Reuse them and follow the project's import aliases and file layout.
2. If the CSS entry lacks the tokens, merge `assets/theme.css` into it (single `@import "tailwindcss"`). Never duplicate tokens.
3. Build or restyle using token utilities. Keep logic, props, and routing unchanged.
4. Compose pages with `BentoGrid` / `BentoCard` (`assets/bento.tsx`; copy to `components/ui/` if absent).
   Every section fills the available workspace through the shared `.app-content main#main` layout in `src/index.css`; keep page gutters in the theme tokens.
5. Run Verification.

## Token utilities
- Color: `bg-app` `bg-surface` `bg-surface-2` `text-fg` `text-fg-muted` `border-line` `bg-accent text-accent-fg`
- Shape: `rounded-card` (24px), `rounded-control` (12px), `rounded-full`; `shadow-card`
- Type: `text-display` `text-title` `text-heading` `text-body` `text-caption`; weights 400/500/600 only
- Motion: `ease-apple`, 200-300ms
- Dark mode is automatic through tokens. MUST NOT use `dark:` in components.

## Layout (Bento)
- Every section fills the entire available workspace beside the navigation, including at wide desktop sizes. The outer page has full width, no maximum width or centered narrow container, and a minimum height equal to the workspace; longer pages scroll naturally.
- Use the shared `.app-content main#main` rule in `src/index.css` for page geometry and the `--page-gutter` token from `src/assets/theme.css` for responsive horizontal padding. Full workspace is the default for every section, including Calendar and Tasks; do not require a per-page opt-in or duplicate layout rules in services.
- Keep page backgrounds on `bg-app` and spacing on the 8px scale. Content grids use the available width. Width limits may remain on individual text blocks, controls and dialogs for readability; do not constrain the section itself.
- Grid: 1 col <640px, 2 cols ≥640px, 4 cols ≥1024px, `gap-4`, `grid-flow-dense`.
- Card sizes only: `1x1`, `2x1`, `1x2`, `2x2`. Spans collapse on small screens (handled in `BentoCard`).
- One card = one idea; at most one hero (`2x2` or `2x1`) per view.
- Prefer whitespace over dividers. Card uses `shadow-card` or a hairline `border-line`, never both.

## Components
- `cn` = `twMerge(clsx(...))` (`src/lib/cn.ts` if missing). Always merge incoming `className` last.
- Variants via `cva`. Do not export `cva` constants from component files (react-refresh lint, `--max-warnings 0`); share them from a `*.variants.ts` file.
- React 19: take `ref` as a prop, no `forwardRef`; type props with `ComponentProps<'tag'>`; use `import { type X }`.
- Polymorphism via `Slot` (`asChild`), e.g. a card or button rendered as react-router `Link` / `NavLink`.
- Button: pill (`rounded-full`), primary `bg-accent text-accent-fg`, secondary `bg-surface-2 text-fg`; `min-h-11`.
- Input: `bg-surface-2 rounded-control border border-line min-h-11`.
- Focus ring is global (`:focus-visible` in theme); do not remove outlines.
- Sticky nav/toolbars: `bg-app/70 backdrop-blur-xl backdrop-saturate-150`. Blur only on nav and overlays, never on cards.
- Lists/tables: hairline `border-line` separators, no zebra stripes.

## Icons and media
- UI icons: use the existing Icon wrapper; else `<Icon icon="tabler:name" />` from `@iconify/react`, 20-24px, `currentColor`. Do not invent icon names; verify they exist in the Tabler set.
- Brand logos: `simple-icons:*`. Country flags: `circle-flags:*`. `twemoji:*` only for emoji that is content, not as UI icons.

## Motion
- `import { motion, AnimatePresence, MotionConfig } from 'motion/react'`. Wrap the app once in `<MotionConfig reducedMotion="user">`.
- Animate only `transform` and `opacity`. Card hover `scale 1.015`, press `0.98`. Use CSS transitions for simple hover; `motion` for enter/exit and layout.
- Confetti (`@tsparticles/confetti`): only for explicit success moments, fire once, accent/neutral colors, skip when `prefers-reduced-motion: reduce`.
- Do not add or modify sound (`@foleyjs/*`); leave existing usage untouched.

## Markdown
`react-markdown` + `remark-gfm`: style via the `components` prop or wrapper arbitrary variants using token utilities. Do not use `prose` classes (typography plugin is not installed).

## Rules
MUST:
- Use token utilities only; no hex/rgb, no `[#...]` arbitrary colors, no inline `style` for visuals.
- One accent color; everything else neutral.
- WCAG AA contrast, 44px touch targets, semantic HTML, responsive at 375/768/1280px.

MUST NOT:
- Add extra accent colors, saturated gradients, heavy shadows, neon, or decorative/parallax animation.
- Add filler content or ornaments.

SHOULD:
- Big numbers + short labels in cards; under ~30 words per card.
- Use arbitrary Tailwind values only for one-off layout, not visual style.

## Verification
- `pnpm lint && pnpm typecheck` after changes. `pnpm build` only if config or the CSS entry changed. `pnpm test:e2e` only if existing tests cover the changed UI.
- No hardcoded colors/radii/fonts outside `theme.css` (grep).
- No `dark:` classes, no horizontal scroll at 375px, one accent, one hero per view. At 375/768/1280px and a wide desktop size, sections fill the available workspace beside the navigation; no outer 1200px cap or centered gutters return.
