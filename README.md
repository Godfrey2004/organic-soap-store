# Nature Mist — Organic Soap Store

A full-stack e-commerce web application for handcrafted organic soaps and skincare products.

## Tech Stack
- **Backend:** Node.js + Express.js
- **Database:** SQLite (better-sqlite3)
- **Frontend:** HTML, CSS (Vanilla), JavaScript
- **Auth:** express-session
- **File Upload:** multer
- **Icons:** Font Awesome 6
- **Fonts:** Google Fonts (Playfair Display, Lato)

## Setup

```bash
npm install
```

Create a `.env` file:
```
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
SESSION_SECRET=your_secret_key
```

```bash
node server.js
```

Open http://localhost:3000

## Admin Panel
Visit: `/naturemist-manage`

## Features
- Product catalog with cart & checkout
- Admin dashboard, product CRUD, order management
- Image upload for products
- WhatsApp order confirmation
- Google Sheets order logging
