---
version: alpha
name: Cash App
description: "A consumer money-transfer app with the boldest visual identity in fintech — true black (#000000) canvas, white text, and Cash App's signature bright green (#00D64F) used exclusively on the send/pay CTA. The app is deliberately stripped of financial anxiety: large dollar amounts, a single input screen, and a pay flow that takes three taps. The $Cashtag identity system (personalized @handle for payments) and Cash Card (customizable debit card) make money feel personal. Typography is heavy and direct — no serifs, no uncertainty. The aesthetic communicates: sending money should feel as casual as texting."

colors:
  primary: "#00D64F"
  on-primary: "#000000"
  primary-hover: "#00BF46"
  ink: "#FFFFFF"
  ink-muted: "#8A8A8A"
  canvas: "#000000"
  surface-1: "#1A1A1A"
  surface-2: "#242424"
  border: "#333333"
  pay-green: "#00D64F"
  request-blue: "#4A90E2"
  cash-card-bg: "#1ED760"
  success: "#00D64F"
  danger: "#FF3B30"

typography:
  display:
    fontFamily: "Cash Market, Inter, -apple-system, sans-serif"
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.02em
  body:
    fontFamily: "Cash Market, Inter, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  amount:
    fontFamily: "Cash Market, Inter, -apple-system, sans-serif"
    fontSize: 52px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.02em

spacing:
  base: 8px
  scale: [8, 16, 24, 32, 48, 64]

radius:
  sm: 8px
  md: 16px
  lg: 24px
  card: 16px
  pill: 9999px

shadows:
  card: "0 4px 16px rgba(0,0,0,0.5)"
  elevated: "0 8px 32px rgba(0,0,0,0.6)"

motion:
  duration-fast: 80ms
  duration-base: 180ms
  easing: cubic-bezier(0.34, 1.56, 0.64, 1)
---

## Rationale

**True black as cultural positioning** — Black is the color of streetwear and style culture, not traditional banking. Cash App's #000000 canvas targets younger, style-conscious users who see the product as a lifestyle statement rather than a utility. It's the same instinct behind a black Amex card — color communicates who the product is for before a word is read.

**Green for pay and nothing else** — Using #00D64F exclusively on the send/pay action creates an unambiguous behavioral shortcut: green means "money is moving." The discipline of never using green for anything else (no success states, no confirmations, no decorative elements) is what makes the green button feel powerful rather than habitual.

**Full-screen amount input** — Dedicating the entire screen to the dollar amount eliminates cognitive load and communicates that the transaction amount is the only thing that matters in this moment. It's an anxiety-reduction decision: by not showing balance, available credit, or warnings during entry, the app treats paying a friend as a casual, unconflicted act.

**Custom amount typography token** — The 52px/700 "amount" style has no parallel in most design systems. Cash App invented it because the dollar figure in a peer-to-peer payment is a social object — it should feel real and substantial, not like a form input value. Large, bold, centered type makes $20 feel like $20.

**Mobile-only, thumb-reach optimized** — The 56px minimum tap target and full-width components aren't just accessibility compliance — they reflect that Cash App is used one-handed, standing up, often while distracted. Every interaction is designed for the most constrained possible usage context.

## 1. Visual Theme & Atmosphere
Cash App is the best-designed money transfer product ever built. The decision to use black as the primary surface is counterintuitive for finance (where trust traditionally means blue and white) but completely on-brand for a product that targets younger, style-conscious users. Green means pay. The amount input is the entire screen. The pay button is the entire bottom. There are no explanations, no disclaimers dominating the UI, no anxiety. Sending $20 to a friend should feel like sending a meme.

## 2. Color System
Maximum simplicity:
- **Canvas**: #000000 — true black, confident and bold
- **Green**: #00D64F — the pay button, and only the pay button; it means "send money now"
- **Surfaces**: #1A1A1A / #242424 — barely lighter than canvas for card differentiation
- **Ink**: #FFFFFF — bright white on black, maximum contrast
- **Muted**: #8A8A8A — balance labels, secondary info
- **Cash Card green**: #1ED760 — slightly different green (Spotify-adjacent) for the physical card design

## 3. Typography
Cash Market (custom typeface) — bold, geometric, no-nonsense. Used at large weights across the app. The amount input field is the typographic hero: 52px weight-700, center-aligned, it makes the dollar value feel real and significant. Body uses 500 weight even at reading sizes — this system doesn't whisper.

## 4. Components & Patterns
- **Pay screen**: Full-screen dollar amount input (numpad), $Cashtag or contact search, green Pay button bottom
- **Activity feed**: Transaction rows with $Cashtag avatar, name, amount (green +, red -), timestamp
- **Cash Card**: Customizable card design selector, dark card render with embossed $Cashtag
- **Boost offers**: Merchant discount cards in horizontal scroll strip
- **Bitcoin/Stocks**: Sparkline charts, green/red delta, tap to buy/sell single-stock

## 5. Spacing & Layout
Mobile only. Full-viewport pay screen. Bottom navigation: 4 tabs. Content 100% width, 16–24px horizontal padding. Large tap targets (minimum 56px). Everything optimized for thumb reach.

## 6. Motion & Interaction
Pay confirmation: green fill animation from button up. Amount input: haptic feedback on each digit. Request sent: brief success overlay. Bitcoin price: real-time tick with color flash. All spring-eased.

## Accessibility

### Contrast Ratios
- **Primary on background** (#00D64F on #000000): 10.7:1 — passes AA, passes AAA
- **Text on background** (#FFFFFF on #000000): 21.0:1 — passes AA, passes AAA
- **Muted on background** (#8A8A8A on #000000): 6.1:1 — passes AA, fails AAA

### Minimum Requirements
- **Touch target**: 44×44px minimum for all interactive elements
- **Focus indicator**: #00D64F outline, 2px, 2px offset
- **Focus contrast**: 10.7:1 against #000000 background

### Motion
- Respects `prefers-reduced-motion`: yes — all transitions and animations should be suppressed
- All transitions use `@media (prefers-reduced-motion: reduce)` guard

### Notes
- Pure black canvas is the strongest possible background for contrast — all text and the green accent easily clear AAA thresholds.
- The green pay-confirmation fill animation is a signature interaction; under `prefers-reduced-motion` replace it with an instant state change to the success screen.
- Real-time Bitcoin price tick with color flash should be suppressed under `prefers-reduced-motion`; a simple numeric update with no color transition is sufficient.
- Muted #8A8A8A at 6.1:1 passes AA but not AAA on black — acceptable for secondary metadata; avoid for legal or transactional text where AAA is preferred.
