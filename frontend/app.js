const state = {
  menu: null,
  selectedCategory: 'all',
  search: '',
  cart: [],
};

const categoriesEl = document.getElementById('categories');
const productsEl = document.getElementById('products');
const productsCountEl = document.getElementById('products-count');
const searchEl = document.getElementById('search');
const cartItemsEl = document.getElementById('cart-items');
const cartEmptyEl = document.getElementById('cart-empty');
const cartSummaryEl = document.getElementById('cart-summary');
const cartTotalEl = document.getElementById('cart-total');
const cartBadgeEl = document.getElementById('cart-badge');
const orderFormEl = document.getElementById('order-form');
const submitOrderEl = document.getElementById('submit-order');
const orderMessageEl = document.getElementById('order-message');
const cartPanelEl = document.getElementById('cart-panel');
const cartToggleEl = document.getElementById('cart-toggle');
const cartCloseEl = document.getElementById('cart-close');
const overlayEl = document.getElementById('overlay');

let toastEl = null;
let toastTimer = null;

function formatPrice(value) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function getCategoryName(categoryId) {
  return state.menu.categories.find((c) => c.id === categoryId)?.name || categoryId;
}

function getFilteredProducts() {
  const query = state.search.trim().toLowerCase();

  return state.menu.products.filter((product) => {
    const matchesCategory =
      state.selectedCategory === 'all' || product.categoryId === state.selectedCategory;

    if (!matchesCategory) {
      return false;
    }

    if (!query) {
      return true;
    }

    const categoryName = getCategoryName(product.categoryId).toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.volume.toLowerCase().includes(query) ||
      categoryName.includes(query)
    );
  });
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function showToast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = message;
  toastEl.classList.add('toast--visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('toast--visible');
  }, 2200);
}

function openCart() {
  if (window.innerWidth <= 1024) {
    cartPanelEl.classList.add('cart-panel--open');
    overlayEl.hidden = false;
    document.body.style.overflow = 'hidden';
    return;
  }

  cartPanelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeCart() {
  cartPanelEl.classList.remove('cart-panel--open');
  overlayEl.hidden = true;
  document.body.style.overflow = '';
}

function renderCategories() {
  const buttons = [{ id: 'all', name: 'Все' }, ...state.menu.categories];

  categoriesEl.innerHTML = buttons
    .map(
      (category) =>
        `<button type="button" role="tab" data-category="${category.id}" ${
          state.selectedCategory === category.id ? 'aria-current="true"' : ''
        }>${category.name}</button>`
    )
    .join('');

  categoriesEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const products = getFilteredProducts();

  productsCountEl.textContent = `${products.length} ${
    products.length === 1 ? 'позиция' : products.length < 5 ? 'позиции' : 'позиций'
  }`;

  if (products.length === 0) {
    productsEl.innerHTML = `
      <div class="empty-state">
        <p>Ничего не найдено</p>
        <span>Попробуйте другой запрос или категорию</span>
      </div>
    `;
    return;
  }

  productsEl.innerHTML = products
    .map(
      (product, index) => `
        <article class="product-card" style="animation-delay: ${Math.min(index * 0.03, 0.3)}s">
          <p class="product-card__category">${getCategoryName(product.categoryId)}</p>
          <h3 class="product-card__name">${product.name}</h3>
          <p class="product-card__volume">${product.volume}</p>
          <div class="product-card__footer">
            <div class="product-card__price">${formatPrice(product.price)}</div>
            <button type="button" class="btn btn--primary btn--sm" data-add="${product.id}">
              В корзину
            </button>
          </div>
        </article>
      `
    )
    .join('');

  productsEl.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      addToCart(Number(button.dataset.add));
    });
  });
}

function addToCart(productId) {
  const product = state.menu.products.find((p) => p.id === productId);
  if (!product) {
    return;
  }

  const existing = state.cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }

  renderCart();
  showToast(`${product.name} добавлен в корзину`);
}

function changeCartQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  if (!item) {
    return;
  }

  item.quantity += delta;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter((entry) => entry.productId !== productId);
  }

  renderCart();
}

function getCartDetails() {
  return state.cart
    .map((cartItem) => {
      const product = state.menu.products.find((p) => p.id === cartItem.productId);
      if (!product) {
        return null;
      }

      return {
        productId: product.id,
        name: product.name,
        volume: product.volume,
        price: product.price,
        quantity: cartItem.quantity,
        subtotal: product.price * cartItem.quantity,
      };
    })
    .filter(Boolean);
}

function renderCart() {
  const items = getCartDetails();
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const count = getCartCount();

  cartEmptyEl.hidden = items.length > 0;
  cartSummaryEl.hidden = items.length === 0;

  if (count > 0) {
    cartBadgeEl.hidden = false;
    cartBadgeEl.textContent = count > 99 ? '99+' : count;
  } else {
    cartBadgeEl.hidden = true;
  }

  cartItemsEl.innerHTML = items
    .map(
      (item) => `
        <li class="cart-item">
          <div class="cart-item__top">
            <div>
              <div class="cart-item__name">${item.name}</div>
              <div class="cart-item__volume">${item.volume}</div>
            </div>
            <div class="cart-item__price-unit">${formatPrice(item.price)}</div>
          </div>
          <div class="cart-item__controls">
            <div class="qty-control">
              <button type="button" data-dec="${item.productId}" aria-label="Уменьшить">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-inc="${item.productId}" aria-label="Увеличить">+</button>
            </div>
            <div class="cart-item__subtotal">${formatPrice(item.subtotal)}</div>
          </div>
        </li>
      `
    )
    .join('');

  cartTotalEl.textContent = formatPrice(total);
  submitOrderEl.disabled = items.length === 0;

  cartItemsEl.querySelectorAll('[data-inc]').forEach((button) => {
    button.addEventListener('click', () => changeCartQuantity(Number(button.dataset.inc), 1));
  });

  cartItemsEl.querySelectorAll('[data-dec]').forEach((button) => {
    button.addEventListener('click', () => changeCartQuantity(Number(button.dataset.dec), -1));
  });
}

async function loadMenu() {
  const response = await fetch('/api/menu');
  if (!response.ok) {
    throw new Error('Не удалось загрузить меню');
  }

  state.menu = await response.json();
  renderCategories();
  renderProducts();
  renderCart();
}

searchEl.addEventListener('input', () => {
  state.search = searchEl.value;
  renderProducts();
});

cartToggleEl.addEventListener('click', openCart);
cartCloseEl.addEventListener('click', closeCart);
overlayEl.addEventListener('click', closeCart);

orderFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  orderMessageEl.textContent = '';
  orderMessageEl.className = 'order-message';

  const payload = {
    customerName: document.getElementById('customer-name').value,
    phone: document.getElementById('customer-phone').value,
    comment: document.getElementById('customer-comment').value,
    items: state.cart.map(({ productId, quantity }) => ({ productId, quantity })),
  };

  submitOrderEl.disabled = true;
  submitOrderEl.textContent = 'Отправка...';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error('Сервер вернул некорректный ответ');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка оформления заказа');
    }

    orderMessageEl.textContent = `Заказ №${data.id} принят! Сумма: ${formatPrice(data.total)}`;
    orderMessageEl.className = 'order-message order-message--success';
    state.cart = [];
    orderFormEl.reset();
    renderCart();
    openCart();
  } catch (error) {
    orderMessageEl.textContent = error.message;
    orderMessageEl.className = 'order-message order-message--error';
    submitOrderEl.disabled = getCartDetails().length === 0;
  } finally {
    submitOrderEl.textContent = 'Оформить заказ';
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) {
    closeCart();
  }
});

loadMenu().catch((error) => {
  productsEl.innerHTML = `
    <div class="empty-state">
      <p>${error.message}</p>
    </div>
  `;
});
