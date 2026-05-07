require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'organic_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Init DB (creates tables + seeds data)
require('./db');

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Serve HTML pages
const views = path.join(__dirname, 'views');

app.get('/', (req, res) => res.sendFile(path.join(views, 'index.html')));
app.get('/products', (req, res) => res.sendFile(path.join(views, 'products.html')));
app.get('/product/:id', (req, res) => res.sendFile(path.join(views, 'product-detail.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(views, 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(views, 'checkout.html')));
app.get('/order-success', (req, res) => res.sendFile(path.join(views, 'order-success.html')));
// Hidden admin routes — not linked anywhere on the public store
app.get('/naturemist-manage', (req, res) => res.sendFile(path.join(views, 'admin', 'login.html')));
app.get('/naturemist-manage/dashboard', (req, res) => res.sendFile(path.join(views, 'admin', 'dashboard.html')));
app.get('/naturemist-manage/products', (req, res) => res.sendFile(path.join(views, 'admin', 'manage-products.html')));
app.get('/naturemist-manage/orders', (req, res) => res.sendFile(path.join(views, 'admin', 'manage-orders.html')));
app.get('/naturemist-manage/settings', (req, res) => res.sendFile(path.join(views, 'admin', 'settings.html')));
// Old /admin → 404 (no redirect, no hint)
app.get('/admin', (req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log(`\n🌿 Nature Mist Store running at http://localhost:${PORT}`);
  console.log(`🔐 Admin panel (hidden): http://localhost:${PORT}/naturemist-manage`);
  console.log(`   Username: ${process.env.ADMIN_USERNAME} | Password: ${process.env.ADMIN_PASSWORD}\n`);
});
