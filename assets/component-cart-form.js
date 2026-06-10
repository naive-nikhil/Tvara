import { getCartStore } from './theme-state.js';

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

export class CartProductForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    if (!this.form) return;

    this.errorEl = this.querySelector('[data-cart-error]');
    this.submitBtn = this.form.querySelector('[type="submit"]');
    this._onSubmit = this.onSubmit.bind(this);
    this.form.addEventListener('submit', this._onSubmit);
  }

  disconnectedCallback() {
    this.form?.removeEventListener('submit', this._onSubmit);
  }

  setProcessing(processing) {
    if (processing) {
      this.setAttribute('processing', '');
    } else {
      this.removeAttribute('processing');
    }

    if (this.submitBtn) this.submitBtn.disabled = processing;

    this.querySelector('.loading__spinner')?.classList.toggle('hidden', !processing);

    const spinner = this.submitBtn?.querySelector('.add-to-cart-icon-spinner');
    const icon = this.submitBtn?.querySelector('.add-to-cart-icon');
    const text = this.submitBtn?.querySelector('.add-to-cart-text__content');
    spinner?.classList.toggle('hidden', !processing);
    icon?.classList.toggle('hidden', processing);
    text?.classList.toggle('hidden', processing);
  }

  showError(message) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }

  clearError() {
    if (!this.errorEl) return;
    this.errorEl.textContent = '';
    this.errorEl.hidden = true;
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.hasAttribute('processing')) return;

    const store = getCartStore();
    if (!store) return;

    const item = parseItemFromForm(new FormData(this.form));
    if (!item) return;

    this.setProcessing(true);
    this.clearError();

    try {
      await store.add(item);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setProcessing(false);
    }
  }
}

if (!customElements.get('cart-product-form')) {
  customElements.define('cart-product-form', CartProductForm);
}
