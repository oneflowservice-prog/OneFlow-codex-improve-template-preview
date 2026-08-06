# Astryx page archetypes (v0.1.8)

Pick ONE archetype before writing code. Budget the frame regions in px first (rail width, panel width, header height), then fill content. These are composition recipes, not copy-paste files — rebuild them from the components in `components.md`.

## App shells

- **Side Nav shell** — collapsible, resizable `SideNav` (workspace switcher heading, search, grouped conversations/items with status dots) over a content region. The default frame for any multi-section product app.
- **Top Nav shell** — centered `TopNav` (logo heading, nav items, mega menus, primary CTA) over page content. Use for simpler apps or storefront-style products.
- **Shell Nav (app + menu bar)** — TopNav + SideNav combined with a File/Edit/View menu bar (`NavMenu`) and `CommandPalette` search. For desktop-grade tools.
- **Messaging shell** — four-column frame: workspace rail, channel sidebar, message stream, thread panel, built on the `Chat` family. Dense rows, zero cards.
- **IDE** — file explorer + tabbed editor + terminal + properties sidebar, all resizable/collapsible via `Resizable`.

## Data-dense pages

- **Searchable Table** — `PowerSearch` filter bar + action `Toolbar` over an edge-to-edge `Table`, `Pagination` footer. The default for any "manage X" page.
- **Grouped Table** — collapsible status sections (`useTableGroupedRows`) + `PowerSearch` + resizable detail `LayoutPanel`.
- **Analytics Dashboard** — KPI `Card` row, chart area, data table. Cards only for widgets; the table stays edge-to-edge.
- **Portfolio Dashboard** — KPI metrics + trend area + holdings table variant of the above.
- **Incident Console** — dense grouped incident rows with severity `StatusDot`s, `PowerSearch`, status `SegmentedControl`, resizable inspector panel with `MetadataList` + timeline.
- **Outage Heatmap Table** — status-page heatmap grid + incident log table.
- **Kanban Board** — status columns of draggable task cards with priority `Token`s and metadata.
- **File Explorer** — column-based browser (macOS Finder style) from `TreeList` + `Layout` panels.

## Detail & form pages

- **Order Detail** — header summary + timeline + line-items table; `MetadataList` for the summary block.
- **Product Detail** — image gallery + collapsible spec sections (`Collapsible`).
- **Settings Panels** — nav-switched panels with inline row editing; the default settings archetype.
- **Settings Form** — single scrolling `FormLayout` with sectioned `Field` groups.
- **Settings Dialog** — settings inside a `Dialog` with sidebar nav — only when context must be preserved.
- **Checkout Form** — billing `FormLayout` + order summary panel.
- **Two-column Form** — hero header + form card for data collection.
- **Page Editor** — block-based builder: sidebar config + live preview.

## Auth

- **Basic Login / Login Card / Login Split / Login SSO** — pick per brand: plain form, centered card (social + email), split screen with cover image, or SSO with provider detection.

## Chat / AI

- **AI Chat Landing** — `ChatComposer` + greeting + category toggles.
- **AI Chat Conversation** — full conversation view: `ChatMessageList` with tool calls, system messages, markdown/code blocks, multi-bubble grouping, resizable artifact panel.

## Galleries & docs

- **Classic / Mixed / Side Gallery, Gallery Hero** — image-forward browsing pages with filter `TabList`s.
- **Documentation Catalog / Design / Technical** — docs landing with category grid, component doc page with live preview + best-practices table, or getting-started guide.
- **Card Grid** — browsable component/asset grid with tabs and filters.

## Composition rules across archetypes

1. Navigation lives in the shell (`AppShell` + `SideNav`/`TopNav`), never re-built per page.
2. Page-level header with title + primary action → `LayoutHeader`; card header with actions → `Toolbar`.
3. Every list/table page needs its `EmptyState` and `Skeleton` variants designed, not just the populated state.
4. Detail panels are `LayoutPanel` (resizable via `Resizable` when adjacent to a table/list), not floating cards.
