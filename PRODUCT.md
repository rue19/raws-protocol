# RAW$ — Real Yield. No Bullshit.

## Register

product

## Users

Retail DeFi liquidity providers on the Stellar network. Users range from crypto-native yield farmers to Stellar ecosystem participants who are comfortable with Soroban smart contracts but want a managed yield experience. Their context: monitoring multiple LP positions across protocols (Aquarius, Soroswap, Phoenix, RAW$ AMM), tracking impermanent loss, and optimizing real yield net of IL.

## Product Purpose

RAW$ is an IL-aware yield optimizer on Stellar. It lets LPs deposit into the best yielding pools, auto-compounds rewards, and provides a Smart Exit mechanism when a pool's Net Effective Yield (NEY) turns negative. The goal is to maximize real yield while protecting users from sustained impermanent loss. Success means users can trust the platform to monitor, compound, and rebalance their positions autonomously.

## Brand Personality

**Bold. Financial. Trustworthy.**

- **Bold** — The interface doesn't hedge. Dark background, high-contrast accents (cherry red for warnings, green for positive NEY), large typography for key metrics. Confidence over caution.
- **Financial** — Borrows visual gravity from TradFi (terminal-like monospace numbers, structured data tables, precise decimal formatting) without being cold. The emotion is "serious about your money."
- **Trustworthy** — Transparency about what's happening: every transaction shown, every fee disclosed, clear health indicators. No gamification, no unnecessary animation, no hype.

## Anti-references

- **No typical DeFi tropes.** No purple-to-blue gradients, no floating geometric shapes as decoration, no animated particle backgrounds, no card-nested-in-card layouts. No "moon" or "rocket" emojis. No faux-3D or isometric illustrations.
- **No SaaS template energy.** Doesn't look like a generic dashboard template. Every component serves a purpose; nothing is decorative scaffolding.
- **Not a meme coin site.** Zero cartoonish elements. No bounce easing. No gradient text. The tone is "terminal first, web app second."

## Design Principles

1. **Data first, chrome second.** Every pixel should either convey information or enable an action. Remove anything purely decorative.
2. **Terminal honesty.** Monospace numbers, precise values, clear units. Users should feel they can audit the math.
3. **Health as the primary signal.** The entire interface orbits around pool health (NEY). Color, layout, and navigation all prioritize surfacing which positions need attention.
4. **One tool, one task.** No multi-purpose components. Each control does exactly one thing, labeled exactly for that thing.
5. **Invisible when working, loud when alerting.** The default state is calm and readable. Alerts (RED_CRITICAL) are deliberately stark — high-contrast red, clear exit paths, no ambiguity.

## Accessibility & Inclusion

- WCAG AAA target (7:1 contrast for body text, 4.5:1 for large text).
- Reduced motion respected — all animations opt in via `prefers-reduced-motion`.
- Color is never the sole carrier of meaning; health status is conveyed through shape/icon + text + color.
- Keyboard navigable throughout.
- Focus indicators visible on all interactive elements.
