---
version: alpha
name: Reddit
description: "A friendly, community-first UI where OrangeRed (#FF4500) drives upvotes and brand moments against a clean white canvas, rounded cards and the Snoo mascot keep millions of niche communities approachable across light and dark themes."

colors:
  primary: "#FF4500"
  on-primary: "#FFFFFF"
  primary-hover: "#E03D00"
  primary-pressed: "#CC3700"
  upvote: "#FF4500"
  downvote: "#7193FF"
  ink: "#1A1A1B"
  ink-muted: "#576F76"
  ink-subdued: "#7C7C7C"
  canvas: "#FFFFFF"
  surface-1: "#FFFFFF"
  surface-2: "#F6F7F8"
  surface-3: "#DAE0E6"
  border: "#EDEFF1"
  border-strong: "#CCCCCC"
  link: "#0079D3"
  success: "#46D160"
  warning: "#FFB000"
  danger: "#EA0027"

typography:
  display:
    fontFamily: "Reddit Sans, IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  heading:
    fontFamily: "Reddit Sans, IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0em
  body:
    fontFamily: "Reddit Sans, IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  mono:
    fontFamily: "IBM Plex Mono, SFMono-Regular, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]

radius:
  sm: 4px
  md: 8px
  lg: 16px
  pill: 9999px

shadows:
  card: "0 1px 3px rgba(0,0,0,0.10)"
  elevated: "0 2px 8px rgba(0,0,0,0.16)"
  popover: "0 4px 16px rgba(0,0,0,0.20)"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  easing: cubic-bezier(0.2, 0, 0, 1)
---

## Rationale

**OrangeRed means "this counts"** — Reddit's #FF4500 is the most loaded color in the system because it is the upvote. Across every feed, comment thread, and award, that orange-red signals approval, energy, and the brand itself (Snoo's belly, the logo, the "join" buttons). Keeping it bound to votes and primary actions means the color always reads as community endorsement rather than decoration — when a post glows orange, the crowd has spoken.

**A neutral canvas so a billion topics can coexist** — Reddit hosts everything from quantum physics to cat memes, and the chrome cannot have an opinion about any of it. The UI is a near-neutral white-and-grey frame (#FFFFFF canvas, #F6F7F8 and #DAE0E6 greys) engineered to disappear so that user content, thumbnails, and subreddit styling carry the personality. Each community can theme its banner and accents; the shell stays quiet on purpose.

**Friendly and rounded, never corporate** — Snoo is a doodle, not a logotype, and the interface matches that informal warmth. Generous 8–16px corner radii, soft card shadows, and a compact 14px body create a surface that feels like a hangout rather than a productivity tool. The roundness is the brand's emotional signature: approachable, a little playful, built for lurking and belonging.

**Light and dark as equal citizens** — Redditors live in the app at 2am as much as at noon, so dark mode is a first-class theme, not an afterthought. Every neutral and semantic token is paired with a dark counterpart, while OrangeRed holds across both as the constant. The downvote periwinkle (#7193FF) is tuned to stay legible on both the white canvas and the near-black dark surface.

## 1. Visual Theme & Atmosphere
Reddit feels like an endless, friendly bulletin board. The white canvas recedes behind a vertical stream of rounded post cards, each separated by soft grey gutters rather than hard rules. Depth is communicated through light card shadows and subtle surface steps (#F6F7F8 hovers, #DAE0E6 dividers) — never heavy chrome. The atmosphere is casual and content-forward: thumbnails, text previews, and vote counts dominate, while the shell stays minimal.

The signature element is the vote arrow pair flanking every post and comment — the orange upvote and periwinkle downvote that turn the whole feed into a living tally. Snoo appears at empty states, error screens, and onboarding as the friendly face of the system, keeping even a 404 feeling human.

## 2. Color System
**Neutral foundation**:
- Canvas: #FFFFFF — page and card background
- Surface 2: #F6F7F8 — feed background, input fields, hover fills
- Surface 3: #DAE0E6 — section dividers, classic-theme page background
- Border: #EDEFF1 — card edges and hairline dividers
- Border strong: #CCCCCC — input outlines, focused edges

**Vote & brand action**:
- OrangeRed: #FF4500 — upvote active, primary buttons, brand mark
- Hover: #E03D00 — pointer-over on primary
- Pressed: #CC3700 — confirms a commit
- Downvote: #7193FF — periwinkle, the downvote active state

**Text**:
- Primary ink: #1A1A1B — titles, comment body, headings
- Muted: #576F76 — metadata, timestamps, "posted by" lines
- Subdued: #7C7C7C — disabled and tertiary text
- Link: #0079D3 — hyperlinks, usernames, subreddit references

**Semantic**:
- Success: #46D160 — online presence, positive confirmations
- Warning: #FFB000 — rate-limit and caution notices
- Danger: #EA0027 — remove/report actions, errors

OrangeRed is never used for body text or large background fills behind content — it marks the upvote and the primary action, and overuse would dilute the "this counts" signal.

## 3. Typography
Reddit Sans is the platform's bespoke typeface — a warm, slightly rounded humanist sans that reads cleanly at the small sizes a dense comment tree demands, with IBM Plex Sans and the system stack as fallbacks so threads render instantly. The roundness of the letterforms echoes Snoo and the soft card corners, keeping the voice friendly rather than clinical.

Display and post titles run 18–32px; section and modal headings 18px Semibold; body and comments 14px/400. The type ramp stays compact because Reddit optimizes for reading throughput — a hot thread can be thousands of comments deep, so every line of vertical space matters.

IBM Plex Mono renders code blocks and inline `code` spans, which matter enormously on technical subreddits like r/programming and r/askscience. Monospace cleanly separates a snippet from prose the way it does everywhere — a stack trace is not a sentence.

## 4. Components & Patterns
**Post card**:
- Rounded card with optional thumbnail/preview, title (18px), and flair tag
- Leading vote column with up/down arrows and a tallied score
- Footer row: comment count, share, save, award, and "..." overflow
- Subreddit and author byline in muted text with link-blue references

**Vote arrows**:
- Paired up/down chevrons flanking posts and comments
- Active upvote fills OrangeRed (#FF4500); active downvote fills periwinkle (#7193FF)
- Score number recolors to match the active vote direction

**Comment thread**:
- Nested, indented replies with vertical collapse lines per depth level
- Tap a thread line to collapse/expand a subtree
- Each comment carries its own vote arrows, byline, and karma

**Subreddit header**:
- Community banner image with circular subreddit icon overlapping the edge
- Subscriber count, online count (#46D160 dot), and a "Join" pill in OrangeRed
- About, rules, and moderator panels in the right rail on web

**Karma & awards**:
- Karma totals shown on profiles and post/comment scores
- Award tray with gilded/animated icons triggered from the footer row
- Trophy case and badges on the user profile

**Feed sort bar**:
- Horizontal tabs: Hot, New, Top, Rising with a "best" default
- Card/compact view toggle and a community/everywhere scope switch
- Sticky to the top of the feed on scroll

**Composer**:
- Tabbed post type: Text, Image/Video, Link, Poll
- Subreddit picker, flair selector, and rich-text/markdown toggle
- Inline OrangeRed "Post" button gated until a community is chosen

**Chat & inbox**:
- Direct messages and chat threads with presence dots
- Notification inbox for replies, mentions, and mod actions
- Unread items marked with an OrangeRed dot

**Snoo empty states**:
- Snoo mascot illustrations on 404s, empty feeds, and onboarding
- Friendly copy that keeps errors and dead-ends approachable
- Used to humanize moments the user would otherwise find frustrating

## 5. Spacing & Layout
Reddit uses a 4px base grid for compact information density. Card internal padding is 12–16px; the gap between stacked post cards is 8–12px. Comment indentation steps by ~16px per nesting level, with collapse lines keeping deep threads readable.

The web layout is a centered content column (~640px feed) with an optional right rail (~312px) for the subreddit about box, rules, and related communities. Mobile collapses to a single full-width column with edge gutters of 8–16px. The classic Reddit theme widens to a denser multi-column list; the redesign favors the card stream.

Vote columns reserve a fixed ~40px leading width so scores align vertically down the feed. Sticky headers (feed sort, subreddit header on scroll) keep navigation anchored while long threads scroll beneath.

## 6. Motion & Interaction
**Vote feedback**: tapping an arrow fills it with the vote color and bumps the score with a brief number-flip at 100ms — immediate confirmation the vote registered.

**Thread collapse**: tapping a comment's collapse line folds its subtree with a 200ms height ease using `cubic-bezier(0.2, 0, 0, 1)`, keeping spatial context as deep threads contract.

**Card hover**: on web, post cards lift slightly with a deeper shadow and a #F6F7F8 background on hover, signaling the whole card is tappable.

**Award animation**: gilding a post plays a short celebratory shimmer on the award icon, the one place Reddit indulges decorative motion.

**Skeleton loading**: grey (#F6F7F8) placeholder cards with a soft shimmer fill the feed while posts load, matched to real card dimensions to avoid layout shift.

## Accessibility

### Contrast Ratios
- **#1A1A1B ink on #FFFFFF canvas**: 17.9:1 — passes AAA
- **#576F76 muted on #FFFFFF**: 4.9:1 — passes AA
- **#7C7C7C subdued on #FFFFFF**: 4.0:1 — fails AA for normal text; use for large/disabled text only
- **#FFFFFF on #FF4500 primary**: 3.3:1 — fails AA for small text; CTA labels use 14px+ bold
- **#0079D3 link on #FFFFFF**: 4.5:1 — passes AA (borderline)
- **#7193FF downvote on #FFFFFF**: 2.6:1 — fails AA; used as iconography, paired with the score number
- **#EA0027 danger on #FFFFFF**: 4.6:1 — passes AA
- **#46D160 success on #FFFFFF**: 1.8:1 — fails AA; used as a presence dot/icon, never as text

### Minimum Requirements
- **Touch target**: 44×44px minimum — vote arrows carry generous hit-padding despite their small glyphs
- **Focus indicator**: 2px solid #0079D3 outline with 2px offset on interactive elements
- **Vote state**: never color-only — active votes also change the score's weight and expose an aria-pressed state
- **Keyboard**: full tab/arrow navigation through feed, votes, and collapsible threads

### Motion
- Respects `prefers-reduced-motion`: yes — vote bumps, thread-collapse eases, and award shimmer reduce to instant state changes
- Essential feedback (vote active, focus, collapse) remains via color/icon and position, never animation-only

### Notes
- OrangeRed (#FF4500) on white achieves only 3.3:1 — it must back white 14px+ bold text or serve as an icon/fill, never as small body text
- The periwinkle downvote (#7193FF) at 2.6:1 is decorative iconography; the tallied score must accompany it in #1A1A1B ink for screen readers
- Every neutral and semantic token has a dark-theme counterpart; OrangeRed holds constant across themes as the brand anchor
- Subreddit custom theming must be validated so community-chosen accent colors still meet 4.5:1 against their text
