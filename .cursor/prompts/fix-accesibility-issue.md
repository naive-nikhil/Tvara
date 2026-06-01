# Fix Accessibility Issue

> **Tvara theme.** Follow `AGENTS.md` RPI (Research → Plan → wait for approval → Implement). Update `THEME_MAP.md` after changes. Ignore references to Horizon-specific rules or commands that do not exist in this repo.

Analyze and fix accessibility issues in Tvara components with minimal, surgical changes.

## Usage

```
Fix accessibility issue in [COMPONENT_NAME]
```

## Before you start

1. Read `THEME_MAP.md` — locate the component snippet, section, and assets.
2. Read the snippet's **component contract header** (top comment block).
3. Search the codebase for existing ARIA patterns in the same component family.
4. Present a plan and wait for approval (AGENTS.md Phase 2).

## Component-specific guidance

There are no separate `.mdc` accessibility rule files in Tvara. Use these in-repo references:

| Component area | Start here |
|---|---|
| Cart drawer | `snippets/component-cart-drawer.liquid`, `assets/component-cart-drawer.js` |
| Navigation | `snippets/component-nav-*.liquid` |
| Product card | `snippets/component-product-card.liquid` |
| Filters | `snippets/component-filters-*.liquid` |
| Modals | `snippets/component-product-media-modal.liquid` |
| Predictive search | `snippets/component-predictive-search.liquid` |

Apply WAI-ARIA patterns appropriate to the component. Prefer native HTML (`<dialog>`, `<details>`, `<button>`) over custom JS toggles where possible — see `.cursor/rules/html-standards.mdc`.

## Accessibility principles

### Critical implementation rules

- **Role must be on the element that contains the items** — not the wrapper
- **Screen readers need direct parent-child relationship** between role and items
- **Test with actual screen readers**, not just markup validation

### Focus management

- **Consistent focus behavior** across keyboard and mouse
- **Reset focus properly** when closing dropdowns/menus with ESC vs selection
- **Centralize focus logic** in the component's custom element JS where possible

### Implementation guidelines

- **Make minimal changes** that improve accessibility
- **Focus on semantic correctness** over visual changes
- **Don't over-engineer** — native browser behavior often suffices
- **Use `aria-labelledby`** when referencing existing visible text instead of duplicating with `aria-label`

### Code quality

- **Avoid duplicate logic** between keyboard and mouse handlers
- **Use custom elements** for imperative behavior — no new `DOMContentLoaded` listeners (AGENTS.md §5b)
- **No inline `<script>` in Liquid** — behavior changes go in paired `assets/*.js`

## Post-task

- [ ] Update `THEME_MAP.md` if files changed
- [ ] Update snippet component contract header if props or CSS API changed
- [ ] Note non-obvious choices in `DECISIONS.md` if applicable
