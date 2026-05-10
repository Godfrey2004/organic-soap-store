const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { requireAdmin } = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');

// Use memory storage — Vercel filesystem is read-only, images go to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Image Upload Endpoint — uploads to Supabase Storage
router.post('/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file received' });
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `product-${Date.now()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename);

    res.json({ success: true, url: urlData.publicUrl, message: 'Image uploaded!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
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
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE product
router.post('/products', requireAdmin, async (req, res) => {
  try {
    const { name, short_desc, description, price, original_price, category, image_url, stock, featured, active, weight, ingredients, benefits } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Name and price are required' });

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        name,
        short_desc,
        description,
        price: parseFloat(price),
        original_price: original_price ? parseFloat(original_price) : null,
        category: category || 'soap',
        image_url: image_url || '/images/default-product.jpg',
        stock: parseInt(stock) || 10,
        featured: featured ? true : false,
        active: active !== false ? true : false,
        weight,
        ingredients,
        benefits
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, product: newProduct, message: 'Product created!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE product
router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { name, short_desc, description, price, original_price, category, image_url, stock, featured, active, weight, ingredients, benefits } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ success: false, message: 'Product not found' });

    const updates = {
      name: name || existing.name,
      short_desc: short_desc || existing.short_desc,
      description: description || existing.description,
      price: parseFloat(price) || existing.price,
      original_price: original_price ? parseFloat(original_price) : existing.original_price,
      category: category || existing.category,
      image_url: image_url || existing.image_url,
      stock: parseInt(stock) !== undefined ? parseInt(stock) : existing.stock,
      featured: featured !== undefined ? !!featured : existing.featured,
      active: active !== undefined ? !!active : existing.active,
      weight: weight || existing.weight,
      ingredients: ingredients || existing.ingredients,
      benefits: benefits || existing.benefits
    };

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json({ success: true, product: updated, message: 'Product updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE product
router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) return res.status(404).json({ success: false, message: 'Product not found' });

    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- ORDERS MANAGEMENT ----

// GET all orders
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    // Attach items to each order
    const result = await Promise.all((orders || []).map(async order => {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      return { ...order, items: items || [] };
    }));

    res.json({ success: true, orders: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE order status
router.put('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const { error } = await supabase.from('orders').update({ status }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- DASHBOARD STATS ----
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      { count: totalProducts },
      { count: totalOrders },
      { count: pendingOrders },
      { data: revenueData },
      { data: recentOrders },
      { data: lowStock }
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('products').select('*').lt('stock', 5).eq('active', true)
    ]);

    const totalRevenue = (revenueData || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

    res.json({
      success: true,
      stats: { totalProducts, totalOrders, pendingOrders, totalRevenue, recentOrders: recentOrders || [], lowStock: lowStock || [] }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- SETTINGS ----
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    const map = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    res.json({ success: true, settings: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const entries = Object.entries(req.body).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(entries, { onConflict: 'key' });
    if (error) throw error;
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
