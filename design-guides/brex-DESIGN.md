---
version: alpha
name: Brex
description: "A premium corporate finance platform built on a near-black canvas (#0A0A0A) with white text and a warm amber-gold accent (#F5A623) that appears on key CTAs and card metallic moments. Brex's visual language communicates wealth, trust, and modernity — this is financial infrastructure for companies that take themselves seriously. Typography is set in a custom geometric sans at tight tracking and high contrast weights. The card imagery uses gradient metal textures (black to charcoal with subtle gold sheen). The overall feel is more like a premium credit card brand than a fintech startup — deliberate, assured, and status-signaling."

colors:
  primary: "#F5A623"
  on-primary: "#0A0A0A"
  primary-hover: "#E8951A"
  ink: "#F8F8F8"
  ink-muted: "#888888"
  canvas: "#0A0A0A"
  surface-1: "#141414"
  surface-2: "#1E1E1E"
  border: "#2A2A2A"
  card-start: "#1A1A1A"
  card-end: "#0A0A0A"
  gold-accent: "#F5A623"
  light-canvas: "#FFFFFF"
  light-surface: "#F5F5F5"
  light-ink: "#0A0A0A"

typography:
  display:
    fontFamily: "Brex Sans, Inter, -apple-system, sans-serif"
    fontSize: 52px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.03em
  body:
    fontFamily: "Brex Sans, Inter, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: -0.01em

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]

radius:
  sm: 4px
  md: 8px
  lg: 16px
  card: 12px
  pill: 9999px

shadows:
  card: "0 4px 16px rgba(0,0,0,0.4)"
  elevated: "0 8px 40px rgba(0,0,0,0.5)"
  glow: "0 0 40px rgba(245,166,35,0.15)"

motion:
  duration-fast: 120ms
  duration-base: 240ms
  easing: cubic-bezier(0.4, 0, 0.2, 1)
---

## Rationale

**Near-black as premium positioning** — #0A0A0A communicates the same premium sensibility as a matte black credit card. Brex's first customers were YC startups who saw their corporate card as a status signal — the brand needed to feel like Amex Centurion, not a bank debit card. The dark canvas delivers that luxury register without saying a word.

**Gold sparingly, not liberally** — Using #F5A623 only on key moments (approved credit display, card metallics, select CTAs) prevents it from reading as garish. Gold used everywhere becomes a Vegas slot machine; gold used precisely reads as achievement and approval — exactly the emotion Brex wants when a new credit limit is activated.

**White dashboard for data density** — The pivot to white in the expense dashboard acknowledges that premium branding and analytical clarity have different requirements. Finance teams reviewing hundreds of transactions need maximum contrast and legibility; the dark marketing palette would make data tables harder to scan.

**Tight display tracking as financial precision** — The -0.03em letter spacing at display sizes communicates exactitude — the same visual quality that makes a financial term sheet feel authoritative. Loose or casual tracking would undermine the message that Brex is infrastructure for serious companies.

**Physical card render as hero artifact** — Building the brand outward from a 3D card render rather than abstract imagery grounds the identity in the physical object that companies actually carry. It says "this is a real financial product" and provides a premium visual anchor that works across every marketing touchpoint.

## 1. Visual Theme & Atmosphere
Brex is fintech that doesn't feel like fintech. The dark canvas communicates premium and modern over safe and institutional. The Brex card — a sleek black card with gold typography — is the product's most powerful design artifact, and the brand builds outward from it. Gold appears sparingly, used to signal approved credit and key moments rather than as a dominant UI color. The dashboard product uses whites and light grays for data density; the marketing site uses the dark palette for drama.

## 2. Color System
**Dark marketing palette**:
- Canvas: #0A0A0A — nearly true black, confident and premium
- Gold accent: #F5A623 — used on hero CTAs, card metallic details, key highlights
- Ink: #F8F8F8 — warm white for legibility against dark surfaces
- Surfaces: #141414 / #1E1E1E — subtle layering without lightening the overall darkness

**Product dashboard (light)**:
- Canvas: #FFFFFF — clean, high-contrast data environment
- Light surfaces: #F5F5F5 — panel backgrounds
- Primary still #F5A623 for interactive states

## 3. Typography
Brex Sans (Inter-derived custom) at 600 weight with -0.03em tracking at display sizes. The tight tracking communicates precision and financial exactitude. Body runs at -0.01em, slightly tighter than neutral. No expressive serifs — the identity is modern and technical.

## 4. Components & Patterns
- **Physical card render**: 3D-ish hero with gradient dark surface and embossed gold type
- **Spend analytics**: Chart components with amber/gold highlight bars, clean data labels
- **Transaction list**: Dense table, merchant logo + name + amount + category, minimal borders
- **Limit display**: Large number typography, gold accent on credit available
- **Dashboard cards**: White panels with bold KPIs and subdued supporting text
- **CTA button**: Dark + gold on marketing; standard blue-action in product

## 5. Spacing & Layout
Marketing: full-bleed dark sections, 1440px max, hero sections 100vh. Product: standard dashboard with 240px sidebar, content area max 1200px. Card component: 85.6×54mm credit card aspect ratio (standard ISO/IEC 7810).

## 6. Motion & Interaction
Card hero rotates subtly on mouse parallax. Dashboard numbers animate in with count-up on load. Transaction feed loads with skeleton shimmer. Transitions use 240ms with ease — premium feel, not sluggish.

## Accessibility

### Contrast Ratios
- **Primary on background** (#F5A623 on #0A0A0A): 9.8:1 — passes AA, passes AAA
- **Text on background** (#F8F8F8 on #0A0A0A): 18.6:1 — passes AA, passes AAA
- **Muted on background** (#888888 on #0A0A0A): 5.6:1 — passes AA, fails AAA

### Minimum Requirements
- **Touch target**: 44×44px minimum for all interactive elements
- **Focus indicator**: #F5A623 outline, 2px, 2px offset
- **Focus contrast**: 9.8:1 against #0A0A0A background

### Motion
- Respects `prefers-reduced-motion`: yes — all transitions and animations should be suppressed
- All transitions use `@media (prefers-reduced-motion: reduce)` guard

### Notes
- The dark canvas is a strength for accessibility: amber #F5A623 achieves an excellent 9.8:1 on near-black, well past the AAA threshold for normal text.
- Card parallax and count-up animations on the dashboard should be disabled under `prefers-reduced-motion`; count-up in particular can be disorienting for users with vestibular disorders.
- Muted text #888888 at 5.6:1 comfortably passes AA for body text on the dark canvas — use with confidence for secondary information.
- When rendering amber text over the card's gradient-metal texture, verify the contrast locally against the lightest gradient stop rather than against the flat canvas value.
