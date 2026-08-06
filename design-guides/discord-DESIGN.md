---
version: alpha
name: Discord
description: "A community communication platform built around the iconic blurple (#5865F2) on a dark three-tone surface system — deep background (#313338), elevated panels (#2B2D31), and the darkest modals (#1E1F22). The UI reads as game-adjacent without being garish: rounded shapes, expressive emoji reactions, status indicators in four meaningful colors, and a sidebar that holds entire community architectures. Typography uses GGSans (Discord's custom typeface) — a rounded geometric grotesque that's playful but still legible at chat density. Blurple appears on primary CTAs, active channel indicators, and the brand itself — a color so tied to Discord it's named in community vocabulary."

colors:
  primary: "#5865F2"
  on-primary: "#ffffff"
  primary-hover: "#4752C4"
  secondary: "#57F287"
  accent-yellow: "#FEE75C"
  accent-red: "#ED4245"
  ink: "#DBDEE1"
  ink-muted: "#949BA4"
  canvas: "#313338"
  surface-1: "#2B2D31"
  surface-2: "#1E1F22"
  surface-3: "#111214"
  border: "#3F4147"
  online: "#23A55A"
  idle: "#F0B232"
  dnd: "#F23F43"
  offline: "#80848E"

typography:
  display:
    fontFamily: "GGSans, Inter, -apple-system, sans-serif"
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: -0.02em
  body:
    fontFamily: "GGSans, Inter, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: 0

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 48, 64]

radius:
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  pill: 9999px

shadows:
  card: "0 1px 2px rgba(0,0,0,0.3)"
  elevated: "0 8px 16px rgba(0,0,0,0.24)"
  modal: "0 0 0 1px rgba(255,255,255,0.08), 0 16px 40px rgba(0,0,0,0.5)"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  easing: cubic-bezier(0.4, 0, 0.2, 1)
---

## 1. Visual Theme & Atmosphere
Discord is a dark-native product that doesn't offer light mode as a primary experience — its community of gamers and creators expect the dark surface. The three-surface stack (background, elevated, deep) creates natural depth without brightness. Blurple (#5865F2) is one of the most brand-loyal colors in tech — users call it by its name, and it appears on virtually every platform where Discord is discussed. The system is dense and feature-rich (servers, channels, voice, threads, forums) yet remains navigable through strong spatial hierarchy.

## 2. Color System
Four-depth surface system:
- **Background**: #313338 — the base chat and channel surface
- **Elevated**: #2B2D31 — sidebar, elevated panels
- **Deep**: #1E1F22 — modals, context menus, overlays
- **Deepest**: #111214 — drop shadows and extreme depth
- **Blurple**: #5865F2 — CTAs, active channel indicator, role colors
- **Status four-way**: Online #23A55A / Idle #F0B232 / DnD #F23F43 / Offline #80848E
- **Semantic**: Green (join/success), Yellow (warning), Red (error, DnD)

## 3. Typography
GGSans is Discord's custom typeface — rounded terminals, high x-height, designed for screen legibility at chat scale. Bold (800) for display and server names. Regular (400) for message body. The 16px/1.375 line-height creates a comfortable chat density — slightly tighter than document reading but not cramped.

## 4. Components & Patterns
- **Server list**: Far-left column, circular server icons, notification badge top-right, unread indicator left bar
- **Channel list**: Sidebar in #2B2D31, category headers in small-caps, text/voice/thread/forum channel types
- **Message thread**: Avatar + username + timestamp header, then message body; reactions row below
- **Voice channel**: Video grid of participant tiles, control bar at bottom
- **Role badges**: Pill-shaped, role color background, username color inheritance
- **Slash commands**: Autocomplete popup above message input

## 5. Spacing & Layout
Three-column: server list (72px) + channel list (240px) + content. Message padding: 16px horizontal, 2px between same-author messages, 16px between different authors. Member panel (240px) optional on right.

## 6. Motion & Interaction
Message send: optimistic instant insert. Reaction add: count bounces. New message notification: subtle slide-in from bottom of channel. Voice join: smooth tile reflow. User mention: recipient sees @highlight pulse.

## Rationale

**Blurple as community property** — #5865F2 is one of the most culturally owned brand colors in tech — Discord users named it "blurple" before Discord codified the term. The color choice in 2015 was deliberate differentiation: in a market of blue (Facebook Messenger, Skype) and green (WhatsApp) communication apps, a purple-shifted blue stood out while remaining legible and professional.

**Dark-native, no forced light mode** — Discord's early user base was gamers who already lived in dark environments (games, IDEs, streaming setups). Building dark-first rather than retrofitting it sent a cultural signal: this is your environment, not a corporate productivity tool you're tolerating. The dark default became an identity marker that users actively defend.

**Three-surface depth stack** — The three distinct dark levels (#313338, #2B2D31, #1E1F22) create spatial hierarchy without requiring shadows or borders. Users learn the depth language: the background is the chat, the sidebar is slightly elevated, modals are deeper. This spatial vocabulary allows extremely dense UI without visual chaos.

**GGSans rounded letterforms** — The slight roundness in Discord's custom typeface matches the app's community tone — it's approachable and slightly informal without reading as childish. At chat density (continuous message streams), rounded letters improve rhythm and reduce the visual harshness of dense text blocks.

**Four-status system as social infrastructure** — The Online/Idle/DnD/Offline status palette isn't just presence indication — it's the foundation of Discord's social contract. Users have internalized these colors as communication norms ("don't ping me when I'm DnD"). The colors needed to be distinct at small sizes, culturally neutral, and semantically unambiguous — hence the specific four-color set.

## Accessibility

### Contrast Ratios
- **Primary on background** (#5865F2 on #313338): 3.1:1 — passes AA for large text only, fails AA for normal text
- **Text on surface** (#DBDEE1 on #313338): 9.6:1 — passes AA
- **Muted on background** (#949BA4 on #313338): 4.5:1 — passes AA (decorative)

### Minimum Requirements
- **Touch target**: 44×44px minimum for all interactive elements
- **Focus indicator**: #5865F2 outline, 2px, 2px offset
- **Focus contrast**: 3.1:1 against #313338 — supplement with a non-color indicator (e.g. white inner glow or offset) to meet AA

### Motion
- Respects `prefers-reduced-motion`: yes — reaction bounces, notification slide-ins, and mention pulses should be suppressed
- All transitions use `@media (prefers-reduced-motion: reduce)` guard

### Notes
- Dark-native UI means body text (#DBDEE1) achieves strong contrast on all surfaces — the primary accessibility strength of this palette
- Blurple (#5865F2) on the dark canvas falls below AA for normal text — use it only as an icon or large interactive element color, not as body or label text
- Status colors (online green #23A55A, idle yellow #F0B232) are meaningful status indicators — always pair with text labels or icons, never rely on color alone for status communication
- The deepest surface (#111214) combined with primary text achieves near-maximum contrast; modals and context menus are the most accessible surfaces in the system
