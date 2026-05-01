# Progress / Changelog

## 2026-04-06 — Frontend Redesign: Spaceship.com-Inspired Cloud Panel

### Summary

Complete frontend visual overhaul transforming the UI from a generic open-source project appearance to a modern, spaceship.com-inspired cloud control panel aesthetic.

### Changes

**Phase 1: Theme Foundation**
- Replaced color system with teal-primary palette (Semi Design variable overrides)
- Added Inter + Noto Sans SC font stack via Google Fonts preload
- Implemented dual light/dark theme with deep navy dark mode (#0D1117)
- Reduced border-radius from 10px to 8px globally
- Added shadow tokens (`--shadow-xs`, `--shadow-sm`)
- Added card accent utility classes (`.card-accent-left` + color variants)
- Removed decorative CSS (blur-balls, pastel-balls, shine-text animation)
- Renamed `.sbg-variant-teal` to `.sbg-variant-cyan` to avoid primary color conflict

**Phase 2: Branding Removal**
- Removed console.log welcome message with project link
- Changed default system name to "AI Gateway"
- Removed GitHub button from home page
- Simplified footer to copyright-only (removed 4-column link grid)
- Replaced project-specific URLs in settings with generic placeholders
- Updated all 7 i18n locale files with new keys

**Phase 3: Layout Restructuring**
- Reorganized sidebar from 4 sections to 6 cloud-panel sections (Overview, Services, API, Monitoring, Billing, Account)
- Added backward-compatibility migration for old saved sidebar configs
- Restyled header with Semi variable background + border
- Relabeled navigation: Console -> Dashboard, Model Square -> API Directory
- Replaced hardcoded dark-mode colors in headerbar sub-components with Semi variables

**Phase 4: Page-Level Visual Redesign**
- Home page: gradient hero background, terminal-style server address, scrolling provider ribbon
- Dashboard: neutral stat cards with colored left accent bars
- Auth pages: removed blur-balls, theme-aware backgrounds, rounded-lg buttons
- Card/Table system: rounded-xl, border-based instead of shadow-based

**Phase 5: Hardcoded Color Cleanup**
- Replaced ~40+ hardcoded Tailwind dark-mode classes in headerbar components
- Fixed payment/topup modals to use Semi variables instead of slate/gray hardcodes
- Cleaned dashboard component colors (gray-* -> semi-color-text-*)

### Impact
- All user-visible UI affected
- No backend changes
- No functional changes — all features preserved

### Verification
- `cd web && bun run build` — passes without errors
- Branding search returns zero results (excluding backend protocol headers)
- Theme toggle works in both light and dark modes

### Compatibility
- Sidebar backward-compat mapping handles old 4-section saved configs
- `New-Api-User` HTTP header preserved (backend protocol)

---

## 2026-04-06 — Phase 2: Structural Frontend Redesign

### Summary

Deep structural redesign transforming the layout skeleton to be unrecognizable from the original project. Changed layout architecture, page structures, and visual language.

### Changes

**Phase 2A: Layout Shell**
- Replaced header (64px) + sidebar (180px) L-shape with Navigation Rail (56px/240px) + Utility Bar (40px)
- Created `NavigationRail.jsx` — full-height left rail with icon navigation, expand/collapse
- Created `UtilityBar.jsx` — minimal breadcrumb + action strip (theme, language, notifications, user)
- Created `BottomTabBar.jsx` — mobile bottom navigation (5 tabs)
- Restructured `PageLayout.jsx` — removed Semi Layout/Header/Sider, uses flexbox
- Updated CSS: new `--rail-*` variables, `.rail-*` classes, reduced border-radius to 6px, removed card shadows

**Phase 2B: Homepage Redesign**
- Complete rewrite: multi-section scrollable page with animated mesh gradient background
- Section 1: Always-dark hero with gradient text headline, terminal code snippet, CTA buttons
- Section 2: Auto-scrolling endpoint ticker + 3 feature cards (Unified API, Smart Routing, Monitoring)
- Section 3: 4×5 provider grid with 20 provider icons
- Section 4: CTA section with dark background
- Added 17 new i18n keys across all 7 locale files
- Added CSS: `.home-hero-bg`, `.home-grid-overlay`, `@keyframes scroll`

**Phase 2C: Auth + Settings**
- Auth: Split-screen layout (branding panel left + form right), OAuth icon circles, no two-view toggle
- Settings: Replaced 12 horizontal card tabs with vertical section navigation (4 groups)
- Added i18n keys for settings groups and auth text

**Phase 2D: Dashboard + Card System**
- Dashboard: Metric strip replaces 4-column card grid, charts full-width, API panel full-width
- CardPro: `<Card>` → `<div>`, toolbar-style header, sticky pagination footer
- CardTable: Mobile cards use shadow instead of dashed borders

### Impact
- Layout architecture completely changed (rail + utility bar)
- Every major page structurally different from original
- No backend changes, all functionality preserved

### Verification
- `cd web && bun run build` — passes
- All 10+ table pages work with refactored CardPro (unchanged prop interface)
