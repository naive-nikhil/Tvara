# DECISIONS.md — Architecture Decision Records

Short-lived log of non-obvious choices. Update when an agent or developer makes a decision future sessions should inherit.

---

## ADR-001 — Inline script vs Custom Elements (2026-06-01)

**Context:** The announcement bar only needs to measure its content height and set `--announcement-bar-height` for header/nav layout. An agent extracted this into `announcement-bar-height` custom element + `assets/section-announcement-bar.js`.

**Decision:** Use a **few-line inline `<script>`** after the section markup when logic is minimal (no listeners, no lifecycle, no state). Use **Custom Elements in paired `assets/*.js`** when behavior is non-trivial (multiple listeners, cleanup, fetch, shared instances, etc.). Never use `DOMContentLoaded` for either.

**Consequences:** `sections/announcement-bar.liquid` keeps its inline height script. `AGENTS.md` §5b, `.cursor/rules/global.mdc`, `rules-of-enagagment.mdc`, and `javascript-standards.mdc` document the rule. Forbidden-actions row #8 in `AGENTS.md` now targets large script blocks, not all inline scripts.

**Example:** Announcement bar height — inline script in `announcement-bar.liquid`. Cart drawer open/close — `component-cart-drawer.js` custom element.

---

## ADR-002 — Announcement bar market block types (2026-06-01)

**Context:** Promos differ by country/market; merchants need per-region copy, colors, and optional carousel per market.

**Decision:** One Shopify block **type** per region (`us`, `cad`, `uk`, `eur`, …). Liquid at the top of `announcement-bar.liquid` maps `localization.country.iso_code` (and `currency.iso_code == 'EUR'` for Eurozone) to the active type. Only matching blocks render; fallback to `us` if none configured. Legacy types `announcement_us` / `announcement` still match US.

**Consequences:** Merchants add/configure each regional block in the theme editor. Country→block mapping lives in the section liquid; extend the `case` / EUR rule when adding regions.

---

## ADR-003 — Native cart via theme-state.js (2026-06-10)

**Context:** `liquid-ajax-cart.js` fires redundant network calls (minimum add + update for section HTML) and binds cart UI through imperative DOM attributes. The theme needs sub-1s cart mutations and a single Alpine store consumed by header, drawer, and cart page.

**Decision:** Replace `liquid-ajax-cart.js` with a native cart layer in `assets/theme-state.js`. All Cart AJAX API calls go **only** through `Alpine.store('cart')` methods in that file. Dispatch `tvara:cart:updated` after mutations.

**Consequences:** `AGENTS.md` §3 and forbidden-action #2 updated. All cart UI binds to `$store.cart`. `liquid-ajax-cart-v2.1.1.js` removed in Phase 6 (2026-06-10). Components use `tvara:cart:updated` exclusively.
