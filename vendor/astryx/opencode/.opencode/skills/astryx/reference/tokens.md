# All Tokens

Complete reference for spacing, color, radius, typography, shadow, motion, and size tokens. Use via `var(--token)` in `style`/`className` (e.g. `bg-[var(--color-background-surface)]`).

## Color Tokens

Semantic colors for consistent theming. All colors use light-dark() for automatic mode switching.

| Token | Light | Dark |
| --- | --- | --- |
| --color-accent | #0064E0 | #2694FE |
| --color-accent-muted | #0082FB33 | #0082FB3F |
| --color-on-accent | #FFFFFF | #FFFFFF |
| --color-neutral | light-dark(rgba(5, 54, 89, 0.1), rgba(223, 226, 229, 0.2)) | (same) |
| --color-background-surface | #FFFFFF | #1F1F22 |
| --color-background-body | #F1F4F7 | #111112 |
| --color-overlay | #01122866 | #11111299 |
| --color-overlay-hover | #0536590C | #FFFFFF0C |
| --color-overlay-pressed | #05365919 | #FFFFFF19 |
| --color-background-muted | #0536590C | #1111127F |
| --color-text-primary | #0A1317 | #DFE2E5 |
| --color-text-secondary | #4E606F | #AAAFB5 |
| --color-text-disabled | #A4B0BC | #6F747C |
| --color-text-accent | #0064E0 | #3E9EFB |
| --color-on-dark | #FFFFFF | #FFFFFF |
| --color-on-light | #000000 | #000000 |
| --color-icon-accent | #0064E0 | #2694FE |
| --color-icon-primary | #0A1317 | #DFE2E5 |
| --color-icon-secondary | #4E606F | #AAAFB5 |
| --color-icon-disabled | #A4B0BC | #6F747C |
| --color-background-card | #FFFFFF | #1F1F22 |
| --color-background-popover | #FFFFFF | #28292C |
| --color-background-inverted | #0A1317 | #FFFFFF |
| --color-background-error-inverted | #AA071E | #E3193B |
| --color-success | #0D8626 | #0D8626 |
| --color-success-muted | #0B991F33 | #0B991F3F |
| --color-on-success | #FFFFFF | #FFFFFF |
| --color-error | #E3193B | #F5394F |
| --color-error-muted | #E3193B33 | #E3193B3F |
| --color-on-error | #FFFFFF | #FFFFFF |
| --color-warning | #E9AF08 | #F2C00B |
| --color-warning-muted | #E2A40033 | #E2A4003F |
| --color-on-warning | #0A1317 | #0A1317 |
| --color-border | #05365919 | #F2F4F619 |
| --color-border-emphasized | #CCD3DB | #494D53 |
| --color-skeleton | #CCD3DB | #5A5E66 |
| --color-track | #CCD3DB | #5A5E66 |
| --color-shadow | light-dark(rgba(5, 54, 89, 0.1), rgba(0, 0, 0, 0.3)) | (same) |
| --color-tint-hover | black | white |
| --color-background-blue | #0171E333 | #0171E333 |
| --color-border-blue | #0064E0 | #2694FE |
| --color-icon-blue | #0064E0 | #2694FE |
| --color-text-blue | #042F97 | #AFD7FF |
| --color-background-cyan | #03A7D733 | #03A7D733 |
| --color-border-cyan | #089DD0 | #0171A4 |
| --color-icon-cyan | #00ACC1 | #26C6DA |
| --color-text-cyan | #014975 | #A1EEF9 |
| --color-background-gray | #0A131733 | #666A724C |
| --color-border-gray | #647685 | #748695 |
| --color-icon-gray | #4E606F | #AAAFB5 |
| --color-text-gray | #0A1317 | #E7EAED |
| --color-background-green | #24BB5E33 | #24BB5E33 |
| --color-border-green | #0D8626 | #0B991F |
| --color-icon-green | #0D8626 | #26A756 |
| --color-text-green | #09441F | #A5F690 |
| --color-background-orange | #F2790233 | #F2790233 |
| --color-border-orange | #EB6E00 | #B34A01 |
| --color-icon-orange | #E9690B | #FB8C00 |
| --color-text-orange | #6B2203 | #FDB876 |
| --color-background-pink | #E638B333 | #E638B333 |
| --color-border-pink | #F351C0 | #C02294 |
| --color-icon-pink | #C2185B | #EC407A |
| --color-text-pink | #650053 | #FEADE3 |
| --color-background-purple | #7952FF33 | #7952FF33 |
| --color-border-purple | #9081FF | #7340FE |
| --color-icon-purple | #5B08D8 | #7952FF |
| --color-text-purple | #3E0697 | #B3B0FE |
| --color-background-red | #E3193B33 | #E3193B33 |
| --color-border-red | #E3193B | #F5394F |
| --color-icon-red | #D31130 | #E3193B |
| --color-text-red | #7B0210 | #FFB2B8 |
| --color-background-teal | #0DB7AF33 | #0DB7AF33 |
| --color-border-teal | #08A3A3 | #08767D |
| --color-icon-teal | #009688 | #26A69A |
| --color-text-teal | #083943 | #40DCCD |
| --color-background-yellow | #E2A40033 | #E2A40033 |
| --color-border-yellow | #C58600 | #B47700 |
| --color-icon-yellow | #FBC02D | #FFEE58 |
| --color-text-yellow | #753F07 | #FBCE03 |

## Spacing Tokens

Spacing scale for padding, gap, and margin. Component gap props map spacing steps to these tokens.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| --spacing-0 | 0px | --spacing-5 | 20px |
| --spacing-0-5 | 2px | --spacing-6 | 24px |
| --spacing-1 | 4px | --spacing-7 | 28px |
| --spacing-1-5 | 6px | --spacing-8 | 32px |
| --spacing-2 | 8px | --spacing-9 | 36px |
| --spacing-3 | 12px | --spacing-10 | 40px |
| --spacing-4 | 16px | --spacing-11 | 44px |
| --spacing-12 | 48px | | |

## Size Tokens

Control heights for buttons, inputs, and selectors.

| Token | Value |
| --- | --- |
| --size-element-sm | 28px |
| --size-element-md | 32px |
| --size-element-lg | 36px |

## Border Tokens

| Token | Value |
| --- | --- |
| --border-width | 1px |

## Radius Tokens

Numeric scale based on a 4dp base unit; scales with the theme's radius multiplier (--radius-none and --radius-full are fixed).

| Token | Value |
| --- | --- |
| --radius-none | 0px |
| --radius-inner | 4px |
| --radius-element | 8px |
| --radius-container | 12px |
| --radius-page | 28px |
| --radius-chat | 28px |
| --radius-full | 9999px |

## Shadow Tokens

Elevation shadows (low → med → high) and inset shadows for input state rings.

| Token | Value |
| --- | --- |
| --shadow-low | 0px 1px 1px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)), 0px 2px 8px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)) |
| --shadow-med | 0px 1px 2px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)), 0px 2px 12px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)) |
| --shadow-high | 0px 2px 2px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)), 0px 8px 24px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.3)) |
| --shadow-inset-hover | inset 0px 0px 0px 2px light-dark(rgba(5, 54, 89, 0.15), rgba(223, 226, 229, 0.2)) |
| --shadow-inset-selected | inset 0px 0px 0px 2px rgba(1, 113, 227, 0.5) |
| --shadow-inset-success | inset 0px 0px 0px 2px rgba(38, 167, 86, 0.3) |
| --shadow-inset-warning | inset 0px 0px 0px 2px rgba(226, 164, 0, 0.3) |
| --shadow-inset-error | inset 0px 0px 0px 2px rgba(227, 25, 59, 0.3) |

## Duration Tokens

Three bands: fast (micro-interactions), medium (entrance/exit), slow (continuous). Min/max variants derive from base × ratio.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| --duration-fast-min | 130ms | --duration-medium-max | 550ms |
| --duration-fast | 175ms | --duration-slow-min | 730ms |
| --duration-fast-max | 230ms | --duration-slow | 975ms |
| --duration-medium-min | 310ms | --duration-slow-max | 1300ms |
| --duration-medium | 410ms | | |

## Easing Tokens

| Token | Value |
| --- | --- |
| --ease-standard | cubic-bezier(0.24, 1, 0.4, 1) |

## Font Family Tokens

| Token | Value |
| --- | --- |
| --font-family-body | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif |
| --font-family-code | "SF Mono", Monaco, Consolas, monospace |
| --font-family-heading | -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif |

## Font Size Tokens

Geometric type scale: round(14 × 1.2^step). Base is 14px (--font-size-base).

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| --font-size-4xs | 0.375rem | --font-size-lg | 1.0625rem |
| --font-size-3xs | 0.4375rem | --font-size-xl | 1.25rem |
| --font-size-2xs | 0.5rem | --font-size-2xl | 1.5rem |
| --font-size-xs | 0.625rem | --font-size-3xl | 1.8125rem |
| --font-size-sm | 0.75rem | --font-size-4xl | 2.1875rem |
| --font-size-base | 0.875rem | --font-size-5xl | 2.625rem |

## Font Weight Tokens

| Token | Value |
| --- | --- |
| --font-weight-normal | 400 |
| --font-weight-medium | 500 |
| --font-weight-semibold | 600 |
| --font-weight-bold | 700 |

## Type Scale Tokens

Semantic tokens for headings, body, labels, code, supporting, and display text. Override via typography.scale in defineTheme.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| --text-heading-1-size | var(--font-size-2xl) | --text-body-leading | 1.4286 |
| --text-heading-1-weight | var(--font-weight-semibold) | --text-large-size | var(--font-size-lg) |
| --text-heading-1-leading | 1.3333 | --text-large-weight | var(--font-weight-semibold) |
| --text-heading-2-size | var(--font-size-xl) | --text-large-leading | 1.4118 |
| --text-heading-2-weight | var(--font-weight-semibold) | --text-label-size | var(--font-size-base) |
| --text-heading-2-leading | 1.4 | --text-label-weight | var(--font-weight-medium) |
| --text-heading-3-size | var(--font-size-lg) | --text-label-leading | 1.4286 |
| --text-heading-3-weight | var(--font-weight-semibold) | --text-code-size | var(--font-size-base) |
| --text-heading-3-leading | 1.4118 | --text-code-weight | var(--font-weight-normal) |
| --text-heading-4-size | var(--font-size-base) | --text-code-leading | 1.4286 |
| --text-heading-4-weight | var(--font-weight-semibold) | --text-supporting-size | var(--font-size-sm) |
| --text-heading-4-leading | 1.4286 | --text-supporting-weight | var(--font-weight-normal) |
| --text-heading-5-size | var(--font-size-sm) | --text-supporting-leading | 1.6667 |
| --text-heading-5-weight | var(--font-weight-semibold) | --text-display-1-size | var(--font-size-5xl) |
| --text-heading-5-leading | 1.6667 | --text-display-1-weight | var(--font-weight-normal) |
| --text-heading-6-size | var(--font-size-xs) | --text-display-1-leading | 1.2381 |
| --text-heading-6-weight | var(--font-weight-semibold) | --text-display-2-size | var(--font-size-4xl) |
| --text-heading-6-leading | 1.6 | --text-display-2-weight | var(--font-weight-normal) |
| --text-body-size | var(--font-size-base) | --text-display-2-leading | 1.2571 |
| --text-body-weight | var(--font-weight-normal) | --text-display-3-size | var(--font-size-3xl) |
| --text-display-3-weight | var(--font-weight-normal) | --text-display-3-leading | 1.2414 |
