/**
 * cart-client.js — V1
 * Vanilla Shopify Cart AJAX client with data-attribute bindings.
 * No Alpine, no jQuery, no dependencies.
 *
 * Global: window.CartClient
 * Events: cart:updated, cart:error
 */
(function () {
  'use strict';

  const DEFAULTS = {
    initialStateSelector: '[data-cart-initial-state]',
    eventUpdated: 'cart:updated',
    eventError: 'cart:error',
    processingClass: 'js-cart-processing',
    openOnAddSelector: '[data-cart-open-on-add]',
    drawerSelector: '[data-cart-drawer]',
  };

  const cartRoot = () => window.Shopify?.routes?.root || '/';

  const parseCartError = (body) => {
    if (!body?.errors) return body?.description || body?.message || 'Cart request failed';
    if (typeof body.errors === 'string') return body.errors;
    return Object.values(body.errors).flat().join('; ');
  };

  const cartRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    });
    const body = await response.json();

    if (!response.ok) {
      const error = new Error(parseCartError(body));
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  };

  const formatMoney = (cents, currency) => {
    if (typeof window.Shopify?.formatMoney === 'function' && window.Shopify?.money_format) {
      return window.Shopify.formatMoney(cents, window.Shopify.money_format);
    }

    const amount = (cents || 0) / 100;

    if (typeof Intl !== 'undefined' && currency) {
      return new Intl.NumberFormat(window.Shopify?.locale || undefined, {
        style: 'currency',
        currency,
      }).format(amount);
    }

    return `${amount.toFixed(2)} ${currency || ''}`.trim();
  };

  const parseItemFromForm = (formData) => {
    const id = Number(formData.get('id'));
    if (!id) return null;

    const item = {
      id,
      quantity: Number(formData.get('quantity') || 1),
    };

    const sellingPlan = formData.get('selling_plan');
    if (sellingPlan) item.selling_plan = Number(sellingPlan);

    const properties = {};
    for (const [key, value] of formData.entries()) {
      const match = key.match(/^properties\[(.+)\]$/);
      if (match && value !== '') properties[match[1]] = value;
    }

    if (Object.keys(properties).length) item.properties = properties;

    return item;
  };

  let config = { ...DEFAULTS };
  let queue = Promise.resolve();

  const state = {
    items: [],
    item_count: 0,
    total_price: 0,
    currency: '',
    total_discount: 0,
    cart_level_discount_applications: [],
    loading: false,
    error: null,
  };

  const dispatch = (name, detail) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const setProcessing = (loading) => {
    state.loading = loading;
    document.documentElement.classList.toggle(config.processingClass, loading);
    document.querySelectorAll('[data-cart-loading]').forEach((el) => {
      el.hidden = !loading;
    });
  };

  const applyCart = (cart) => {
    if (!cart) return;

    state.items = cart.items || [];
    state.item_count = cart.item_count ?? 0;
    state.total_price = cart.total_price ?? 0;
    state.currency = cart.currency ?? state.currency;
    state.total_discount = cart.total_discount ?? 0;
    state.cart_level_discount_applications = cart.cart_level_discount_applications || [];
    updateDOM();
  };

  const escapeSelector = (value) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, '\\$&');
  };

  const updateDOM = () => {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(state.item_count);
    });

    document.querySelectorAll('[data-cart-total]').forEach((el) => {
      el.textContent = formatMoney(state.total_price, state.currency);
    });

    document.querySelectorAll('[data-cart-total-raw]').forEach((el) => {
      el.textContent = String(state.total_price);
    });

    document.querySelectorAll('[data-cart-empty]').forEach((el) => {
      el.hidden = state.item_count > 0;
    });

    state.items.forEach((item) => {
      document.querySelectorAll(`[data-line-key="${escapeSelector(item.key)}"]`).forEach((root) => {
        root.querySelectorAll('[data-cart-line-quantity]').forEach((el) => {
          if (document.activeElement !== el) el.value = item.quantity;
        });
        root.querySelectorAll('[data-cart-line-price]').forEach((el) => {
          el.textContent = formatMoney(item.final_line_price, state.currency);
        });
        root.querySelectorAll('[data-cart-line-title]').forEach((el) => {
          el.textContent = item.product_title || item.title || '';
        });
      });
    });
  };

  const openDrawer = () => {
    document.querySelectorAll(config.drawerSelector).forEach((el) => {
      el.hidden = false;
      el.setAttribute('open', '');
    });
  };

  const closeDrawer = () => {
    document.querySelectorAll(config.drawerSelector).forEach((el) => {
      el.hidden = true;
      el.removeAttribute('open');
    });
  };

  const shouldOpenOnAdd = () =>
    document.documentElement.hasAttribute('data-cart-open-on-add') ||
    Boolean(document.querySelector(config.openOnAddSelector));

  const enqueue = (task) => {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  };

  const runMutation = (action, requestFn) =>
    enqueue(async () => {
      state.loading = true;
      state.error = null;
      setProcessing(true);

      try {
        return await requestFn();
      } catch (error) {
        state.error = error.message;
        dispatch(config.eventError, { action, error, message: error.message });
        throw error;
      } finally {
        state.loading = false;
        setProcessing(false);
      }
    });

  const emitUpdated = (action, extra = {}) => {
    dispatch(config.eventUpdated, {
      action,
      cart: { ...state, items: [...state.items] },
      ...extra,
    });
  };

  const parseInitialCart = () => {
    const el = document.querySelector(config.initialStateSelector);
    if (!el) return null;

    try {
      return JSON.parse(el.textContent);
    } catch (error) {
      console.error('cart-client: failed to parse initial state', error);
      return null;
    }
  };

  const showFormError = (form, message) => {
    const errorEl = form.querySelector('[data-cart-error]');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const clearFormError = (form) => {
    const errorEl = form.querySelector('[data-cart-error]');
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.hidden = true;
  };

  const bindForms = () => {
    document.querySelectorAll('[data-cart-add]').forEach((form) => {
      if (form.dataset.cartBound === 'true') return;
      form.dataset.cartBound = 'true';

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.loading) return;

        const item = parseItemFromForm(new FormData(form));
        if (!item) return;

        clearFormError(form);
        const submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          await CartClient.add(item);
        } catch (error) {
          showFormError(form, error.message);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });

    document.querySelectorAll('[data-cart-discount]').forEach((form) => {
      if (form.dataset.cartBound === 'true') return;
      form.dataset.cartBound = 'true';

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.loading) return;

        const input = form.querySelector('[name="discount"]');
        const code = input?.value?.trim();
        if (!code) return;

        clearFormError(form);

        try {
          await CartClient.update({ discount: code });
          if (input) input.value = '';
        } catch (error) {
          showFormError(form, error.message);
        }
      });
    });
  };

  const bindActions = () => {
    document.addEventListener('click', (event) => {
      const removeBtn = event.target.closest('[data-cart-remove]');
      if (removeBtn) {
        event.preventDefault();
        const lineKey = removeBtn.dataset.lineKey;
        if (lineKey) CartClient.change(lineKey, 0).catch(() => {});
        return;
      }

      if (event.target.closest('[data-cart-open]')) {
        event.preventDefault();
        openDrawer();
        return;
      }

      if (event.target.closest('[data-cart-close]')) {
        event.preventDefault();
        closeDrawer();
      }
    });

    document.addEventListener(
      'change',
      (event) => {
        const input = event.target.closest('[data-cart-change]');
        if (!input) return;

        const lineKey = input.dataset.lineKey;
        const quantity = parseInt(input.value, 10);
        if (!lineKey || Number.isNaN(quantity)) return;

        CartClient.change(lineKey, quantity).catch(() => {});
      },
      true
    );
  };

  const CartClient = {
    init(options = {}) {
      config = { ...DEFAULTS, ...options };

      const initial = parseInitialCart();
      if (initial) {
        applyCart(initial);
        emitUpdated('sync');
      }

      bindForms();
      bindActions();
      updateDOM();

      window.addEventListener('pageshow', (event) => {
        if (event.persisted) CartClient.fetch().catch(() => {});
      });

      return CartClient;
    },

    getState() {
      return { ...state, items: [...state.items] };
    },

    formatMoney(cents) {
      return formatMoney(cents, state.currency);
    },

    fetch() {
      return runMutation('fetch', async () => {
        const cart = await cartRequest(`${cartRoot()}cart.js`);
        applyCart(cart);
        emitUpdated('fetch');
        return cart;
      });
    },

    add(item) {
      return runMutation('add', async () => {
        const lineItem = await cartRequest(`${cartRoot()}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [item] }),
        });

        const cart = await cartRequest(`${cartRoot()}cart.js`);
        applyCart(cart);
        emitUpdated('add', { lineItem });

        if (shouldOpenOnAdd()) openDrawer();

        return { cart, lineItem };
      });
    },

    change(lineKey, quantity) {
      return runMutation('change', async () => {
        const cart = await cartRequest(`${cartRoot()}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lineKey, quantity }),
        });
        applyCart(cart);
        emitUpdated('change');
        return cart;
      });
    },

    update(updates) {
      return runMutation('update', async () => {
        const cart = await cartRequest(`${cartRoot()}cart/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        applyCart(cart);
        emitUpdated('update');
        return cart;
      });
    },

    clear() {
      return runMutation('clear', async () => {
        const cart = await cartRequest(`${cartRoot()}cart/clear.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        applyCart(cart);
        emitUpdated('clear');
        return cart;
      });
    },

    openDrawer,
    closeDrawer,
  };

  window.CartClient = CartClient;
  CartClient.init();
})();
