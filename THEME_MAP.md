# THEME_MAP.md — Tvara Theme
> **Single source of truth for every file in this repository.**
> Read this before touching any file. Update this after every change.
> Maintained by every developer and every AI agent — no exceptions.

---

## How to read this map

Each table entry follows this contract:

```
| `path/file.ext` | Verb-first one sentence: what it does and when it's used. |
```

Rules for writing and updating descriptions:
- **One sentence only.** No paragraphs, no lists.
- **Start with a verb.** Renders / Manages / Defines / Injects / Handles / Registers.
- **Be specific.** Name the component, section, or store it serves — not "handles stuff".
- When you create, rename, delete, or significantly repurpose a file: update this map. That update is part of the task, not cleanup after it.

---

## layout/

| File | Description |
|---|---|
| `layout/theme.liquid` | Root layout shell — loads all assets, injects `@font-face` declarations, renders header/footer groups, and Alpine.js. |
| `layout/password.liquid` | Renders the storefront password page for pre-launch access control. |

---

## templates/

| File | Description |
|---|---|
| `templates/index.json` | Composes the homepage — defines section order and default block configuration. |
| `templates/product.json` | Composes the product detail page — defines section order including product, recommendations, and reviews. |
| `templates/collection.json` | Composes the collection listing page with filters, sort, and product grid. |
| `templates/cart.json` | Composes the dedicated cart page (separate from the cart drawer). |
| `templates/search.json` | Composes the search results page with filters and result grid. |
| `templates/blog.json` | Composes the blog listing page with article cards. |
| `templates/page.json` | Composes generic content pages using flexible section blocks. |
| `templates/customers/account.json` | Composes the logged-in customer account dashboard. |
| `templates/customers/login.json` | Composes the customer login page. |
| `templates/customers/register.json` | Composes the customer registration page. |

---

## sections/

| File | Description |
|---|---|
| `sections/header.liquid` | Renders the global site header with logo, navigation, search trigger, and cart icon. |
| `sections/footer.liquid` | Renders the global site footer with links, newsletter, and social icons. |
| `sections/cart.liquid` | Renders the dedicated cart page with line items, discount input, and checkout button. |
| `sections/product.liquid` | Renders the full product detail section with gallery, variant picker, and add-to-cart. |
| `sections/collection.liquid` | Renders the collection grid with filter sidebar, sort dropdown, and pagination. |
| `sections/search.liquid` | Renders search results with filter controls and a product/content grid. |
| `sections/hero.liquid` | Renders the full-width homepage hero with image/video background and primary CTA. |
| `sections/hero-v2.liquid` | Renders an alternate hero layout variant — split text/media composition. |
| `sections/announcement-bar.liquid` | Renders market-filtered rotating promos (country/currency → block type), grid-stacked slides, section-level colors, and inline script for `--announcement-bar-height`. |
| `sections/header-group.json` | Defines the header section group — controls which sections render in the header slot. |
| `sections/footer-group.json` | Defines the footer section group — controls which sections render in the footer slot. |

> **Stub rows** — fill these in as files are confirmed or created:

| File | Description |
|---|---|
| `sections/brand-story*.liquid` | _(add description when confirmed)_ |
| `sections/featured-*.liquid` | _(add description per variant when confirmed)_ |
| `sections/shop-*.liquid` | _(add description per variant when confirmed)_ |
| `sections/selling-points*.liquid` | _(add description when confirmed)_ |
| `sections/account/*.liquid` | _(add description per file when confirmed)_ |

---

## snippets/

Each snippet also carries a **component contract header** (comment block at the top of the file itself) that documents its props, store dependencies, and CSS API. The map entry here is for discoverability only — the contract header is the authoritative detail.

| File | Description |
|---|---|
| `snippets/component-cart-drawer.liquid` | Renders the slide-out cart drawer with line items, quantity controls, and checkout CTA. |
| `snippets/component-product-card.liquid` | Renders a single product card used in collection grids, featured sections, and search results. |
| `snippets/component-filters-*.liquid` | Renders filter UI controls (facets, price range, swatches) for collection and search pages. |
| `snippets/component-nav-*.liquid` | Renders navigation elements (desktop mega-menu, mobile drawer) used by the header section. |
| `snippets/css-variables.liquid` | Injects theme CSS custom properties (colors, spacing, typography tokens) into the `<head>`. |
| `snippets/meta-tags.liquid` | Injects SEO and Open Graph meta tags into the `<head>` on every page. |

> Add new snippet rows here whenever a snippet is created.

---

## assets/ — JavaScript

### Global state (theme-state.js)

`assets/theme-state.js` is the **only** file that initializes Alpine stores that are shared across two or more unrelated components. It is not a dumping ground. The rule:

- Store used by 2+ unrelated components → lives in `theme-state.js`
- Store used by only one section or component → lives in that section/component's own JS file

| File | Description |
|---|---|
| `assets/theme-state.js` | Registers all global Alpine stores (cart, bundle, UI) inside the `alpine:init` event — the single initialization point for cross-component shared state. |

### Registered global stores

These are the Alpine stores initialized in `theme-state.js`. Update this table whenever a store is added, modified, or removed.

#### `Alpine.store('cart')`
Manages live cart state synced from Shopify. Consumed by the header cart icon, cart drawer, and cart page.

| Property | Type | Description |
|---|---|---|
| `items` | `Array` | Line items currently in the cart. |
| `item_count` | `Number` | Total item quantity — used for the cart badge. |
| `loading` | `Boolean` | True while a cart fetch is in flight — use to show spinners. |
| `fetchCart()` | `async fn` | Fetches `/cart.js` and updates `items` and `item_count`. |

**Rules:**
- `liquid-ajax-cart.js` triggers cart mutations. Do not call `/cart/add.js` or `/cart/update.js` directly.
- `loading` must be set to `true` before any fetch and `false` in the finally block.
- Never mutate `items` directly — always re-fetch via `fetchCart()` after a mutation.

---

#### `Alpine.store('bundle')`
Manages the bundle builder selection state, persisted to localStorage across page navigations.

| Property | Type | Description |
|---|---|---|
| `selected_items` | `Array` | Items the user has added to the bundle — persisted as `tvara_bundle_selected`. |
| `max_slots` | `Number` | Maximum bundle size — set at initialization, do not mutate reactively. |
| `totalPrice` | `getter` | Computed sum of `item.price` across `selected_items`. |
| `isComplete` | `getter` | True when `selected_items.length === max_slots`. |
| `addPart(item)` | `fn` | Adds an item to `selected_items` if the bundle is not yet complete. |

**Rules:**
- `selected_items` is persisted via `Alpine.$persist([]).as('tvara_bundle_selected')`. Always use the `tvara_` prefix.
- `max_slots` is a configuration value — set once, never reactively updated by user action.
- `isComplete` must be used to guard the add-to-bundle button's `:disabled` binding.

---

> Add new store tables here whenever a global store is introduced.

---

### Section JS files

| File | Description |
|---|---|
| `assets/section-hero.js` | _(add description when confirmed)_ |

> Add new `assets/section-*.js` rows here when created.

---

### Component JS files

| File | Description |
|---|---|
| `assets/component-cart-drawer.js` | Manages cart drawer open/close animation and quantity update interactions via liquid-ajax-cart. |

> Add new `assets/component-*.js` rows here when created.

---

### Core libraries (local, no CDN)

| File | Description |
|---|---|
| `assets/theme.js` | Primary theme JS entry — initializes Alpine, loads stores, and sets up global event listeners. |
| `assets/shopify.js` | Shopify-specific helpers — formatMoney, image size utilities, and section event handling. |
| `assets/customer.js` | Handles customer account page interactions — address management and order display. |
| `assets/alpinejs@3.14.8.min.js` | Local copy of Alpine.js v3.14.8 — served from assets to eliminate CDN dependency. |
| `assets/alpinejs-persist@3.14.8.min.js` | Local copy of the Alpine Persist plugin — enables `$persist` for localStorage-backed store properties. |

---

## assets/ — CSS

| File | Description |
|---|---|
| `assets/critical.css` | Above-the-fold critical styles — inlined in `<head>` to eliminate render-blocking. |
| `assets/component-cart-drawer.css` | Styles the cart drawer component using BEM: `.cart-drawer__*`. |
| `assets/component-product-card.css` | Styles the product card component using BEM: `.product-card__*`. |

> Add new `assets/section-*.css` and `assets/component-*.css` rows here when created.

---

## blocks/

| File | Description |
|---|---|
| `blocks/group.liquid` | Defines a generic block group — used to nest multiple blocks within a section's block schema. |
| `blocks/text.liquid` | Defines a rich text block — used inside sections that support inline content editing. |

---

## config/

| File | Description |
|---|---|
| `config/settings_schema.json` | Defines all Theme Editor settings — colors, typography, layout options exposed to merchants. |
| `config/settings_data.json` | Stores the merchant's saved Theme Editor values — do not edit manually. |

---

## .cursor/rules/

Cursor IDE loads `.mdc` files automatically based on the `globs` pattern defined in each file. Each rule file reinforces the constraints in `AGENTS.md` for a specific domain.

| File | Applies to | Description |
|---|---|---|
| `.cursor/rules/global.mdc` | `**/*` | Universal rules — stack constraints, naming conventions, RPI protocol reminder. |
| `.cursor/rules/cart.mdc` | `**/cart*`, `**/component-cart*` | Cart-specific rules — liquid-ajax-cart only, store mutation rules. |
| `.cursor/rules/product.mdc` | `**/product*` | Product page rules — Alpine store bindings, variant picker constraints. |
| `.cursor/rules/typography.mdc` | `**/*.css`, `**/theme.liquid` | Typography rules — @font-face placement, woff2 only, zero-CLS checklist. |
| `.cursor/rules/state.mdc` | `**/theme-state.js`, `**/*.js` | State rules — store initialization pattern, no querySelector for reactive data. |

> Add new rule files here when created.

---

## Map maintenance log

| Date | Changed by | What changed |
|---|---|---|
| Iteration 1 | Initial setup | File created — stub entries for all known files. Section and asset stubs need filling as codebase is confirmed. |
| 2026-06-01 | Announcement bar agent | Added `sections/announcement-bar.liquid`; market block types, grid stable height, inline script for `--announcement-bar-height`. |

> Every agent and developer appends a row here when they update the map.