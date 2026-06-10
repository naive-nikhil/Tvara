export class CartNotification extends HTMLElement {
  connectedCallback() {
    this.hideNotification = this.hideNotification.bind(this);
    this.onCartUpdated = this.onCartUpdated.bind(this);

    this.querySelector('.cart-notification-continue_shopping')?.addEventListener('click', this.hideNotification);
    this.querySelector('.cart-notification__close')?.addEventListener('click', this.hideNotification);
    window.addEventListener('tvara:cart:updated', this.onCartUpdated);
  }

  disconnectedCallback() {
    this.querySelector('.cart-notification-continue_shopping')?.removeEventListener('click', this.hideNotification);
    this.querySelector('.cart-notification__close')?.removeEventListener('click', this.hideNotification);
    window.removeEventListener('tvara:cart:updated', this.onCartUpdated);
  }

  onCartUpdated(event) {
    const { action, lineItem } = event.detail || {};
    if (action !== 'add' || !lineItem) return;
    this.updateNotification(lineItem);
  }

  updateNotification(lineItem) {
    const container = this.querySelector('#cart-notification-product');
    if (!container) return;

    container.replaceChildren();

    const imageWrap = document.createElement('div');
    imageWrap.className = 'cart-notification-product__image';

    const image = document.createElement('img');
    image.width = 70;
    image.height = 70;
    image.alt = lineItem.featured_image?.alt || lineItem.product_title || '';
    image.src = lineItem.image || lineItem.featured_image?.url || '';
    imageWrap.appendChild(image);

    const details = document.createElement('div');

    const vendor = document.createElement('p');
    vendor.className = 'caption-with-letter-spacing';
    vendor.textContent = lineItem.vendor || '';
    details.appendChild(vendor);

    const title = document.createElement('h3');
    title.className = 'cart-notification-product__name h4';
    title.textContent = lineItem.product_title || '';
    details.appendChild(title);

    const optionsList = document.createElement('dl');
    for (const option of lineItem.options_with_values || []) {
      const row = document.createElement('div');
      row.className = 'product-option';

      const dt = document.createElement('dt');
      dt.textContent = `${option.name}: `;

      const dd = document.createElement('dd');
      dd.textContent = option.value;

      row.appendChild(dt);
      row.appendChild(dd);
      optionsList.appendChild(row);
    }
    details.appendChild(optionsList);

    container.appendChild(imageWrap);
    container.appendChild(details);

    this.showNotification();
  }

  showNotification() {
    this.querySelector('#cart-notification')?.classList.add('cart-notification-open');
  }

  hideNotification() {
    this.querySelector('#cart-notification')?.classList.remove('cart-notification-open');
  }
}

if (!customElements.get('cart-notification')) {
  customElements.define('cart-notification', CartNotification);
}
