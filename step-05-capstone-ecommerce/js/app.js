/**
 * ============================================================
 * STEP 5: Main Application Module — js/app.js
 * ============================================================
 * This is the brain of the ShopCart SPA. It ties together:
 *   - products.js  → PRODUCTS[], CATEGORIES[], helpers
 *   - router.js    → Router object
 *   - The DOM       → rendered HTML injected into #app
 *
 * Architecture layers in this file:
 *   1. CartState     — localStorage-backed cart state object
 *   2. FilterState   — in-memory filter/search/sort state
 *   3. View Renderers — renderHomePage / renderProductsPage / renderCartPage
 *   4. Component Builders — buildProductCard / buildCartItem / etc.
 *   5. Filtering & Sorting — getFilteredProducts()
 *   6. UI Helpers    — updateCartBadge / showToast / generateStars
 *   7. Event Handlers — attached after each view renders (event delegation)
 *   8. Router Registration & Init
 * ============================================================
 */


// ============================================================
// 1. CART STATE MANAGEMENT
// ============================================================
/**
 * CartState manages the shopping cart.
 *
 * Data structure (this.items):
 *   Array of cart-item objects:
 *   [{ id, name, price, image, quantity }, ...]
 *
 * Persistence:
 *   Every mutation calls this.save() which serialises
 *   the items array to localStorage under 'shopcart-cart'.
 *   On page load the constructor rehydrates from localStorage.
 */
const CartState = {

  // Rehydrate from localStorage on startup (persists across page refreshes).
  items: JSON.parse(localStorage.getItem('shopcart-cart') || '[]'),

  /**
   * Add a product to the cart.
   * If it already exists, increment quantity instead of duplicating.
   * @param {object} product - A product object from PRODUCTS[]
   */
  add(product) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      // Only store the fields we actually need in the cart.
      this.items.push({
        id:       product.id,
        name:     product.name,
        price:    product.price,
        image:    product.image,
        category: product.category,
        quantity: 1
      });
    }
    this.save();
  },

  /**
   * Remove a product entirely from the cart.
   * @param {number} productId
   */
  remove(productId) {
    this.items = this.items.filter(item => item.id !== Number(productId));
    this.save();
  },

  /**
   * Update quantity of a cart item.
   * If qty <= 0 the item is removed from the cart.
   * @param {number} productId
   * @param {number} qty       - New quantity value
   */
  updateQuantity(productId, qty) {
    const id = Number(productId);
    if (qty <= 0) {
      this.remove(id);
      return;
    }
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.quantity = qty;
      this.save();
    }
  },

  /**
   * Calculate the cart subtotal.
   * @returns {number} - Sum of (price × quantity) for every item
   */
  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  /**
   * Total number of individual items (respects quantity).
   * e.g. 2× Laptop + 1× Phone = 3
   * @returns {number}
   */
  getCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  /** Empty the cart completely. */
  clear() {
    this.items = [];
    this.save();
  },

  /** Persist current cart to localStorage. Called after every mutation. */
  save() {
    localStorage.setItem('shopcart-cart', JSON.stringify(this.items));
  }
};


// ============================================================
// 2. FILTER STATE
// ============================================================
/**
 * FilterState holds the current filter/sort selections.
 * It is mutated by event handlers on the Products page
 * and read by getFilteredProducts().
 *
 * Not persisted to localStorage (reset on refresh by design).
 */
const FilterState = {
  category: 'All',           // Must match a value in CATEGORIES
  search:   '',              // Free-text search string (lowercased before compare)
  sortBy:   'default'        // 'default' | 'price-asc' | 'price-desc' | 'rating'
};


// ============================================================
// 3. VIEW RENDERERS  (called by the Router)
// ============================================================

/**
 * HOME PAGE
 * Renders: hero banner + featured products grid + category quick-links.
 * Called by Router when the user navigates to #/home.
 */
function renderHomePage() {
  const app = document.getElementById('app');

  // Pick 4 featured products (badge = Popular or Sale) for the hero grid.
  const featured = PRODUCTS
    .filter(p => p.badge === 'Popular' || p.badge === 'New')
    .slice(0, 4);

  // Build category quick-link cards.
  const categoryCards = CATEGORIES.filter(c => c !== 'All').map(cat => {
    const emoji = { Electronics: '⚡', Clothing: '👗', Books: '📚', 'Home & Garden': '🏡' }[cat] || '🛍️';
    return `
      <a href="#/products" class="category-card" data-filter-cat="${cat}">
        <span class="category-card-icon">${emoji}</span>
        <span class="category-card-name">${cat}</span>
      </a>`;
  }).join('');

  // Build featured product mini-cards.
  const featuredCards = featured.map(p => buildProductCard(p)).join('');

  app.innerHTML = `
    <!-- ── Hero Section ──────────────────────────────────── -->
    <section class="hero">
      <div class="hero-content">
        <p class="hero-eyebrow">✨ Step 5 Capstone Project</p>
        <h1 class="hero-title">Shop the <span class="hero-highlight">Future</span></h1>
        <p class="hero-subtitle">
          Discover ${PRODUCTS.length} curated products across ${CATEGORIES.length - 1} categories.
          Built as a fully functional SPA with client-side routing &amp; cart persistence.
        </p>
        <div class="hero-actions">
          <a href="#/products" class="btn btn-primary btn-lg">Browse All Products →</a>
          <a href="#/cart"     class="btn btn-outline btn-lg">View Cart (${CartState.getCount()})</a>
        </div>
        <!-- Decorative floating badges -->
        <div class="hero-badges">
          <span class="hero-badge">🚀 Vanilla JS</span>
          <span class="hero-badge">📦 LocalStorage</span>
          <span class="hero-badge">🔀 Client Routing</span>
          <span class="hero-badge">💅 CSS Grid</span>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-emoji-grid">
          <span>💻</span><span>📱</span><span>🎧</span>
          <span>👕</span><span>⌚</span><span>📚</span>
          <span>🪴</span><span>🔖</span><span>💡</span>
        </div>
      </div>
    </section>

    <!-- ── Category Quick Links ──────────────────────────── -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">Shop by Category</h2>
        <div class="category-grid">
          ${categoryCards}
        </div>
      </div>
    </section>

    <!-- ── Featured Products ─────────────────────────────── -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Featured Products</h2>
          <a href="#/products" class="section-link">View all ${PRODUCTS.length} products →</a>
        </div>
        <div class="product-grid">
          ${featuredCards}
        </div>
      </div>
    </section>

    <!-- ── Stats Bar ─────────────────────────────────────── -->
    <section class="stats-bar">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">${PRODUCTS.length}</span>
            <span class="stat-label">Products</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${CATEGORIES.length - 1}</span>
            <span class="stat-label">Categories</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${PRODUCTS.filter(p => p.badge === 'Sale').length}</span>
            <span class="stat-label">On Sale</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">100%</span>
            <span class="stat-label">Vanilla JS</span>
          </div>
        </div>
      </div>
    </section>
  `;

  attachHomePageEvents();
}

// ─────────────────────────────────────────────────────────────

/**
 * PRODUCTS PAGE
 * Renders: search bar + filter pills + sort dropdown + product grid.
 * Re-renders the grid in-place when filters change (no full page re-render).
 */
function renderProductsPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <section class="section products-section">
      <div class="container">

        <!-- Page heading -->
        <div class="products-header">
          <h1 class="page-title">All Products</h1>
          <p class="page-subtitle" id="product-count-label">
            Showing ${PRODUCTS.length} products
          </p>
        </div>

        <!-- ── Filter & Search Bar ──────────────────────── -->
        <div class="filter-bar">
          <!-- Search input -->
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="search"
              id="search-input"
              class="search-input"
              placeholder="Search products…"
              value="${FilterState.search}"
              aria-label="Search products"
            >
          </div>

          <!-- Sort dropdown -->
          <select id="sort-select" class="sort-select" aria-label="Sort products">
            <option value="default"    ${FilterState.sortBy === 'default'    ? 'selected' : ''}>Sort: Featured</option>
            <option value="price-asc"  ${FilterState.sortBy === 'price-asc'  ? 'selected' : ''}>Price: Low → High</option>
            <option value="price-desc" ${FilterState.sortBy === 'price-desc' ? 'selected' : ''}>Price: High → Low</option>
            <option value="rating"     ${FilterState.sortBy === 'rating'     ? 'selected' : ''}>Highest Rated</option>
          </select>
        </div>

        <!-- Category filter pills -->
        <div class="category-filters" role="group" aria-label="Filter by category">
          ${buildCategoryFilter()}
        </div>

        <!-- Product grid — updated by refreshProductGrid() -->
        <div class="product-grid" id="product-grid">
          ${renderProductGrid()}
        </div>

      </div>
    </section>
  `;

  attachProductsPageEvents();
}

/**
 * Re-render only the product grid section (not the whole products page).
 * Called whenever a filter, search, or sort changes.
 */
function refreshProductGrid() {
  const grid = document.getElementById('product-grid');
  const label = document.getElementById('product-count-label');
  if (!grid) return;

  const filtered = getFilteredProducts();

  // Update the "Showing N products" label.
  if (label) {
    const total = PRODUCTS.length;
    label.textContent = filtered.length === total
      ? `Showing all ${total} products`
      : `Showing ${filtered.length} of ${total} products`;
  }

  grid.innerHTML = renderProductGrid();
}

/**
 * Build the inner HTML for the product grid based on current FilterState.
 * Extracted as its own function so it can be called both on initial render
 * and on filter changes without duplicating logic.
 * @returns {string} HTML string
 */
function renderProductGrid() {
  const products = getFilteredProducts();

  if (products.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filter to find what you're looking for.</p>
        <button class="btn btn-primary" id="clear-filters-btn">Clear All Filters</button>
      </div>`;
  }

  return products.map(p => buildProductCard(p)).join('');
}

// ─────────────────────────────────────────────────────────────

/**
 * CART PAGE
 * Renders: cart item list (with qty controls) + order summary sidebar.
 */
function renderCartPage() {
  const app = document.getElementById('app');

  // ── Empty cart state ──────────────────────────────────────
  if (CartState.items.length === 0) {
    app.innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="page-title">Your Cart</h1>
          <div class="empty-state">
            <div class="empty-state-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything yet. Browse our products to get started!</p>
            <a href="#/products" class="btn btn-primary btn-lg">Shop Now →</a>
          </div>
        </div>
      </section>`;
    return;
  }

  // ── Calculate totals ──────────────────────────────────────
  const subtotal  = CartState.getTotal();
  const shipping  = subtotal >= 100 ? 0 : 9.99;   // Free shipping over $100
  const taxRate   = 0.08;                           // 8% tax
  const tax       = subtotal * taxRate;
  const total     = subtotal + shipping + tax;
  const itemCount = CartState.getCount();

  // ── Build cart item rows ──────────────────────────────────
  const cartItemsHTML = CartState.items.map(item => buildCartItem(item)).join('');

  app.innerHTML = `
    <section class="section">
      <div class="container">
        <h1 class="page-title">Your Cart
          <span class="cart-page-badge">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        </h1>

        <div class="cart-layout">

          <!-- ── Cart Items List ──────────────────────────── -->
          <div class="cart-items-section">
            <div class="cart-items-list" id="cart-items-list">
              ${cartItemsHTML}
            </div>

            <!-- Actions row -->
            <div class="cart-actions">
              <button class="btn btn-danger" id="clear-cart-btn">🗑 Clear Cart</button>
              <a href="#/products" class="btn btn-outline">← Continue Shopping</a>
            </div>
          </div>

          <!-- ── Order Summary Sidebar ─────────────────────── -->
          <aside class="order-summary" aria-label="Order summary">
            <h2 class="summary-title">Order Summary</h2>

            <div class="summary-line">
              <span>Subtotal (${itemCount} items)</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>

            <div class="summary-line">
              <span>Shipping</span>
              <span class="${shipping === 0 ? 'free-shipping' : ''}">
                ${shipping === 0 ? '✓ FREE' : '$' + shipping.toFixed(2)}
              </span>
            </div>

            ${shipping > 0 ? `
            <div class="free-shipping-hint">
              Add $${(100 - subtotal).toFixed(2)} more for free shipping!
            </div>` : ''}

            <div class="summary-line">
              <span>Tax (8%)</span>
              <span>$${tax.toFixed(2)}</span>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-line summary-total">
              <span>Total</span>
              <span>$${total.toFixed(2)}</span>
            </div>

            <button class="btn btn-primary btn-full btn-lg" id="checkout-btn">
              🔒 Proceed to Checkout
            </button>

            <div class="summary-trust">
              <span>🔐 Secure checkout</span>
              <span>📦 Fast shipping</span>
              <span>↩️ Easy returns</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;

  attachCartPageEvents();
}

/**
 * Re-render only the cart item list (not the whole cart page).
 * Called after quantity changes or item removal to avoid full page flash.
 */
function refreshCartPage() {
  // If cart is now empty after an action, do a full re-render to show empty state.
  if (CartState.items.length === 0) {
    renderCartPage();
    return;
  }
  // Otherwise, only refresh the items list + summary numbers.
  renderCartPage();
}

// ─────────────────────────────────────────────────────────────

/**
 * 404 NOT FOUND PAGE
 */
function render404Page() {
  document.getElementById('app').innerHTML = `
    <section class="section">
      <div class="container">
        <div class="not-found">
          <div class="not-found-code">404</div>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <a href="#/home" class="btn btn-primary btn-lg">← Back to Home</a>
        </div>
      </div>
    </section>`;
}


// ============================================================
// 4. COMPONENT BUILDERS
// ============================================================

/**
 * Build the HTML string for a single product card.
 * Used in both the Home page (featured) and Products page (grid).
 * @param {object} product - A product object from PRODUCTS[]
 * @returns {string} HTML string
 */
function buildProductCard(product) {
  const discount     = getDiscountPercent(product);
  const stars        = generateStars(product.rating);
  const badgeHTML    = product.badge
    ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(/\s/g,'-')}">${product.badge}</span>`
    : '';
  const discountHTML = discount > 0
    ? `<span class="product-badge badge-discount">-${discount}%</span>`
    : '';
  const priceHTML    = product.originalPrice
    ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>`
    : '';

  return `
    <article class="product-card" data-product-id="${product.id}">
      ${badgeHTML}
      ${discountHTML}

      <!-- Product image area (emoji) -->
      <div class="product-image-wrapper" aria-hidden="true">
        <div class="product-image">${product.image}</div>
      </div>

      <!-- Product info -->
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${product.name}</h3>

        <!-- Star rating -->
        <div class="star-rating" aria-label="${product.rating} out of 5 stars">
          <span class="stars" aria-hidden="true">${stars}</span>
          <span class="review-count">(${product.reviews.toLocaleString()})</span>
        </div>

        <!-- Price -->
        <div class="price-row">
          <span class="price">$${product.price.toFixed(2)}</span>
          ${priceHTML}
        </div>

        <!-- Short description -->
        <p class="product-description">${product.description.slice(0, 80)}…</p>

        <!-- Add to cart button -->
        <button
          class="btn btn-add-cart"
          data-action="add-to-cart"
          data-product-id="${product.id}"
          aria-label="Add ${product.name} to cart"
        >
          🛒 Add to Cart
        </button>
      </div>
    </article>`;
}

/**
 * Build the HTML string for a single cart item row.
 * @param {object} item - A cart item { id, name, price, image, quantity }
 * @returns {string} HTML string
 */
function buildCartItem(item) {
  const lineTotal = (item.price * item.quantity).toFixed(2);

  return `
    <div class="cart-item" data-cart-item-id="${item.id}">
      <!-- Product thumbnail -->
      <div class="cart-item-image" aria-hidden="true">${item.image}</div>

      <!-- Product details -->
      <div class="cart-item-details">
        <h3 class="cart-item-name">${item.name}</h3>
        <p class="cart-item-category">${item.category}</p>
        <p class="cart-item-unit-price">$${item.price.toFixed(2)} each</p>
      </div>

      <!-- Quantity controls -->
      <div class="cart-item-qty">
        <button
          class="qty-btn"
          data-action="qty-decrease"
          data-product-id="${item.id}"
          aria-label="Decrease quantity of ${item.name}"
        >−</button>
        <span class="qty-display" aria-label="Quantity: ${item.quantity}">${item.quantity}</span>
        <button
          class="qty-btn"
          data-action="qty-increase"
          data-product-id="${item.id}"
          aria-label="Increase quantity of ${item.name}"
        >+</button>
      </div>

      <!-- Line total -->
      <div class="cart-item-total">$${lineTotal}</div>

      <!-- Remove button -->
      <button
        class="cart-item-remove"
        data-action="remove-from-cart"
        data-product-id="${item.id}"
        aria-label="Remove ${item.name} from cart"
        title="Remove from cart"
      >✕</button>
    </div>`;
}

/**
 * Build the HTML for the category filter pill buttons.
 * Marks the currently active category with .active class.
 * @returns {string} HTML string
 */
function buildCategoryFilter() {
  return CATEGORIES.map(cat => `
    <button
      class="filter-pill ${FilterState.category === cat ? 'active' : ''}"
      data-category="${cat}"
      aria-pressed="${FilterState.category === cat}"
    >${cat}</button>`
  ).join('');
}


// ============================================================
// 5. FILTERING & SORTING
// ============================================================

/**
 * Return a filtered and sorted copy of PRODUCTS[] based on FilterState.
 *
 * Filtering logic:
 *   1. Category filter — skip if FilterState.category === 'All'
 *   2. Search filter   — checks name, description, and tags (case-insensitive)
 *   3. Sort            — applied after filtering
 *
 * @returns {object[]} - Filtered & sorted product array
 */
function getFilteredProducts() {
  const { category, search, sortBy } = FilterState;
  const query = search.trim().toLowerCase();

  // Step 1 & 2: Filter
  let result = PRODUCTS.filter(p => {
    // Category match (skip if 'All')
    const catMatch = category === 'All' || p.category === category;

    // Text search across name, description, tags
    const searchMatch = !query
      || p.name.toLowerCase().includes(query)
      || p.description.toLowerCase().includes(query)
      || p.tags.some(tag => tag.toLowerCase().includes(query));

    return catMatch && searchMatch;
  });

  // Step 3: Sort (always sort a copy to avoid mutating PRODUCTS)
  result = [...result]; // shallow copy
  switch (sortBy) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    default:
      // 'default': maintain original PRODUCTS[] order (no sort needed)
      break;
  }

  return result;
}


// ============================================================
// 6. UI HELPERS
// ============================================================

/**
 * Update the cart badge number in the nav bar.
 * Also triggers a brief pulse animation to draw attention.
 */
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const count = CartState.getCount();
  badge.textContent = count;

  // Show/hide badge based on count.
  badge.classList.toggle('hidden', count === 0);

  // Pulse animation — remove & re-add the class to retrigger it.
  badge.classList.remove('pulse');
  // Use requestAnimationFrame trick to force a reflow between removes & adds.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      badge.classList.add('pulse');
    });
  });
}

/**
 * Display a temporary toast notification.
 * Toasts stack, auto-dismiss after 3 seconds, and can be manually closed.
 *
 * @param {string} message          - The message text to display
 * @param {'success'|'error'|'info'} type - Controls the color/icon
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Choose icon based on type.
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const icon  = icons[type] || icons.success;

  // Create the toast element.
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss notification">✕</button>`;

  container.appendChild(toast);

  // Trigger slide-in animation on next frame.
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Manual close button.
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

  // Auto-dismiss after 3 seconds.
  const timer = setTimeout(() => dismissToast(toast), 3000);

  // Store timer so manual close can cancel it.
  toast._timer = timer;
}

/**
 * Slide a toast out and remove it from the DOM.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  // Remove from DOM after the CSS transition completes (300ms).
  setTimeout(() => toast.remove(), 350);
}

/**
 * Convert a numeric rating to a star string.
 * Uses filled (★) and empty (☆) Unicode stars.
 * Supports half stars via a simple rounding approach.
 *
 * @param {number} rating - 0 to 5
 * @returns {string}      - e.g. "★★★★☆" for rating 4.2
 */
function generateStars(rating) {
  const full  = Math.floor(rating);                     // e.g. 4
  const half  = rating - full >= 0.5 ? 1 : 0;          // 1 or 0
  const empty = 5 - full - half;                        // fill remainder
  return '★'.repeat(full) + (half ? '⭐' : '') + '☆'.repeat(empty);
  // Simplified: just use filled/empty stars without half-star glyph
}

/**
 * Simpler star renderer using only filled and empty stars.
 * Overrides the above — this is the version actually used.
 * @param {number} rating
 * @returns {string}
 */
function generateStars(rating) {
  const filled = Math.round(rating);  // Round to nearest whole number
  const empty  = 5 - filled;
  return '★'.repeat(filled) + '☆'.repeat(empty);
}


// ============================================================
// 7. EVENT HANDLERS  (Event Delegation pattern)
// ============================================================
/**
 * About Event Delegation:
 *   Since our page content is dynamically rendered, we attach a single
 *   event listener to a stable parent element (#app) rather than to each
 *   button individually. When a button is clicked, the event bubbles up
 *   to #app and we check event.target to see what was clicked.
 *
 *   This is more efficient and avoids the need to re-attach listeners
 *   every time the page content is re-rendered.
 */

/**
 * Attach event listeners for the Home page.
 * Handles: category card clicks → navigates to Products page with filter applied.
 */
function attachHomePageEvents() {
  const app = document.getElementById('app');

  app.addEventListener('click', function homeClickHandler(e) {
    // ── Add to Cart (on featured product cards) ────────────
    const addBtn = e.target.closest('[data-action="add-to-cart"]');
    if (addBtn) {
      const pid     = Number(addBtn.dataset.productId);
      const product = getProductById(pid);
      if (product) {
        CartState.add(product);
        updateCartBadge();
        showToast(`🛒 "${product.name}" added to cart!`, 'success');
      }
      return;
    }

    // ── Category card clicks ───────────────────────────────
    const catCard = e.target.closest('[data-filter-cat]');
    if (catCard) {
      FilterState.category = catCard.dataset.filterCat;
      // Navigate to products page; router will call renderProductsPage()
      Router.navigate('/products');
      return;
    }
  });
}

/**
 * Attach event listeners for the Products page.
 * Handles: category filter pills, search input, sort dropdown, add-to-cart.
 * Uses event delegation on #app for dynamically-rendered elements.
 */
function attachProductsPageEvents() {
  const app         = document.getElementById('app');
  const searchInput = document.getElementById('search-input');
  const sortSelect  = document.getElementById('sort-select');

  // ── Search Input ─────────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      FilterState.search = searchInput.value;
      refreshProductGrid();
    });
  }

  // ── Sort Dropdown ─────────────────────────────────────────
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      FilterState.sortBy = sortSelect.value;
      refreshProductGrid();
    });
  }

  // ── Event Delegation on #app ──────────────────────────────
  app.addEventListener('click', function productsClickHandler(e) {
    // Category filter pill
    const pill = e.target.closest('.filter-pill');
    if (pill) {
      FilterState.category = pill.dataset.category;
      // Update pill active states visually.
      document.querySelectorAll('.filter-pill').forEach(p => {
        const isActive = p.dataset.category === FilterState.category;
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-pressed', isActive);
      });
      refreshProductGrid();
      return;
    }

    // Add to Cart button
    const addBtn = e.target.closest('[data-action="add-to-cart"]');
    if (addBtn) {
      const pid     = Number(addBtn.dataset.productId);
      const product = getProductById(pid);
      if (product) {
        CartState.add(product);
        updateCartBadge();
        showToast(`🛒 "${product.name}" added to cart!`, 'success');

        // Brief visual feedback on the button.
        addBtn.textContent = '✓ Added!';
        addBtn.disabled = true;
        setTimeout(() => {
          addBtn.textContent = '🛒 Add to Cart';
          addBtn.disabled = false;
        }, 1500);
      }
      return;
    }

    // Clear filters button (shown in empty state)
    if (e.target.id === 'clear-filters-btn') {
      FilterState.category = 'All';
      FilterState.search   = '';
      FilterState.sortBy   = 'default';
      // Re-render the full products page to reset all controls.
      renderProductsPage();
      return;
    }
  });
}

/**
 * Attach event listeners for the Cart page.
 * Handles: qty increase/decrease, remove item, clear cart, checkout.
 */
function attachCartPageEvents() {
  const app = document.getElementById('app');

  app.addEventListener('click', function cartClickHandler(e) {
    // ── Quantity Decrease ──────────────────────────────────
    if (e.target.closest('[data-action="qty-decrease"]')) {
      const btn = e.target.closest('[data-action="qty-decrease"]');
      const pid = Number(btn.dataset.productId);
      const item = CartState.items.find(i => i.id === pid);
      if (item) {
        CartState.updateQuantity(pid, item.quantity - 1);
        updateCartBadge();
        if (CartState.items.length === 0) {
          renderCartPage();
        } else {
          refreshCartPage();
        }
      }
      return;
    }

    // ── Quantity Increase ──────────────────────────────────
    if (e.target.closest('[data-action="qty-increase"]')) {
      const btn = e.target.closest('[data-action="qty-increase"]');
      const pid = Number(btn.dataset.productId);
      const item = CartState.items.find(i => i.id === pid);
      if (item) {
        CartState.updateQuantity(pid, item.quantity + 1);
        updateCartBadge();
        refreshCartPage();
      }
      return;
    }

    // ── Remove Item ────────────────────────────────────────
    if (e.target.closest('[data-action="remove-from-cart"]')) {
      const btn  = e.target.closest('[data-action="remove-from-cart"]');
      const pid  = Number(btn.dataset.productId);
      const item = CartState.items.find(i => i.id === pid);
      const name = item ? item.name : 'Item';
      CartState.remove(pid);
      updateCartBadge();
      showToast(`"${name}" removed from cart.`, 'info');
      renderCartPage(); // Full re-render (might become empty)
      return;
    }

    // ── Clear Cart ─────────────────────────────────────────
    if (e.target.id === 'clear-cart-btn') {
      CartState.clear();
      updateCartBadge();
      showToast('Cart cleared.', 'info');
      renderCartPage();
      return;
    }

    // ── Checkout ───────────────────────────────────────────
    if (e.target.id === 'checkout-btn') {
      // Simulate a checkout process (no real payment in this demo).
      showToast('🎉 Order placed! (Demo mode — no real charge)', 'success');
      CartState.clear();
      updateCartBadge();
      setTimeout(() => renderCartPage(), 500);
      return;
    }
  });
}


// ============================================================
// 8. MOBILE MENU
// ============================================================
/**
 * Toggle the mobile menu open/closed.
 * Toggling .open on .main-nav makes it visible via CSS.
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const nav     = document.querySelector('.main-nav');
  if (!menuBtn || !nav) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', isOpen);
    menuBtn.textContent = isOpen ? '✕' : '☰';
  });

  // Close menu when a nav link is clicked.
  nav.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', false);
      menuBtn.textContent = '☰';
    }
  });
}


// ============================================================
// 9. ROUTER REGISTRATION & INITIALISATION
// ============================================================

// Register all routes — map path → renderer function.
Router.register('/home',     renderHomePage);
Router.register('/products', renderProductsPage);
Router.register('/cart',     renderCartPage);
Router.register('/404',      render404Page);

// Update the cart badge with the persisted cart count immediately.
updateCartBadge();

// Initialise the mobile menu toggle.
initMobileMenu();

// Boot the router — this renders the correct page for the current URL.
Router.init();
