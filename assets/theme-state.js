const CART_INITIAL_STATE_SELECTOR = '[data-tvara-cart-initial-state]';

export const getCartStore = () => {
  if (typeof Alpine === 'undefined') return null;
  return Alpine.store('cart');
};

const cartRoot = () => window.Shopify?.routes?.root || '/';

const parseInitialCart = () => {
  const el = document.querySelector(CART_INITIAL_STATE_SELECTOR);
  if (!el) return null;

  try {
    return JSON.parse(el.textContent);
  } catch (error) {
    console.error('theme-state: failed to parse cart initial state', error);
    return null;
  }
};

const parseCartError = (body) => {
  if (!body?.errors) return body?.description || body?.message || 'Cart request failed';
  if (typeof body.errors === 'string') return body.errors;
  return Object.values(body.errors).flat().join('; ');
};

const cartRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
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

const dispatchCartEvent = (action, detail = {}) => {
  window.dispatchEvent(
    new CustomEvent('tvara:cart:updated', {
      detail: { action, ...detail },
    })
  );
};

let queue = Promise.resolve();

const enqueue = (task) => {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
};

const applyCartFields = (store, cart) => {
  if (!cart) return;

  store.items = cart.items || [];
  store.item_count = cart.item_count ?? 0;
  store.total_price = cart.total_price ?? 0;
  store.currency = cart.currency ?? '';
  store.total_discount = cart.total_discount ?? 0;
  store.cart_level_discount_applications = cart.cart_level_discount_applications || [];
};

const setProcessingClass = (loading) => {
  document.documentElement.classList.toggle('js-cart-processing', loading);
};

const runMutation = (store, action, requestFn) =>
  enqueue(async () => {
    store.loading = true;
    store.error = null;
    setProcessingClass(true);

    try {
      return await requestFn();
    } catch (error) {
      store.error = error.message;
      dispatchCartEvent('error', { action, error });
      throw error;
    } finally {
      store.loading = false;
      setProcessingClass(false);
    }
  });

document.addEventListener('alpine:init', () => {
  Alpine.store('cart', {
    items: [],
    item_count: 0,
    total_price: 0,
    currency: '',
    total_discount: 0,
    cart_level_discount_applications: [],
    loading: false,
    error: null,

    applyCart(cart) {
      applyCartFields(this, cart);
      dispatchCartEvent('sync', { cart });
    },

    formatMoney(cents) {
      const amount = (cents || 0) / 100;

      if (typeof window.Shopify?.formatMoney === 'function' && window.Shopify?.money_format) {
        return window.Shopify.formatMoney(cents, window.Shopify.money_format);
      }

      if (typeof Intl !== 'undefined' && this.currency) {
        return new Intl.NumberFormat(window.Shopify?.locale || undefined, {
          style: 'currency',
          currency: this.currency,
        }).format(amount);
      }

      return `${amount.toFixed(2)} ${this.currency}`;
    },

    itemProperties(item) {
      return Object.entries(item?.properties || {})
        .filter(([name, value]) => name.charAt(0) !== '_' && value !== '')
        .map(([name, value]) => ({ name, value }));
    },

    fetchCart() {
      return runMutation(this, 'fetch', async () => {
        const cart = await cartRequest(`${cartRoot()}cart.js`);
        this.applyCart(cart);
        return cart;
      });
    },

    add(item) {
      return runMutation(this, 'add', async () => {
        const lineItem = await cartRequest(`${cartRoot()}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [item] }),
        });

        const cart = await cartRequest(`${cartRoot()}cart.js`);
        applyCartFields(this, cart);
        dispatchCartEvent('add', { cart, lineItem });
        return { cart, lineItem };
      });
    },

    change(lineKey, quantity) {
      return runMutation(this, 'change', async () => {
        const cart = await cartRequest(`${cartRoot()}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lineKey, quantity }),
        });
        applyCartFields(this, cart);
        dispatchCartEvent('change', { cart });
        return cart;
      });
    },

    update(updates) {
      return runMutation(this, 'update', async () => {
        const cart = await cartRequest(`${cartRoot()}cart/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        applyCartFields(this, cart);
        dispatchCartEvent('update', { cart });
        return cart;
      });
    },
  });

  const initialCart = parseInitialCart();
  if (initialCart) {
    applyCartFields(Alpine.store('cart'), initialCart);
  }
});

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  getCartStore()?.fetchCart?.();
});
