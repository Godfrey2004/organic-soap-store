const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Place order
router.post('/place', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, customer_address, city, pincode, payment_method, notes } = req.body;
    const cart = req.session.cart || [];

    if (!cart.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        city,
        pincode,
        total_amount: total,
        payment_method: payment_method || 'cod',
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;
    const orderId = orderData.id;

    // Insert order items
    const orderItems = cart.map(item => ({
      order_id: orderId,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    // Reduce stock for each product
    for (const item of cart) {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
      if (prod) {
        const newStock = Math.max(0, prod.stock - item.quantity);
        await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
      }
    }

    req.session.cart = [];

    // Hardcode WhatsApp number to ensure it never uses a dummy database setting
    const waSetting = { value: '918870951141' };

    // Google Sheets integration (if configured)
    try {
      if (process.env.GOOGLE_SHEET_WEBAPP_URL) {
        const orderString = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const payload = {
          order_id: orderId,
          date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          customer_name: customer_name,
          email: customer_email || 'N/A',
          phone: customer_phone,
          address: `${customer_address}, ${city}, ${pincode}`,
          items: orderString,
          total: total
        };
        // Run in background (fire and forget)
        fetch(process.env.GOOGLE_SHEET_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Google Sheet error:", err));
      }
    } catch (sheetErr) {
      console.error("Google Sheets logging failed:", sheetErr);
    }

    res.json({
      success: true,
      orderId,
      total,
      whatsapp: waSetting ? waSetting.value : null,
      message: 'Order placed successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET order by ID
router.get('/:id', async (req, res) => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (orderError || !order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    res.json({ success: true, order, items: items || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
