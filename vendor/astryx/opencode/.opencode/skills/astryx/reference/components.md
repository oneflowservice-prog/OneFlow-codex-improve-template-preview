# Astryx component index (v0.1.8 · 153 components)

Import from the exact subpath shown — e.g. `import { Button } from "@astryxdesign/core/Button"`.
Every export below is verified against the published `@astryxdesign/core@0.1.8` package. Do not invent subpaths.

## App structure & layout

| Component | Import |
| --- | --- |
| AppShell | `@astryxdesign/core/AppShell` |
| Layout, LayoutHeader, LayoutContent, LayoutPanel, LayoutFooter | `@astryxdesign/core/Layout` |
| Section | `@astryxdesign/core/Section` |
| Center | `@astryxdesign/core/Center` |
| Grid, GridSpan | `@astryxdesign/core/Grid` |
| Stack, StackItem | `@astryxdesign/core/Stack` |
| HStack | `@astryxdesign/core/HStack` |
| VStack | `@astryxdesign/core/VStack` |
| Resizable (split panels, `useResizable`) | `@astryxdesign/core/Resizable` |
| FormLayout | `@astryxdesign/core/FormLayout` |
| AspectRatio | `@astryxdesign/core/AspectRatio` |

## Navigation

| Component | Import |
| --- | --- |
| SideNav, SideNavItem, SideNavSection, SideNavHeading, SideNavCollapseButton | `@astryxdesign/core/SideNav` |
| TopNav, TopNavItem, TopNavHeading, TopNavMenu, TopNavMegaMenu, TopNavMegaMenuItem, TopNavMegaMenuFeaturedCard | `@astryxdesign/core/TopNav` |
| MobileNav, MobileNavToggle | `@astryxdesign/core/MobileNav` |
| NavIcon | `@astryxdesign/core/NavIcon` |
| NavMenu (menu-bar menus) | `@astryxdesign/core/NavMenu` |
| Breadcrumbs, BreadcrumbItem | `@astryxdesign/core/Breadcrumbs` |
| Pagination | `@astryxdesign/core/Pagination` |
| Outline (scroll-spy outline) | `@astryxdesign/core/Outline` |
| TreeList | `@astryxdesign/core/TreeList` |
| Link, LinkProvider | `@astryxdesign/core/Link` |

## Data display

| Component | Import |
| --- | --- |
| Table, TableRow, TableCell, TableHeaderCell (+ `Table/utils`, hooks: useTableColumnResize, useTableGroupedRows, useTableRowExpansion, useTableRowIndex, useTableStickyColumns) | `@astryxdesign/core/Table` |
| List, ListItem | `@astryxdesign/core/List` |
| Item | `@astryxdesign/core/Item` |
| Card, ClickableCard, SelectableCard (incl. multi-select variant) | `@astryxdesign/core/Card`, `@astryxdesign/core/ClickableCard`, `@astryxdesign/core/SelectableCard` |
| MetadataList, MetadataListItem | `@astryxdesign/core/MetadataList` |
| Avatar, AvatarGroup, AvatarGroupOverflow, AvatarStatusDot | `@astryxdesign/core/Avatar`, `@astryxdesign/core/AvatarGroup` |
| Badge | `@astryxdesign/core/Badge` |
| Token | `@astryxdesign/core/Token` |
| StatusDot | `@astryxdesign/core/StatusDot` |
| EmptyState | `@astryxdesign/core/EmptyState` |
| Skeleton | `@astryxdesign/core/Skeleton` |
| Spinner | `@astryxdesign/core/Spinner` |
| ProgressBar | `@astryxdesign/core/ProgressBar` |
| Thumbnail | `@astryxdesign/core/Thumbnail` |
| Timestamp | `@astryxdesign/core/Timestamp` |
| Carousel | `@astryxdesign/core/Carousel` |
| Lightbox | `@astryxdesign/core/Lightbox` |
| OverflowList | `@astryxdesign/core/OverflowList` |
| Calendar | `@astryxdesign/core/Calendar` |
| CodeBlock, SyntaxTheme | `@astryxdesign/core/CodeBlock` |
| Code (inline code) | `@astryxdesign/core/Code` |
| Markdown | `@astryxdesign/core/Markdown` |
| Citation | `@astryxdesign/core/Citation` |
| Blockquote | `@astryxdesign/core/Blockquote` |
| Kbd | `@astryxdesign/core/Kbd` |

## Typography

| Component | Import |
| --- | --- |
| Text (types: body, large, label, supporting, code) | `@astryxdesign/core/Text` |
| Heading (h1–h6) | `@astryxdesign/core/Heading` |

## Actions & inputs

| Component | Import |
| --- | --- |
| Button | `@astryxdesign/core/Button` |
| ButtonGroup | `@astryxdesign/core/ButtonGroup` |
| IconButton | `@astryxdesign/core/IconButton` |
| ToggleButton, ToggleButtonGroup | `@astryxdesign/core/ToggleButton` |
| Field, FieldLabel | `@astryxdesign/core/Field` |
| FieldStatus | `@astryxdesign/core/FieldStatus` |
| InputGroup, InputGroupText | `@astryxdesign/core/InputGroup` |
| TextInput | `@astryxdesign/core/TextInput` |
| TextArea | `@astryxdesign/core/TextArea` |
| NumberInput | `@astryxdesign/core/NumberInput` |
| FileInput | `@astryxdesign/core/FileInput` |
| CheckboxInput | `@astryxdesign/core/CheckboxInput` |
| CheckboxList, CheckboxListItem | `@astryxdesign/core/CheckboxList` |
| RadioList, RadioListItem | `@astryxdesign/core/RadioList` |
| Switch | `@astryxdesign/core/Switch` |
| Slider | `@astryxdesign/core/Slider` |
| Selector, SelectorOption | `@astryxdesign/core/Selector` |
| MultiSelector | `@astryxdesign/core/MultiSelector` |
| SegmentedControl, SegmentedControlItem | `@astryxdesign/core/SegmentedControl` |
| Typeahead, BaseTypeahead, TypeaheadItem | `@astryxdesign/core/Typeahead` |
| Tokenizer | `@astryxdesign/core/Tokenizer` |
| DateInput | `@astryxdesign/core/DateInput` |
| DateRangeInput | `@astryxdesign/core/DateRangeInput` |
| DateTimeInput | `@astryxdesign/core/DateTimeInput` |
| TimeInput | `@astryxdesign/core/TimeInput` |
| PowerSearch (+ `PowerSearch/utils`, usePowerSearchConfig) | `@astryxdesign/core/PowerSearch` |

## Overlays & feedback

| Component | Import |
| --- | --- |
| Dialog, DialogHeader | `@astryxdesign/core/Dialog` |
| AlertDialog | `@astryxdesign/core/AlertDialog` |
| Popover | `@astryxdesign/core/Popover` |
| Tooltip | `@astryxdesign/core/Tooltip` |
| HoverCard | `@astryxdesign/core/HoverCard` |
| DropdownMenu, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem | `@astryxdesign/core/DropdownMenu` |
| ContextMenu | `@astryxdesign/core/ContextMenu` |
| MoreMenu | `@astryxdesign/core/MoreMenu` |
| CommandPalette, CommandPaletteInput, CommandPaletteList, CommandPaletteItem, CommandPaletteGroup, CommandPaletteEmpty, CommandPaletteFooter | `@astryxdesign/core/CommandPalette` |
| Toast (useToast) | `@astryxdesign/core/Toast` |
| Banner | `@astryxdesign/core/Banner` |
| Overlay | `@astryxdesign/core/Overlay` |
| Layer (low-level anchored overlay) | `@astryxdesign/core/Layer` |

## Disclosure & tabs

| Component | Import |
| --- | --- |
| Collapsible, CollapsibleGroup | `@astryxdesign/core/Collapsible` |
| TabList, Tab, TabMenu | `@astryxdesign/core/TabList` |

## Chat / AI surfaces

| Component | Import |
| --- | --- |
| ChatLayout, ChatLayoutScrollButton, ChatComposer, ChatComposerInput, ChatComposerDrawer, ChatSendButton, ChatDictationButton, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage, ChatTokenizedText, ChatToolCalls | `@astryxdesign/core/Chat` |

## Theming & utilities

| Component | Import |
| --- | --- |
| Theme, MediaTheme | `@astryxdesign/core/theme` |
| InternationalizationProvider | `@astryxdesign/core/i18n` |
| VisuallyHidden | `@astryxdesign/core/VisuallyHidden` |
| Divider | `@astryxdesign/core/Divider` |
| Toolbar | `@astryxdesign/core/Toolbar` |
| Icon (semantic icon system) | `@astryxdesign/core/Icon` |
| Hooks (useCollapsible, usePopover, useHoverCard, useLayer, useStreamingText, useKeyboardHint, useAppShellMobile, useTheme) | `@astryxdesign/core/hooks` |

## Composition notes

- `AppShell` provides the mobile-nav context automatically; use `useAppShellMobile` for custom triggers.
- `Toolbar` `size` cascades to child buttons/inputs — match Button size to TabList size on shared baselines.
- `Table` scales from simple data grids to grouped/sticky/resizable/tree tables via its hooks; pair with `PowerSearch` for tokenized filtering and `Pagination` for paging.
- `MediaTheme mode="dark" | "light"` fixes token contrast for content overlaid on media.
