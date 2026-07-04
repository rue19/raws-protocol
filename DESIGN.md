---
name: RAW$
description: IL-aware yield optimizer on Stellar
colors:
  prussian: "#003153"
  cream: "#F7E7B4"
  noir: "#0a0f18"
  noir2: "#121926"
  mid: "#1a2744"
  dim: "#9CA3B0"
  ney-green: "#2ecc71"
  green: "#2ecc71"
  amber: "#f39c12"
  red: "#e74c3c"
  loss-red: "#e74c3c"
  cherry: "#ff4d6d"
  cherry-dim: "#c9184a"
  cherry-dark: "#a3002d"
  cotton: "#F7E7B4"
typography:
  display:
    fontFamily: "'Syne', system-ui, sans-serif"
    fontWeight: 700
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Syne', system-ui, sans-serif"
    fontWeight: 700
    fontSize: "1.75rem"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Syne', system-ui, sans-serif"
    fontWeight: 700
    fontSize: "1rem"
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.6
  label:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontWeight: 700
    fontSize: "0.625rem"
    lineHeight: 1
    letterSpacing: "0.2em"
    textTransform: "uppercase"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.cherry-dim}"
    textColor: "{colors.cotton}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.cherry-dark}"
    textColor: "{colors.cotton}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dim}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-default:
    backgroundColor: "{colors.mid}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid rgba(247, 231, 180, 0.1)"
  card-elevated:
    backgroundColor: "{colors.mid}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid rgba(247, 231, 180, 0.2)"
  input-default:
    backgroundColor: "{colors.mid}"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    border: "1px solid rgba(247, 231, 180, 0.1)"
  input-focus:
    backgroundColor: "{colors.mid}"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    border: "1px solid rgba(247, 231, 180, 0.3)"
  skeleton:
    backgroundColor: "#003153"
    rounded: "{rounded.sm}"

# Design System: RAW$

## 1. Overview

**Creative North Star: "The Vault at Dusk"**

The RAW$ interface is the control panel of a bank vault at twilight — deep Prussian blue walls, warm butter cream light, and the quiet hum of monitored assets. Every pixel communicates financial gravity and terminal-like precision. This is not a playful DeFi dashboard; this is where yield is managed with the seriousness of a treasury desk.

The system explicitly rejects the typical DeFi visual vocabulary: no purple-to-blue gradients, no floating geometric decoration, no card-nested-in-card layouts, no bounce easing, no cartoonish elements. The palette is anchored on two poles: **Prussian blue (#003153)** as the ambient environment and **butter cream yellow (#F7E7B4)** as the illuminated content — text, accents, and interactive surfaces. Cherry red (#ff4d6d) arrives only for warnings and critical actions, preserving its signal value by rarity.

**Key Characteristics:**
- Dark by default, but not black — uses deep naval blues (noir, noir2, mid) to create a layered depth without shadows
- Monospace numbers throughout — every monetary value, percentage, and health metric renders in JetBrains Mono
- Labels are universally tiny (10px), bold, uppercase, and widely tracked — a deliberate terminal-control-panel cadence
- Tonal layering replaces shadows — depth comes from color steps (prussian → noir2 → mid → cream), never from `box-shadow`
- Calm at rest, loud at alert — the default state is quiet and readable; RED_CRITICAL states are stark, high-contrast, and unambiguous

## 2. Colors

**Midnight Terminal — calm but alert.** Prussian blue wraps the environment; butter cream yellow carries content. The palette is restrained: one warm accent (cherry) for urgency, one green/amber/red semantic set for health signals.

### Primary
- **Prussian Blue** (#003153 / oklch(0.32 0.06 247)): The ambient body background. Sets the entire atmosphere. Never used as a surface for cards — reserved for the page canvas.
- **Butter Cream** (#F7E7B4 / oklch(0.91 0.06 94)): Primary text color, hero headings, key metrics. Illuminated against Prussian. This is the "light in the vault."

### Neutral
- **Noir** (#0a0f18): Deepest neutral, used for the outermost shell when needed.
- **Noir2** (#121926): Background for cards, modals, and surfaced containers.
- **Mid** (#1a2744): Elevated card surfaces, input backgrounds, secondary containers.
- **Dim** (#9CA3B0): Secondary text, labels, placeholders, disabled states. Lightened from original to pass WCAG AA (4.5:1) on Prussian background.

### Accent
- **Cherry** (#ff4d6d) / **Cherry Dim** (#c9184a) / **Cherry Dark** (#a3002d): Primary action buttons use Cherry Dim for WCAG AA contrast on cream text. Cherry itself is used for non-text accents (dots, indicators). Cherry Dark is the hover state. Used sparingly — its rarity IS its power.

### Semantic
- **NEY Green** (#2ecc71): Positive NEY scores, healthy pool indicators, confirmed transactions.
- **Amber** (#f39c12): Warning states, YELLOW health, mid-range signals.
- **Red / Loss Red** (#e74c3c): RED and RED_CRITICAL health, impermanent loss figures, error messages.

### Named Rules
**The Rarity Rule.** Cherry appears on ≤5% of any screen. Its job is to direct attention to exactly one action or warning. If two cherry elements compete on the same viewport, one of them is wrong.

**The Two-Pole Rule.** Prussian blue and butter cream yellow are the fixed poles of the system. All other colors are visitors. No new color enters the palette without being able to justify itself against both poles.

## 3. Typography

**Display Font:** Syne (with system-ui, sans-serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)  
**Mono Font:** JetBrains Mono (with monospace fallback)

**Character:** Syne brings an artistic, confident presence to headings — wide, geometric, and distinctive. Inter handles body text with clean readability and a modern, professional finish. JetBrains Mono delivers precise, developer-friendly numeric display with ligature-friendly spacing.

### Hierarchy
- **Display** (700, clamp(2.5rem–4.5rem), 1.0, -0.04em): RAW$ brand wordmark and hero headings only. Never used in-app.
- **Headline** (700, 1.75rem, 1.2, -0.02em): Page titles (Pool Explorer, Dashboard, Alerts). One per viewport.
- **Title** (700, 1rem, 1.3, 0.02em): Card titles, section headers.
- **Body** (400, 0.875rem, 1.6): Running text, descriptions, paragraph content. Max line length 65–75ch for prose.
- **Label** (700, 0.625rem, 1.0, 0.2em, uppercase): ALL UI labels — metric headers, button text, tab names, filter names. The 10px uppercase tracked label is the system's primary informational cadence.
- **Mono** (400, 0.875rem, 1.4): All numbers — amounts, percentages, NEY scores, IL figures, timestamps. Never render a number in Inter if JetBrains Mono is available.

## 4. Elevation

The system uses **tonal layering exclusively**. Depth and hierarchy are communicated through color value, never through shadows, blur, or lift effects. The layering stack from deepest to lightest:

1. **Prussian (#003153)** — page canvas
2. **Noir2 (#121926)** — card and container surfaces
3. **Mid (#1a2744)** — elevated cards, interactive surfaces, input backgrounds
4. **Cream borders at 10% opacity** — surface edges at the mid → cream boundary

A surface is one step lighter than its container. Interactive surfaces (hover, focus) step up one additional layer rather than adding a shadow. The `skeleton` loading state uses the Prussian base (same as page canvas) with a shimmer animation to the Mid color.

### Named Rules
**The No-Shadow Rule.** No surface in the system casts a shadow. Depth is purely a function of color temperature and opacity. If an element needs to feel closer, use a lighter neutral. If it needs to feel further, use a darker neutral. `box-shadow` is prohibited.

## 5. Components

### Buttons
- **Shape:** Gently curved edges (8px radius). Right angles on the trailing edge for a slight terminal-key feel.
- **Primary** (Cherry Dim #c9184a on Butter Cream text, 12px 24px padding, 10px uppercase tracked label font): The single call-to-action per viewport. Cherry is the rarest color in the system — a primary button is almost certainly the only cherry element on screen. Cherry Dim is used instead of Cherry (#ff4d6d) to meet WCAG AA 4.5:1 contrast on cream text.
- **Hover:** Cherry Dark (#a3002d) background, no transform lift (flat layering).
- **Ghost** (Transparent, Dim text, 8px 16px padding, uppercase tracked label): Secondary actions, dismiss, cancel. Hover transitions to Butter Cream text.
- **Disabled** (Mid background at reduced opacity, Dim text, cursor not-allowed): No hover state.

### Cards / Containers
- **Corner Style:** Relaxed rounded (12px radius default, 16px for elevated cards).
- **Background:** Noir2 (#121926) for standard cards, Mid (#1a2744) for elevated/modals.
- **Border:** 1px solid `rgba(247, 231, 180, 0.1)` — the cream border at minimal opacity is the only edge definition. No shadows.
- **Internal Padding:** 24px (default), 32px (elevated / modal).

### Inputs / Fields
- **Shape:** 8px radius, same as buttons.
- **Style:** Mid (#1a2744) background with 1px cream border at 10% opacity.
- **Focus:** Cream border opacity increases to 30%. No glow, no ring offset.
- **Placeholder:** Dim (#6b7280) at the required 4.5:1 contrast ratio.
- **Error:** Red (#e74c3c) border, red label text.
- **Disabled:** Reduced background opacity, dimmer text.

### Navigation
- **Style:** Top bar (sticky, Prussian background, cream border-bottom at 10% opacity). Links are Dim by default, Butter Cream on hover/active. Active route is Butter Cream with full weight.
- **Mobile:** Links fold under a hamburger; same color vocabulary.

### Health Indicators (Signature Component)
- **Signal dots** (8px, full-rounded, positioned inline next to pool/position names):
  - GREEN → NEY Green (#2ecc71) fill
  - YELLOW → Amber (#f39c12) fill
  - RED → Red (#e74c3c) fill
  - RED_CRITICAL → Red (#e74c3c) fill with pulsing ring
- **NEY Score display:** Always in JetBrains Mono, colored by health status. Always accompanied by the HealthDot so color is never the sole carrier.

### Skeleton
- **Style:** Prussian base with shimmer gradient (`#003153 → #1a2744 → #003153`), 200% background sweep, 1.4s cycle. 8px radius.

## 6. Do's and Don'ts

### Do:
- **Do** use Prussian blue (#003153) as the body background for every page.
- **Do** use Butter Cream (#F7E7B4) for all primary text and numeric values.
- **Do** render all numbers in JetBrains Mono — every amount, percentage, NEY, IL, and timestamp.
- **Do** use the 10px uppercase tracked label vocabulary for all UI labels consistently.
- **Do** layer surfaces by color value (noir2 → mid → cream-border) to convey depth without shadows.
- **Do** keep cherry elements to ≤5% of any viewport — one primary action, one alert, never more.
- **Do** include a HealthDot with every NEY score so status is communicated through shape + text + color.

### Don't:
- **Don't** use shadows, blur, or glass effects anywhere. The tonal layering system IS the elevation model.
- **Don't** use purple, indigo, cyan, or teal — these are the generic DeFi defaults and are explicitly rejected.
- **Don't** render body text in gray on a colored background. Text is either Butter Cream (primary) or Dim (secondary), always at WCAG AAA contrast.
- **Don't** use bounce or elastic easing. All transitions use ease-out quart/quint/expo curves.
- **Don't** nest cards inside cards. One card layer deep maximum.
- **Don't** add decorative backgrounds, geometric patterns, or floating shapes to fill space.
- **Don't** use gradient text (`background-clip: text` with gradient).
- **Don't** use side-stripe borders (colored `border-left` or `border-right` greater than 1px).
- **Don't** use the hero-metric template (big number / small label / gradient accent / supporting stats) — standard table/card layouts are preferred.
- **Don't** use numbered section markers (01 / 02 / 03) as decorative scaffolding.
- **Don't** animate layout properties — only opacity and transform for transitions.
- **Don't** ship any interactive component without all of: default, hover, focus, active, disabled, loading, error states.
---
