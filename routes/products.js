const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET all products (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, sort } = req.query;

    let query = supabase.from('products').select('*').eq('active', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (featured) {
      query = query.eq('featured', true);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    switch (sort) {
      case 'price_asc':  query = query.order('price', { ascending: true });  break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'newest':     query = query.order('created_at', { ascending: false }); break;
      default:
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data: products, error } = await query;
    if (error) throw error;
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('active', true)
      .single();

    if (error || !product) return res.status(404).json({ success: false, message: 'Product not found' });

    const { data: related } = await supabase
      .from('products')
      .select('*')
      .eq('category', product.category)
      .neq('id', product.id)
      .eq('active', true)
      .limit(4);

    res.json({ success: true, product, related: related || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET categories
router.get('/meta/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('active', true);

    if (error) throw error;

    const counts = {};
    (data || []).forEach(row => {
      counts[row.category] = (counts[row.category] || 0) + 1;
    });
    const categories = Object.entries(counts).map(([category, count]) => ({ category, count }));
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
