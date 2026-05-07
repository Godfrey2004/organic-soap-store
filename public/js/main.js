// ---- TOAST ----
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

// ---- CART COUNT ----
async function updateCartCount() {
  try {
    const res = await fetch('/api/cart');
    const data = await res.json();
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = data.count || 0;
      badge.style.display = data.count > 0 ? 'flex' : 'none';
    }
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = data.count || 0;
  } catch (e) {}
}

// ---- ADD TO CART ----
async function addToCart(productId, quantity = 1, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Added to cart! 🛒');
      updateCartCount();
    } else {
      showToast(data.message, 'error');
    }
  } catch (e) {
    showToast('Something went wrong', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🛒 Add to Cart'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  // Highlight active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path || (path.startsWith('/product') && a.getAttribute('href') === '/products')) {
      a.classList.add('active');
    }
  });
});
