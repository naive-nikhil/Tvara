import { debounce } from './theme.js';
import { getCartStore } from './theme-state.js';

export class CartQuantity extends HTMLElement {
  connectedCallback() {
    this.lineKey = this.dataset.lineKey;
    this.input = this.querySelector('[data-quantity-input]');
    this.minusBtn = this.querySelector('[data-quantity-minus]');
    this.plusBtn = this.querySelector('[data-quantity-plus]');

    this._onMinus = () => this.changeBy(-1);
    this._onPlus = () => this.changeBy(1);
    this._onInput = debounce(() => this.onInputChange(), 300);
    this._onCartUpdated = () => this.syncFromStore();

    this.minusBtn?.addEventListener('click', this._onMinus);
    this.plusBtn?.addEventListener('click', this._onPlus);
    this.input?.addEventListener('change', this._onInput);
    window.addEventListener('tvara:cart:updated', this._onCartUpdated);

    this.syncFromStore();
  }

  disconnectedCallback() {
    this.minusBtn?.removeEventListener('click', this._onMinus);
    this.plusBtn?.removeEventListener('click', this._onPlus);
    this.input?.removeEventListener('change', this._onInput);
    window.removeEventListener('tvara:cart:updated', this._onCartUpdated);
  }

  syncFromStore() {
    const store = getCartStore();
    const item = store?.items?.find((entry) => entry.key === this.lineKey);
    if (item && this.input) this.input.value = item.quantity;
  }

  async changeBy(delta) {
    const store = getCartStore();
    const item = store?.items?.find((entry) => entry.key === this.lineKey);
    if (!item || !store) return;

    await store.change(this.lineKey, Math.max(0, item.quantity + delta));
  }

  async onInputChange() {
    const store = getCartStore();
    if (!store || !this.input) return;

    const quantity = parseInt(this.input.value, 10);
    if (Number.isNaN(quantity)) return;

    await store.change(this.lineKey, quantity);
  }
}

if (!customElements.get('cart-quantity')) {
  customElements.define('cart-quantity', CartQuantity);
}
