const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage — saves to public/images/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `product-${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Image Upload Endpoint
router.post('/upload-image', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file received' });
  const url = `/images/${req.file.filename}`;
  res.json({ success: true, url, message: 'Image uploaded!' });
});

// Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminUser = username;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Admin Logout
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.destroy();
  res.json({ success: true, message: 'Logged out' });
});

// Check auth status
router.get('/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---- PRODUCTS CRUD ----

// GET all products (admin view, includes inactive)
router.get('/products', requireAdmin, (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE product
router.post('/products', requireAdmin, (req, res) => {
  try {
    const { name, short_desc, description, price, original_price, category, image_url, stock, featured, active, weight, ingredients, benefits } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Name and price are required' });

    const result = db.prepare(`
      INSERT INTO products (name, short_desc, description, price, original_price, category, image_url, stock, featured, active, weight, ingredients, benefits)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, short_desc, description, parseFloat(price), original_price ? parseFloat(original_price) : null,
      category || 'soap', image_url || '/images/default-product.jpg',
      parseInt(stock) || 10, featured ? 1 : 0, active !== false ? 1 : 0,
      weight, ingredients, benefits);

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, product: newProduct, message: 'Product created!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE product
router.put('/products/:id', requireAdmin, (req, res) => {
  try {
    const { name, short_desc, description, price, original_price, category, image_url, stock, featured, active, weight, ingredients, benefits } = req.body;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

    db.prepare(`
      UPDATE products SET name=?, short_desc=?, description=?, price=?, original_price=?, category=?,
      image_url=?, stock=?, featured=?, active=?, weight=?, ingredients=?, benefits=?
      WHERE id=?
    `).run(
      name || existing.name, short_desc || existing.short_desc,
      description || existing.description, parseFloat(price) || existing.price,
      original_price ? parseFloat(original_price) : existing.original_price,
      category || existing.category, image_url || existing.image_url,
      parseInt(stock) !== undefined ? parseInt(stock) : existing.stock,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      weight || existing.weight, ingredients || existing.ingredients, benefits || existing.benefits,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, product: updated, message: 'Product updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE product
router.delete('/products/:id', requireAdmin, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- ORDERS MANAGEMENT ----

// GET all orders
router.get('/orders', requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    if (status && status !== 'all') { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const orders = db.prepare(query).all(...params);
    const result = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });
    res.json({ success: true, orders: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE order status
router.put('/orders/:id', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- DASHBOARD STATS ----
router.get('/dashboard', requireAdmin, (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE active = 1').get().c;
    const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
    const totalRevenue = db.prepare("SELECT SUM(total_amount) as r FROM orders WHERE status != 'cancelled'").get().r || 0;
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
    const lowStock = db.prepare('SELECT * FROM products WHERE stock < 5 AND active = 1').all();
    res.json({ success: true, stats: { totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders, lowStock } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- SETTINGS ----
router.get('/settings', requireAdmin, (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({ success: true, settings: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', requireAdmin, (req, res) => {
  try {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateMany = db.transaction((entries) => {
      for (const [key, value] of entries) update.run(key, value);
    });
    updateMany(Object.entries(req.body));
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
