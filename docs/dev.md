# Development Notes

## Architecture & Design Decisions

### Frontend Theme System

The frontend uses a layered theming approach:

1. **Semi Design CSS Variables** — The primary theming mechanism. All color palettes (`--semi-blue-*`, `--semi-grey-*`, etc.) are overridden in `web/src/index.css` via `body:not([theme-mode=dark])` and `body[theme-mode=dark]` selectors.

2. **Tailwind CSS** — Used for utility classes. `darkMode: 'class'` is set in `tailwind.config.js` so `dark:` variants follow the HTML class toggle. Semi variable mappings are exposed as Tailwind colors (e.g., `bg-semi-color-bg-0`).

3. **Component-level styles** — Components should prefer Semi variable-backed Tailwind classes over hardcoded color values. Pattern: use `text-semi-color-text-0` instead of `text-gray-900 dark:text-gray-100`.

### Color Palette (Spaceship Theme)

- **Primary**: Teal scale (teal-500 `#14B8A6` as anchor)
- **Light backgrounds**: White canvas (#FFFFFF), gray-50 cards (#F9FAFB)
- **Dark backgrounds**: Deep navy (#0D1117 canvas, #161B22 cards)
- **Cards**: Border-only (no shadows), `border-radius: 6px` for controls, `12px` for containers

### Layout Architecture

The layout uses a **Navigation Rail + Utility Bar** pattern (not the traditional header + sidebar):

| Component | File | Description |
|-----------|------|-------------|
| `NavigationRail` | `components/layout/NavigationRail.jsx` | Full-height 56px/240px left rail with icon nav |
| `UtilityBar` | `components/layout/UtilityBar.jsx` | 40px breadcrumb + action strip at top of content |
| `BottomTabBar` | `components/layout/BottomTabBar.jsx` | Mobile-only bottom navigation (5 tabs) |
| `PageLayout` | `components/layout/PageLayout.jsx` | Orchestrates rail + utility bar + content |

CSS variables: `--rail-width: 56px`, `--rail-width-expanded: 240px`, `--utility-bar-height: 40px`.

The rail shows main nav links on all pages. On `/console/*` routes, it also shows 6 console sections (Overview, Services, API, Monitoring, Billing, Account). Config backward-compatible via `mergeAdminConfig()` in `useSidebar.js`.

### Homepage Architecture

Multi-section scrollable page with animated mesh gradient background:
- Section 1: Hero (always-dark `.home-hero-bg` background, gradient text headline, terminal code snippet)
- Section 2: Endpoint ticker + 3 feature cards (theme-aware)
- Section 3: Provider grid (20 providers from `@lobehub/icons`)
- Section 4: CTA (always-dark background)

### Auth Pages

Split-screen layout: left half = branding panel (`.home-hero-bg`), right half = form. OAuth buttons rendered as icon-only circles. No two-view toggle — OAuth + email form shown simultaneously.

### Settings Page

Vertical section navigation: left sidebar (200px) with 4 groups (General, AI & Models, Billing & Limits, Advanced), right content area. Mobile uses dropdown selector.

### Table Pages

`CardPro` renders as a plain `<div>` (not Semi `Card`). Tables render directly on page background. Pagination is sticky bottom bar.

### Fonts

- **Primary**: Inter (Google Fonts, preloaded)
- **CJK fallback**: Noto Sans SC
- **System fallback**: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
