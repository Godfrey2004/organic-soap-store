# Nature Mist: The Complete Guide

Welcome to the comprehensive guide for the **Nature Mist** e-commerce application. This document serves as a complete manual for understanding, developing, and using the application. It is broken down into three main sections: **The Tech Stack**, the **Developer Guide**, and the **User Guide**.

---

## 🛠️ Part 1: The Tech Stack & Architecture

Nature Mist is built using a modern, lightweight, "Full-Stack JavaScript" architecture designed to run on serverless cloud environments.

### 1. Frontend (The User Interface)
*   **HTML5 & CSS3 (Vanilla)**: The structure and styling are completely custom-built without heavy frameworks like React or Tailwind. 
    *   *Purpose*: Ensures lightning-fast load times, complete design control (utilizing modern CSS variables for the lavender/sage aesthetic), and a great foundation in core web technologies.
*   **Vanilla JavaScript (ES6+)**: Handles frontend logic like fetching data, updating the shopping cart, and rendering dynamic content.
    *   *Purpose*: Interacts with the backend API asynchronously using the modern `fetch()` API without the overhead of heavy libraries.

### 2. Backend (The Server)
*   **Node.js**: The JavaScript runtime environment that executes the server-side code.
*   **Express.js**: A minimal web application framework for Node.js.
    *   *Purpose*: It defines the API routes (e.g., `/api/products`, `/api/cart`), serves the static HTML/CSS files, and acts as the middleman between the user and the database.

### 3. Database & Storage
*   **Supabase (PostgreSQL)**: A powerful open-source backend-as-a-service.
    *   *Purpose*: Replaced the original local SQLite database. Because Vercel destroys local files on every request, Supabase provides a persistent, remote cloud database to store products, orders, and settings safely.
*   **Supabase Storage**: Object storage buckets.
    *   *Purpose*: Stores the physical image files uploaded by the admin and generates public URLs to display them on the storefront.

### 4. Authentication & Security
*   **Cookie-Session**: Middleware for Express.
    *   *Purpose*: Manages admin logins. Instead of saving the login session in server memory (which gets wiped on Vercel), it securely encrypts the login state into a cookie stored on the admin's browser.

### 5. Deployment
*   **Vercel**: A cloud platform for serverless deployment.
    *   *Purpose*: Hosts the application. It automatically listens to the GitHub repository and redeploys the site globally to edge networks whenever code is pushed.

---

## 💻 Part 2: The Developer Guide

Whether you are a beginner looking at how things connect or a professional analyzing the architecture, here is how the application works under the hood.

### Application Flow (Client-Server Architecture)
1. **The Request**: A user visits `naturemist.com/products`. Express serves the static `products.html` file.
2. **The API Call**: The JavaScript inside `products.html` fires a `fetch('/api/products')` request to the Express server.
3. **The Database Query**: The Express route (`routes/products.js`) uses the `@supabase/supabase-js` client to asynchronously query the Supabase PostgreSQL database for active products.
4. **The Response**: Express formats the database rows into JSON and sends it back to the frontend, which uses DOM manipulation to draw the product cards on the screen.

### Pro-Level Concepts Implemented
*   **Serverless Compatibility**: The app was migrated from `better-sqlite3` and `multer.diskStorage` to Supabase. This is a crucial professional concept: **Serverless functions are stateless and ephemeral**. You cannot save files or databases to the local disk; you must use external cloud storage.
*   **Reverse Proxy Trust**: Vercel handles HTTPS encryption but forwards traffic to Node.js as plain HTTP. To make secure session cookies work, we implemented `app.set('trust proxy', 1)`. Without this, Express would reject the secure cookie because it thinks the connection is insecure.
*   **Security via Obscurity & Middleware**: The admin panel is deliberately hidden. Visiting `/admin` returns a fake `404 Not Found`. You must know the secret URL (`/naturemist-manage`) to see the login screen. Furthermore, every admin API route is protected by a custom `requireAdmin` middleware function.

### Database Schema
The database consists of three primary tables:
1.  **`products`**: Stores inventory (name, price, stock, description, image_url).
2.  **`orders`**: Stores customer checkout data (name, address, total_amount, status).
3.  **`order_items`**: A relational mapping table linking an `order_id` to multiple `product_id`s, tracking the quantity bought.

---

## 🛍️ Part 3: The User Guide

### 1. For the Customer (Shopper)
*   **Browsing**: Users can navigate the homepage to see "Featured Botanicals" or go to "Shop All" to use category filters (Soap, Skincare, Wellness) and a text search bar.
*   **Shopping Cart**: Clicking "Add to Cart" saves items to an Express session cart. The cart badge updates dynamically. The cart page calculates subtotals and applies a ₹50 shipping fee unless the order is over ₹500 (Free Shipping).
*   **Checkout Flow**: The user fills out their shipping details and selects "Cash on Delivery" (Online payments are marked as coming soon).
*   **WhatsApp Integration**: Upon successful order placement, the system redirects to an order success page and generates a custom WhatsApp link. This allows the customer to immediately message the store owner with their specific Order ID to confirm the delivery.

### 2. For the Store Owner (Admin)
*   **Logging In**: Navigate to the hidden URL: `yourdomain.com/naturemist-manage`. Enter the secure credentials set in the Vercel Environment Variables (`ADMIN_USERNAME` and `ADMIN_PASSWORD`).
*   **Dashboard**: Upon login, view quick statistics: Total Revenue, Pending Orders, Low Stock Alerts, and Recent Orders.
*   **Managing Inventory (Products Tab)**:
    *   Click "Add New Product" to create listings. 
    *   You can upload an image from your computer. The app securely uploads this to Supabase Storage and attaches the link to the product.
    *   Use the toggle switches to mark products as "Featured" (shows on homepage) or "Inactive" (hides from the store).
*   **Fulfilling Orders (Orders Tab)**:
    *   View all customer orders.
    *   Change the status dropdown from `Pending` -> `Confirmed` -> `Shipped` -> `Delivered`.
    *   Click "View Details" to see the exact items the customer ordered and their full shipping address.
