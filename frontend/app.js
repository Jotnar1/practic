const state = {
  menu: null,
  selectedCategory: 'all',
  search: '',
  cart: [],
};

const categoriesEl = document.getElementById('categories');
const productsEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const cartItemsEl = document.getElementById('cart-items');
const cartEmptyEl = document.getElementById('cart-empty');
const cartTotalEl = document.getElementById('cart-total');
const orderFormEl = document.getElementById('order-form');
const submitOrderEl = document.getElementById('submit-order');
const orderMessageEl = document.getElementById('order-message');

function formatPrice(value) {
  return `${value} ₽`;
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

function renderCategories() {
  const buttons = [
    { id: 'all', name: 'Все' },
    ...state.menu.categories,
  ];

  categoriesEl.innerHTML = buttons
    .map(
      (category) =>
        `<button type="button" data-category="${category.id}" ${
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

  if (products.length === 0) {
    productsEl.innerHTML = '<p>Ничего не найдено</p>';
    return;
  }

  productsEl.innerHTML = products
    .map(
      (product) => `
        <article>
          <h3>${product.name}</h3>
          <p>${getCategoryName(product.categoryId)} · ${product.volume}</p>
          <p>${formatPrice(product.price)}</p>
          <button type="button" data-add="${product.id}">В корзину</button>
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
  const existing = state.cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }

  renderCart();
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

  cartEmptyEl.hidden = items.length > 0;
  cartItemsEl.innerHTML = items
    .map(
      (item) => `
        <li>
          <strong>${item.name}</strong> (${item.volume}) — ${formatPrice(item.price)}
          <div>
            <button type="button" data-dec="${item.productId}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-inc="${item.productId}">+</button>
            <span>${formatPrice(item.subtotal)}</span>
          </div>
        </li>
      `
    )
    .join('');

  cartTotalEl.textContent = items.length > 0 ? `Итого: ${formatPrice(total)}` : '';
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

orderFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  orderMessageEl.textContent = '';

  const payload = {
    customerName: document.getElementById('customer-name').value,
    phone: document.getElementById('customer-phone').value,
    comment: document.getElementById('customer-comment').value,
    items: state.cart.map(({ productId, quantity }) => ({ productId, quantity })),
  };

  submitOrderEl.disabled = true;

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка оформления заказа');
    }

    orderMessageEl.textContent = `Заказ №${data.id} принят. Сумма: ${formatPrice(data.total)}`;
    state.cart = [];
    orderFormEl.reset();
    renderCart();
  } catch (error) {
    orderMessageEl.textContent = error.message;
    submitOrderEl.disabled = getCartDetails().length === 0;
  }
});

loadMenu().catch((error) => {
  productsEl.innerHTML = `<p>${error.message}</p>`;
});
