const express = require('express');
const router = express.Router();
const db = require('../db');

// Place order
router.post('/place', (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, customer_address, city, pincode, payment_method, notes } = req.body;
    const cart = req.session.cart || [];

    if (!cart.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    const orderResult = db.prepare(`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, city, pincode, total_amount, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_name, customer_email, customer_phone, customer_address, city, pincode, total, payment_method || 'cod', notes);

    const orderId = orderResult.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)');

    cart.forEach(item => {
      insertItem.run(orderId, item.id, item.name, item.quantity, item.price);
      // Reduce stock
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, item.id);
    });

    req.session.cart = [];
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    res.json({
      success: true,
      orderId,
      total,
      whatsapp: settingsMap.store_whatsapp,
      message: 'Order placed successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET order by ID
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, order, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
