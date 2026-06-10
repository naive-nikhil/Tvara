export class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.onCartUpdated = this.onCartUpdated.bind(this);
  }

  connectedCallback() {
    window.addEventListener('tvara:cart:updated', this.onCartUpdated);
  }

  disconnectedCallback() {
    window.removeEventListener('tvara:cart:updated', this.onCartUpdated);
  }

  onCartUpdated(event) {
    if (event.detail?.action === 'add') {
      window.dispatchEvent(new CustomEvent('cart-open'));
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
