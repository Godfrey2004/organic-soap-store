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

    // Get WhatsApp setting
    const { data: waSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'store_whatsapp')
      .single();

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
