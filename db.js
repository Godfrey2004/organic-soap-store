const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'store.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    short_desc TEXT,
    price REAL NOT NULL,
    original_price REAL,
    category TEXT DEFAULT 'soap',
    image_url TEXT,
    stock INTEGER DEFAULT 10,
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    weight TEXT,
    ingredients TEXT,
    benefits TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    city TEXT,
    pincode TEXT,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cod',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default settings
const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get();
if (settingsCount.c === 0) {
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('store_name', 'Nature Mist');
  insertSetting.run('store_tagline', 'Handcrafted organic soaps & wellness products');
  insertSetting.run('store_phone', '+91 98765 43210');
  insertSetting.run('store_email', 'hello@naturemist.in');
  insertSetting.run('store_whatsapp', '919876543210');
  insertSetting.run('currency', '₹');
}

// Seed products if empty
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get();
if (productCount.c === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, short_desc, description, price, original_price, category, image_url, stock, featured, weight, ingredients, benefits)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['Lavender Dream Soap', 'Calming lavender with shea butter', 'A luxuriously creamy soap infused with pure lavender essential oil and shea butter. Gently cleanses while leaving skin soft and nourished. Perfect for a relaxing bedtime ritual.', 249, 320, 'soap', '/images/lavender-soap.jpg', 25, 1, '100g', 'Coconut Oil, Shea Butter, Lavender Essential Oil, Lavender Buds', 'Moisturizing, Calming, Anti-bacterial'],
    ['Rose Petal Glow Soap', 'Rose & aloe for radiant skin', 'Handcrafted with real rose petals and aloe vera gel, this soap brings a gentle rosy glow to your skin. Rich in antioxidants that protect against daily skin stress.', 279, 350, 'soap', '/images/rose-soap.jpg', 20, 1, '100g', 'Rose Hip Oil, Aloe Vera, Rose Essential Oil, Dried Rose Petals', 'Anti-aging, Brightening, Hydrating'],
    ['Neem & Turmeric Clarity Soap', 'Ancient herbs for clear skin', 'A time-tested Ayurvedic formula combining neem and turmeric for naturally clear, blemish-free skin. Ideal for oily and acne-prone skin types.', 219, 280, 'soap', '/images/neem-soap.jpg', 30, 1, '100g', 'Neem Leaf Extract, Turmeric, Tea Tree Oil, Coconut Oil', 'Anti-acne, Purifying, Oil Control'],
    ['Charcoal Detox Soap', 'Deep pore cleansing charcoal', 'Activated charcoal draws out impurities and toxins from deep within pores. Infused with eucalyptus for a refreshing, spa-like cleanse.', 299, 380, 'soap', '/images/charcoal-soap.jpg', 15, 0, '100g', 'Activated Charcoal, Eucalyptus Oil, Olive Oil, Shea Butter', 'Detoxifying, Deep Cleansing, Pore Minimizing'],
    ['Oatmeal Honey Soap', 'Gentle soothing for sensitive skin', 'Ultra-gentle oatmeal and raw honey soap perfect for sensitive and dry skin. The natural exfoliants in oatmeal smooth skin while honey seals in moisture.', 259, 320, 'soap', '/images/oatmeal-soap.jpg', 22, 0, '100g', 'Colloidal Oatmeal, Raw Honey, Almond Oil, Chamomile Extract', 'Soothing, Exfoliating, Moisturizing'],
    ['Peppermint Refresh Soap', 'Cool, tingly clean feeling', 'Energising peppermint soap that gives your skin a cooling tingle while deeply cleansing. Great for morning showers to wake up refreshed.', 229, 290, 'soap', '/images/peppermint-soap.jpg', 18, 0, '100g', 'Peppermint Essential Oil, Spearmint, Coconut Oil, Castor Oil', 'Refreshing, Energising, Cooling'],
    ['Organic Lip Balm', 'Nourishing beeswax lip care', 'Made with beeswax, coconut oil and vitamin E, this lip balm deeply nourishes and protects your lips from dryness and chapping.', 149, 199, 'wellness', '/images/lip-balm.jpg', 40, 1, '5g', 'Beeswax, Coconut Oil, Vitamin E, Peppermint Oil', 'Moisturizing, Healing, SPF Protection'],
    ['Lavender Body Scrub', 'Exfoliating sugar and salt blend', 'A luxurious body scrub combining brown sugar, sea salt and lavender oil to slough away dead skin and reveal soft, glowing skin beneath.', 399, 499, 'wellness', '/images/body-scrub.jpg', 12, 1, '200g', 'Brown Sugar, Sea Salt, Lavender Oil, Jojoba Oil, Vitamin E', 'Exfoliating, Brightening, Moisturizing'],
    ['Neem Face Wash', 'Gentle foaming cleanser', 'A mild, foaming face wash with neem, aloe vera and green tea extracts. Removes dirt and excess oil without stripping natural moisture.', 349, 420, 'skincare', '/images/face-wash.jpg', 20, 0, '100ml', 'Neem Extract, Aloe Vera, Green Tea, Glycerin', 'Cleansing, Oil Control, Soothing'],
    ['Rose Water Toner', 'Pure steam-distilled rose water', 'Pure steam-distilled rose water toner that balances skin pH, tightens pores and adds a refreshing burst of hydration after cleansing.', 299, 370, 'skincare', '/images/toner.jpg', 15, 0, '100ml', 'Rose Water, Glycerin, Witch Hazel, Aloe Vera', 'Balancing, Hydrating, Pore Tightening'],
    ['Organic Hand Cream', 'Rich, fast-absorbing hand care', 'An intensely nourishing hand cream with shea butter, almond oil and vitamin E that heals dry, cracked hands and keeps them soft all day.', 279, 349, 'skincare', '/images/hand-cream.jpg', 25, 0, '50g', 'Shea Butter, Almond Oil, Vitamin E, Lavender Oil', 'Healing, Moisturizing, Anti-aging'],
    ['Soap Gift Set (3 bars)', 'Curated set - perfect gift', 'A beautifully packaged gift set of 3 handpicked artisan soaps. Makes the perfect gift for any occasion. Choose from our bestselling varieties.', 649, 799, 'gift', '/images/gift-set.jpg', 10, 1, '300g', 'Varies by selection', 'Great Value, Gift Ready, Natural Ingredients']
  ];

  products.forEach(p => insertProduct.run(...p));
  console.log('✅ Sample products seeded');
}

module.exports = db;
