---
version: alpha
name: Canva
description: "A high-energy, democratized design canvas anchored in Canva's signature purple (#7B2FBE) with white surfaces and generous doses of magenta, coral, and cyan as supporting accent energy. The system feels joyful and accessible — everything rounded, nothing intimidating. Display type is set in the Canva Sans family (a rounded grotesque) at bold weights with soft tracking, communicating creativity without requiring design expertise to feel. Surfaces are bright white with light lavender elevation, and the product experience uses a dense toolbar with icon-first communication optimized for non-designers."

colors:
  primary: "#7B2FBE"
  on-primary: "#ffffff"
  primary-hover: "#6B28A6"
  secondary: "#00C4CC"
  accent-magenta: "#FF6B9D"
  accent-coral: "#FF7043"
  ink: "#2D2D2D"
  ink-muted: "#737373"
  canvas: "#ffffff"
  surface-1: "#F5F0FF"
  surface-2: "#EDE4FF"
  border: "#E0D5F0"
  toolbar-bg: "#ffffff"

typography:
  display:
    fontFamily: "Canva Sans, Circular, -apple-system, sans-serif"
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body:
    fontFamily: "Canva Sans, Circular, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96]

radius:
  sm: 6px
  md: 12px
  lg: 20px
  pill: 9999px

shadows:
  card: "0 2px 8px rgba(0,0,0,0.08)"
  elevated: "0 8px 24px rgba(0,0,0,0.12)"
  toolbar: "0 1px 4px rgba(0,0,0,0.1)"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  easing: cubic-bezier(0.34, 1.56, 0.64, 1)
---

## 1. Visual Theme & Atmosphere
Canva is optimism made into product design. The purple brand color communicates creativity and premium quality, while the overall system stays bright, white, and friendly to avoid alienating the non-designer audience that makes up Canva's core user base. The editor surface is minimized chrome with maximum canvas — toolbars dock to edges, and everything uses icons with optional labels. Marketing pages use vibrant gradient moments and colorful template previews as the primary visual interest.

## 2. Color System
- **Primary purple**: #7B2FBE — confident, creative, used on primary CTAs and brand moments
- **Teal secondary**: #00C4CC — action highlights in the editor
- **Magenta accent**: #FF6B9D — campaign and feature highlight color
- **Canvas**: Pure white — the editor is white to not compete with user's designs
- **Surface tints**: Light lavender (#F5F0FF) for sidebars and panels, subtle purple tint
- **Ink**: #2D2D2D — warm near-black, never harsh

## 3. Typography
Canva Sans is their custom rounded grotesque — approachable and slightly playful at display sizes, clean at body. Bold (700) for headlines, medium for UI labels, regular for prose. The rounded terminals signal "safe, fun, creative" to a design-anxious audience. Letter spacing is tight but not aggressive.

## 4. Components & Patterns
- **Editor toolbar**: Icon buttons in white panels with hover fill, grouped by function
- **Template cards**: Large previews with hover overlay and "Use template" CTA
- **Primary button**: Purple fill, white text, 24px radius — very rounded
- **Upload zone**: Dashed border, drag-and-drop with happy illustrated state
- **Element panels**: Left sidebar with category tabs, scrollable grid of assets
- **Brand Kit**: Dedicated section for colors, fonts, logos — core B2B feature

## 5. Spacing & Layout
Editor: full viewport, toolbars at left (72px) and right (240px). Marketing: centered content up to 1200px. Template galleries use masonry or uniform-grid depending on category. Generous inner padding on cards (24px).

## 6. Motion & Interaction
Springy easing (cubic-bezier with overshoot) on interactive elements — buttons have a micro-bounce, panels slide in with spring physics. The editor uses smooth zoom and pan. Drag-and-drop has placeholder ghost with spring snap.

## Rationale

**Purple as creativity-without-intimidation** — Purple historically signals creative professions and premium quality without the aggression of red or the coldness of blue. For a product asking design-anxious users to "just start designing," #7B2FBE communicates artistic confidence while the white canvas and rounded shapes ensure the overall system feels safe rather than intimidating.

**Springy easing as permission to play** — The cubic-bezier with overshoot on interactive elements is a deliberate behavioral design choice: it trains users to interact more freely by making the product feel physically playful. A tool that bounces when you click it doesn't feel like a formal professional environment — which is exactly right for non-designer audiences who associate design with judgment.

**Editor white to not compete with user content** — The editor canvas and toolbar stay pure white (#ffffff / no surface tint) because users are creating colorful designs on top of it. Any hue in the product chrome would color-contaminate the design surface and make it harder to evaluate whether a design's palette actually works.

**Rounded forms as approachability signal** — Canva's 6–20px radius scale (compared to Adobe's 2–8px) is systematically rounder because roundness reduces cognitive friction for non-designers. Sharp corners signal formality and precision; rounded corners signal friendliness and accessibility. Every corner in Canva is an invitation.

**Brand Kit as the B2B anchor** — Dedicating a first-class feature to brand colors, fonts, and logos signals that Canva is serious about enterprise adoption without changing the core consumer experience. It lets teams maintain consistency while individual users retain the playful, free-form experience that makes Canva addictive.

## Accessibility

### Contrast Ratios
- **Primary on background** (#7B2FBE on #ffffff): 6.9:1 — passes AA, passes AAA
- **Text on surface** (#2D2D2D on #ffffff): 15.3:1 — passes AA
- **Muted on background** (#737373 on #ffffff): 4.6:1 — passes AA (decorative)

### Minimum Requirements
- **Touch target**: 44×44px minimum for all interactive elements
- **Focus indicator**: #7B2FBE outline, 2px, 2px offset
- **Focus contrast**: 6.9:1 against #ffffff background

### Motion
- Respects `prefers-reduced-motion`: yes — spring bounce on buttons, panel slide-in, and drag-ghost animations should reduce to instant transitions
- All transitions use `@media (prefers-reduced-motion: reduce)` guard

### Notes
- The purple primary (#7B2FBE) is one of the stronger brand primaries for accessibility — 6.9:1 on white passes AAA, making it safe for small text and icons alike
- The springy cubic-bezier easing (with overshoot above 1.0) can be disorienting for vestibular disorder users; `prefers-reduced-motion` must suppress overshooting easing in addition to duration
- Muted gray (#737373) is borderline at 4.6:1 — acceptable for secondary labels but verify at 14px; prefer using it only at 16px+ for body metadata
- The teal secondary (#00C4CC on #ffffff): approximately 2.3:1 — fails AA; do not use teal as text; restrict it to large decorative graphics and icons with adjacent text labels
