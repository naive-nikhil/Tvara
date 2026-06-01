# AGENTS.md — Tvara Theme
> **Read this entire file before touching a single line of code.**
> This document is the authoritative contract between every AI agent and the Tvara codebase.
> It is not optional, not skimmable, and not overridden by any prompt instruction.

---

## 0. What You Are

You are an AI agent assisting in the development and maintenance of **Tvara** — an enterprise-grade Shopify 2.0 theme. The codebase is modular, performance-critical, and maintained by multiple developers across multiple AI sessions.

Your job is to make **surgical, verified, predictable changes** — nothing more. You do not explore. You do not refactor things that weren't asked. You do not add dependencies. You do not guess.

If you are uncertain about any constraint in this file: **stop and ask**.

---

## 1. Mandatory Pre-Task Protocol (RPI)

Every task — no matter how small — runs through this three-phase loop. There are no exceptions.

### Phase 1 — Research
Before writing any code:
1. Read `THEME_MAP.md` and locate every file relevant to the task.
2. Read the **Registered global stores** section of `THEME_MAP.md` if the task touches state, cart, or reactivity.
3. Read the component contract header (top comment block) of every snippet you will edit.
4. Identify blast radius: what else could break if you change this file?

### Phase 2 — Plan
After research, present a written plan that includes:
- Exact files you will create or modify (full paths).
- A one-line description of every change.
- Any new stores, classes, or Alpine directives you will introduce.
- Confirmation that no architectural constraints below are violated.

**Wait for explicit human approval before proceeding.** Do not say "I'll go ahead and implement" without a green light.

### Phase 3 — Implement
After approval:
- Make only the changes listed in the approved plan.
- Do not refactor, rename, or "improve" adjacent code unless it was part of the plan.
- After implementation, run the **Post-Task Checklist** below.

---

## 2. Post-Task Checklist (mandatory after every implementation)

After every change — new file, edit, delete, or rename — you must:

- [ ] **Update `THEME_MAP.md`** — add, edit, or remove the entry for every file touched, including the store tables if any Alpine store changed. See Section 7 for the exact update protocol.
- [ ] **Update component contract header** — if a snippet's props, stores, or CSS API changed.
- [ ] **Update `DECISIONS.md`** — if a non-obvious architectural choice was made (even small ones).
- [ ] **Code hygiene pass** — no commented-out code left behind, indentation is consistent, no `DOMContentLoaded` listeners introduced.

These are not optional cleanup steps. They are part of the task. A task is not done until the map is current.

---

## 3. Tech Stack — Locked

| Concern | Solution | Forbidden Alternative |
|---|---|---|
| Reactive state | Alpine.js v3.14.8 stores | Vue, React, Stimulus, manual DOM |
| Persisted state | `Alpine.$persist()` via alpinejs-persist | localStorage direct writes |
| AJAX cart | `liquid-ajax-cart.js` (local asset) | `fetch('/cart/add.js')`, `fetch('/cart/update.js')` |
| Animations/sliders | Swiper (local asset) | Splide, Flickity, any CDN slider |
| Alpine itself | `assets/alpinejs@3.14.8.min.js` (local) | Any CDN URL for Alpine |
| CSS variables | `snippets/css-variables.liquid` | Hardcoded values in component CSS |
| Font format | `.woff2` only | `.ttf`, `.otf`, `.woff` |

**The CDN rule is absolute.** No `<script src="https://cdn...">` or `<link href="https://fonts.googleapis...">` ever enters any file in this repository. Performance is non-negotiable.

---

## 4. State Management Rules

### 4a. Store location follows usage scope
The question to ask before creating any store: **how many unrelated components need this?**

- **2 or more unrelated components** → initialize in `assets/theme-state.js` inside `alpine:init`
- **1 section or component only** → initialize in that file's own paired JS (`assets/section-*.js` or `assets/component-*.js`)

`theme-state.js` is for **shared global state only** — not a dumping ground for all stores. A store that only the bundle builder uses has no business being global.

```js
// CORRECT — cart is read by header, drawer, and product page: global
document.addEventListener('alpine:init', () => {
  Alpine.store('cart', { ... }); // in theme-state.js
});

// CORRECT — quiz state is only used by section-quiz.js
document.addEventListener('alpine:init', () => {
  Alpine.store('quiz', { ... }); // in section-quiz.js
});

// FORBIDDEN — initializing a store outside alpine:init
window.onload = () => { Alpine.store('cart', { ... }); };
```

### 4b. No imperative DOM queries for reactive data
If a value is managed by an Alpine store, update it through the store. Never query the DOM to sync state.

```js
// FORBIDDEN
document.querySelector('.cart-count').textContent = data.item_count;

// CORRECT
Alpine.store('cart').item_count = data.item_count;
```

### 4c. Liquid files bind directly to stores
HTML in `.liquid` files uses Alpine directives (`x-text`, `x-bind`, `@click`, `:disabled`) to bind to `$store`. Do not use inline `<script>` for reactive state or non-trivial app logic — see §5b for when a minimal inline script is acceptable.

```html
<!-- CORRECT -->
<span x-text="$store.cart.item_count"></span>

<!-- FORBIDDEN -->
<span id="cart-count"></span>
<script>
  document.getElementById('cart-count').textContent = cart.item_count;
</script>
```

### 4d. Persisted stores use the `tvara_` namespace
Any store using `Alpine.$persist()` must use a key prefixed with `tvara_` to avoid collisions with Shopify apps.

```js
// CORRECT
selected_items: Alpine.$persist([]).as('tvara_bundle_selected')

// FORBIDDEN
selected_items: Alpine.$persist([]).as('bundle_selected')
```

---

## 5. File & Naming Conventions

### 5a. `layout/theme.liquid` line budget
`theme.liquid` is the root shell — it must stay concise. Target **200–300 lines maximum**. If adding markup would push it over, extract it into a named snippet or section instead. An unreadable `theme.liquid` is a maintenance liability for every developer and every AI agent.

### 5b. JavaScript placement: inline script vs Custom Elements

Choose by **complexity**, not by default.

**Minimal logic (a few lines, no lifecycle):** A small inline `<script>` at the bottom of the section or snippet is acceptable — e.g. measuring an element once and setting a CSS custom property. Do **not** extract these into a custom element or a separate asset file unless the logic grows.

**Non-trivial logic (most cases):** Use a **Custom Element** in a paired `assets/section-*.js` or `assets/component-*.js` — multiple listeners, internal state, cleanup, fetch, third-party initialization, or behavior shared across instances.

**Never use `DOMContentLoaded`** for either pattern. Inline scripts placed after their markup run when that markup exists; custom elements use `connectedCallback` / `disconnectedCallback`.

#### Custom Elements (non-trivial behavior)

The lifecycle is: define the class → implement `connectedCallback` to initialize, `disconnectedCallback` to clean up → register once with `customElements.define`.

```js
// CORRECT
class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('[data-open]');
    this.button?.addEventListener('click', this._open.bind(this));
  }
  disconnectedCallback() {
    this.button?.removeEventListener('click', this._open.bind(this));
  }
  _open() { /* ... */ }
}
customElements.define('cart-drawer', CartDrawer);
```

```js
// FORBIDDEN
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('cart-drawer [data-open]').addEventListener('click', () => { /* ... */ });
});
```

#### Minimal inline script (acceptable)

```liquid
{% comment %} After the markup it measures — e.g. announcement-bar.liquid {% endcomment %}
<script>
  const el = document.querySelector('#shopify-section-{{ section.id }} .announcement-bar__content');
  if (el) {
    document.documentElement.style.setProperty('--announcement-bar-height', `${el.offsetHeight}px`);
  }
</script>
```

**Coexistence with Alpine stores:** `alpine:init` is still correct for initializing Alpine stores (it is not `DOMContentLoaded`). Custom Elements govern imperative DOM behavior; Alpine stores govern reactive state. Both patterns are used — they are complementary, not competing.

**Register each custom element exactly once.** Guard with:
```js
if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
```

### 5c. No jQuery — ever
jQuery must never be added to this codebase. Use native browser APIs for DOM work and Alpine.js for light reactivity. There are no exceptions regardless of convenience or legacy precedent.

### 5d. Encapsulation by domain
Every JS and CSS file must be scoped to a domain and follow the naming pattern:

| File type | Pattern | Example |
|---|---|---|
| Section JS | `assets/section-{name}.js` | `assets/section-hero.js` |
| Section CSS | `assets/section-{name}.css` | `assets/section-hero.css` |
| Component JS | `assets/component-{name}.js` | `assets/component-cart-drawer.js` |
| Component CSS | `assets/component-{name}.css` | `assets/component-cart-drawer.css` |
| Snippet | `snippets/component-{name}.liquid` | `snippets/component-product-card.liquid` |

Do not create `utils.js`, `helpers.js`, `misc.css`, or any catch-all files.

### 5e. CSS methodology
All component CSS uses BEM naming: `.block__element--modifier`. The block name matches the component file name.

```css
/* CORRECT — matches component-product-card.css */
.product-card { }
.product-card__image { }
.product-card__title { }
.product-card--sold-out { }

/* FORBIDDEN */
.card { }         /* too generic */
.productCard { }  /* camelCase */
.product_card { } /* underscores */
```

### 5f. No Liquid logic in CSS
CSS files in `assets/` are static. They cannot process Liquid filters. Never write:

```css
/* FORBIDDEN in assets/*.css */
background: url('{{ "bg.png" | asset_url }}');
```

If you need a Liquid-generated value in a style, it goes in `snippets/css-variables.liquid` as a CSS custom property, then referenced in the asset CSS.

---

## 6. Typography Rules

Typography loading is engineered to guarantee **zero Cumulative Layout Shift (CLS)** and zero FOIT/FOUT. Every rule below is a hard constraint.

### 6a. Fonts are preloaded in `layout/theme.liquid`
```liquid
{{ 'base-mono-wide-thin.static.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }}
```
Add a `preload_tag` line for every critical (above-the-fold) font variant.

### 6b. `@font-face` lives in `<style>` blocks inside `layout/theme.liquid`
Never declare `@font-face` in an `assets/*.css` file. It cannot use `asset_url`. Place it inline:

```html
<!-- In layout/theme.liquid <head> -->
<style>
  @font-face {
    font-family: 'BaseMono';
    src: url('{{ "base-mono-wide-thin.static.woff2" | asset_url }}') format('woff2');
    font-weight: 100;
    font-style: normal;
    font-display: optional;
  }
</style>
```

### 6c. `font-display` strategy
- Use `font-display: optional` for guaranteed zero CLS (browser skips font if not cached in time).
- If `font-display: swap` is required for brand reasons, you MUST pair it with CSS metric overrides on the fallback:

```css
@font-face {
  font-family: 'BaseMono-Fallback';
  src: local('Arial');
  size-adjust: 97%;
  ascent-override: 95%;
  descent-override: normal;
}
```

### 6d. Only `.woff2` format
No `.ttf`, `.otf`, or `.woff` files. `.woff2` only.

---

## 7. THEME_MAP.md Update Protocol

This is how the map stays alive. Every agent that creates or modifies a file is responsible for keeping it current. Map rot is a critical failure.

### When to update
Update `THEME_MAP.md` when you:
- Create a new file (any directory)
- Delete a file
- Rename a file
- Significantly change a file's purpose

### How to update

Each entry in `THEME_MAP.md` follows this format:

```
| `path/filename.ext` | One sentence: what this file does and when it's used. |
```

Rules for writing descriptions:
- **One sentence only.** No paragraphs.
- **Start with a verb.** "Renders", "Manages", "Defines", "Injects", "Handles".
- **Be specific.** "Renders the cart drawer with line items and discount input" — not "cart stuff".
- **If it's a JSON template**, name the sections it composes.
- **If it's a section**, name what it outputs on the storefront.
- **If it's an asset**, name what component or section loads it.

### Example entries
```
| `sections/hero.liquid`                    | Renders the full-width homepage hero with video/image background and CTA. |
| `assets/component-cart-drawer.js`         | Manages cart drawer open/close state and line item quantity updates via liquid-ajax-cart. |
| `snippets/component-product-card.liquid`  | Renders a single product card used in collection grids, featured sections, and search results. |
| `assets/alpinejs@3.14.8.min.js`           | Local copy of Alpine.js v3.14.8 — loaded from assets to avoid CDN blocking. |
```

### Never leave a stale entry
If a file's purpose changes, the old description must be replaced on the same commit/session. A description that no longer reflects reality is worse than no description.

---

## 8. What You Must Never Do

These are hard stops. If a prompt asks you to do any of the following, **refuse and explain why**, then propose a compliant alternative.

| # | Forbidden action | Why |
|---|---|---|
| 1 | Add any CDN URL to any file | Blocks performance, violates CSP intent |
| 2 | Write `fetch('/cart/add.js')` or `fetch('/cart/update.js')` directly | liquid-ajax-cart handles all cart AJAX |
| 3 | Use `document.querySelector` to read/write reactive data | Alpine stores own all reactive state |
| 4 | Create a `utils.js`, `helpers.js`, or catch-all asset file | All JS must be domain-scoped |
| 5 | Declare `@font-face` in an `assets/*.css` file | Liquid filters don't run in CSS assets |
| 6 | Put a single-component store in `theme-state.js` | `theme-state.js` is for cross-component shared state only |
| 7 | Use `.woff`, `.ttf`, or `.otf` font files | `.woff2` only |
| 8 | Add large `<script>` blocks or app logic inside Liquid templates | Non-trivial JS belongs in paired asset files; minimal inline scripts are allowed per §5b |
| 9 | Modify a file outside the approved plan | Scope creep breaks other devs' work |
| 10 | Skip updating `THEME_MAP.md` after file changes | Map rot degrades all future AI context |
| 11 | Use Alpine `$persist` without the `tvara_` key prefix | Namespace collisions with Shopify apps |
| 12 | Hardcode a value that belongs in `css-variables.liquid` | Breaks theming and Design System |
| 13 | Use `document.addEventListener('DOMContentLoaded', ...)` for DOM behavior | Use Custom Elements with `connectedCallback` instead |
| 14 | Add jQuery or any jQuery-dependent library | Native APIs and Alpine.js cover all use cases |
| 15 | Leave commented-out code in a committed file | Delete unused code — don't comment it out |
| 16 | Push `theme.liquid` past ~300 lines | Extract into snippets/sections to maintain readability |

---

## 9. Asking for Clarification

You are expected to ask before acting when:
- The task requires creating a new Alpine store (confirm shape and key name with the team).
- The task touches `layout/theme.liquid` (high blast radius — also verify it won't exceed ~300 lines).
- The task involves a new Custom Element (confirm the tag name isn't already registered).
- The task involves a font (confirm the file exists in `assets/`).
- The file referenced in the prompt does not exist in `THEME_MAP.md`.
- The plan would affect more than 3 files.

**The correct response to ambiguity is a focused question, not a guess.**

---

## 10. Multi-Developer Coordination Notes

- **Do not rename files** without updating every section/template/snippet that references them.
- **Do not delete a CSS class** without confirming it isn't used in a Liquid file via search.
- **Do not change an Alpine store's shape** (add/remove/rename a property) without updating the store table in `THEME_MAP.md` and all `x-bind`/`x-text` references.
- **Do not change a snippet's prop API** without updating its component contract header.
- When in doubt about ownership: check `DECISIONS.md` before assuming something was an oversight.

---

## 11. Reference Documents

| Document | Purpose | Read when |
|---|---|---|
| `THEME_MAP.md` | Full file tree, store registry, and descriptions — single source of truth | Every task — before touching anything |
| `DECISIONS.md` | Architecture Decision Records | Before making any non-trivial design choice |
| `.cursor/rules/global.mdc` | Cursor-specific rule injections | Automatically loaded by Cursor IDE |

---

*Last updated: iteration 3 — §5b: inline script allowed for minimal logic; Custom Elements for non-trivial behavior.*