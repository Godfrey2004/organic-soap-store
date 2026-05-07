const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all products (with optional filters)
router.get('/', (req, res) => {
  try {
    const { category, featured, search, sort } = req.query;
    let query = 'SELECT * FROM products WHERE active = 1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (featured) {
      query += ' AND featured = 1';
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    switch (sort) {
      case 'price_asc': query += ' ORDER BY price ASC'; break;
      case 'price_desc': query += ' ORDER BY price DESC'; break;
      case 'newest': query += ' ORDER BY created_at DESC'; break;
      default: query += ' ORDER BY featured DESC, created_at DESC';
    }

    const products = db.prepare(query).all(...params);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    // Related products (same category)
    const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? AND active = 1 LIMIT 4').all(product.category, product.id);
    res.json({ success: true, product, related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET categories
router.get('/meta/categories', (req, res) => {
  try {
    const cats = db.prepare("SELECT DISTINCT category, COUNT(*) as count FROM products WHERE active = 1 GROUP BY category").all();
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
