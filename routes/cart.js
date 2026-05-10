const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET cart
router.get('/', (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  const cart = req.session.cart;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ success: true, cart, total, count: cart.reduce((s, i) => s + i.quantity, 0) });
});

// ADD to cart
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('active', true)
      .single();

    if (error || !product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(i => i.id === product.id);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + parseInt(quantity), product.stock);
    } else {
      req.session.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: parseInt(quantity),
        stock: product.stock
      });
    }

    const count = req.session.cart.reduce((s, i) => s + i.quantity, 0);
    const total = req.session.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    res.json({ success: true, message: 'Added to cart', count, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE cart item quantity
router.put('/update', (req, res) => {
  const { productId, quantity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  const item = req.session.cart.find(i => i.id === parseInt(productId));
  if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });

  if (parseInt(quantity) <= 0) {
    req.session.cart = req.session.cart.filter(i => i.id !== parseInt(productId));
  } else {
    item.quantity = Math.min(parseInt(quantity), item.stock);
  }

  const count = req.session.cart.reduce((s, i) => s + i.quantity, 0);
  const total = req.session.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ success: true, cart: req.session.cart, count, total });
});

// REMOVE from cart
router.delete('/remove/:productId', (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(i => i.id !== parseInt(req.params.productId));
  const count = req.session.cart.reduce((s, i) => s + i.quantity, 0);
  const total = req.session.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ success: true, cart: req.session.cart, count, total });
});

// CLEAR cart
router.delete('/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, message: 'Cart cleared' });
});

module.exports = router;
