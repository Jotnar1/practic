import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const menuPath = path.join(__dirname, 'data', 'menu.json');
const ordersPath = path.join(__dirname, 'data', 'orders.json');
const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.json());
app.use(express.static(frontendPath));

function readMenu() {
  return JSON.parse(fs.readFileSync(menuPath, 'utf8'));
}

function readOrders() {
  if (!fs.existsSync(ordersPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
}

function writeOrders(orders) {
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
}

app.get('/api/menu', (_req, res) => {
  res.json(readMenu());
});

app.get('/api/categories', (_req, res) => {
  const menu = readMenu();
  res.json(menu.categories);
});

app.get('/api/products', (req, res) => {
  const menu = readMenu();
  let products = menu.products;

  const { category, q } = req.query;

  if (category && category !== 'all') {
    products = products.filter((item) => item.categoryId === category);
  }

  if (q) {
    const query = String(q).trim().toLowerCase();
    products = products.filter((item) => {
      const categoryName =
        menu.categories.find((c) => c.id === item.categoryId)?.name || '';
      return (
        item.name.toLowerCase().includes(query) ||
        item.volume.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query)
      );
    });
  }

  res.json(products);
});

app.post('/api/orders', (req, res) => {
  const { customerName, phone, comment, items } = req.body || {};

  if (!customerName || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Нужны имя, телефон и хотя бы одна позиция в заказе',
    });
  }

  const menu = readMenu();
  const orderItems = [];

  for (const cartItem of items) {
    const product = menu.products.find((p) => p.id === cartItem.productId);
    if (!product) {
      return res.status(400).json({ error: `Товар ${cartItem.productId} не найден` });
    }

    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Количество должно быть целым числом >= 1' });
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      volume: product.volume,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
    });
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const orders = readOrders();

  const order = {
    id: orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1,
    createdAt: new Date().toISOString(),
    customerName: String(customerName).trim(),
    phone: String(phone).trim(),
    comment: comment ? String(comment).trim() : '',
    items: orderItems,
    total,
    status: 'new',
  };

  orders.push(order);
  writeOrders(orders);

  res.status(201).json(order);
});

app.get('/api/orders', (_req, res) => {
  res.json(readOrders());
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});
