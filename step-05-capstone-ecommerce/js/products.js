/**
 * ============================================================
 * STEP 5: Product Data Module — js/products.js
 * ============================================================
 * This file acts as the "database" for our frontend application.
 *
 * In a real full-stack application this data would:
 *   - Live in a database (PostgreSQL, MongoDB, etc.)
 *   - Be served by a REST API or GraphQL endpoint
 *   - Be fetched with: const res = await fetch('/api/products')
 *
 * For this SPA we define it as a global constant so that
 * products.js can be loaded before app.js in index.html.
 *
 * Product Schema:
 * {
 *   id          : number   — unique identifier
 *   name        : string   — product display name
 *   price       : number   — current price (USD)
 *   originalPrice: number|null — original price before discount (null = no discount)
 *   category    : string   — must match a value in CATEGORIES (except 'All')
 *   image       : string   — emoji used as the product image
 *   rating      : number   — 1-5 star rating (supports decimals)
 *   reviews     : number   — number of customer reviews
 *   badge       : string|null — 'New' | 'Sale' | 'Popular' | null
 *   description : string   — short marketing description
 *   tags        : string[] — search-friendly keywords
 * }
 * ============================================================
 */

// ── Product Catalog ─────────────────────────────────────────
const PRODUCTS = [

  // ── Electronics ───────────────────────────────────────────
  {
    id: 1,
    name: 'ProBook Laptop 15"',
    price: 999.99,
    originalPrice: 1299.99,
    category: 'Electronics',
    image: '💻',
    rating: 4.7,
    reviews: 842,
    badge: 'Sale',
    description: 'Powerful 15" laptop with 16GB RAM, 512GB SSD, and an Intel Core i7 processor. Perfect for developers and designers alike.',
    tags: ['laptop', 'computer', 'intel', 'ssd', 'portable', 'work']
  },
  {
    id: 2,
    name: 'UltraPhone X12 Pro',
    price: 799.00,
    originalPrice: null,
    category: 'Electronics',
    image: '📱',
    rating: 4.8,
    reviews: 2103,
    badge: 'Popular',
    description: 'Flagship smartphone with 6.7" AMOLED display, triple-camera system, and all-day battery life. 5G ready.',
    tags: ['phone', 'smartphone', 'mobile', '5g', 'camera', 'amoled']
  },
  {
    id: 3,
    name: 'SoundWave Pro Headphones',
    price: 199.99,
    originalPrice: 249.99,
    category: 'Electronics',
    image: '🎧',
    rating: 4.5,
    reviews: 517,
    badge: 'Sale',
    description: 'Over-ear noise-cancelling headphones with 30-hour battery, premium sound drivers, and a foldable design.',
    tags: ['headphones', 'audio', 'noise cancelling', 'wireless', 'music']
  },
  {
    id: 4,
    name: 'SmartWatch Series 8',
    price: 349.00,
    originalPrice: null,
    category: 'Electronics',
    image: '⌚',
    rating: 4.6,
    reviews: 389,
    badge: 'New',
    description: 'Advanced smartwatch with health monitoring, GPS, sleep tracking, and a gorgeous always-on retina display.',
    tags: ['smartwatch', 'watch', 'fitness', 'gps', 'health', 'wearable']
  },

  // ── Clothing ──────────────────────────────────────────────
  {
    id: 5,
    name: 'Classic Cotton Tee',
    price: 24.99,
    originalPrice: null,
    category: 'Clothing',
    image: '👕',
    rating: 4.3,
    reviews: 1204,
    badge: 'Popular',
    description: 'Premium 100% organic cotton t-shirt. Ultra-soft, pre-shrunk, and available in 12 colors. A wardrobe essential.',
    tags: ['tshirt', 'cotton', 'casual', 'top', 'shirt', 'organic']
  },
  {
    id: 6,
    name: 'Urban Slim Jeans',
    price: 69.99,
    originalPrice: 89.99,
    category: 'Clothing',
    image: '👖',
    rating: 4.4,
    reviews: 678,
    badge: 'Sale',
    description: 'Slim-fit stretch denim jeans. Comfortable all-day wear with a modern silhouette. Available in 4 washes.',
    tags: ['jeans', 'denim', 'pants', 'slim fit', 'casual', 'fashion']
  },
  {
    id: 7,
    name: 'Fleece Zip Hoodie',
    price: 54.99,
    originalPrice: null,
    category: 'Clothing',
    image: '🧥',
    rating: 4.6,
    reviews: 923,
    badge: null,
    description: 'Cozy full-zip fleece hoodie with kangaroo pockets and a soft brushed interior. Perfect for cool evenings.',
    tags: ['hoodie', 'fleece', 'zip', 'jacket', 'cozy', 'winter']
  },
  {
    id: 8,
    name: 'Running Sneakers Pro',
    price: 119.99,
    originalPrice: 139.99,
    category: 'Clothing',
    image: '👟',
    rating: 4.5,
    reviews: 441,
    badge: 'New',
    description: 'Lightweight, breathable running shoes with responsive foam cushioning and a non-slip outsole. Built to perform.',
    tags: ['shoes', 'sneakers', 'running', 'sports', 'athletic', 'footwear']
  },

  // ── Books ─────────────────────────────────────────────────
  {
    id: 9,
    name: 'Clean Code: A Handbook',
    price: 34.99,
    originalPrice: null,
    category: 'Books',
    image: '📚',
    rating: 4.9,
    reviews: 3841,
    badge: 'Popular',
    description: 'Robert C. Martin\'s definitive guide to writing maintainable, readable, and professional software. A must-read for every developer.',
    tags: ['programming', 'software', 'coding', 'development', 'robert martin', 'clean code']
  },
  {
    id: 10,
    name: 'JavaScript: The Good Parts',
    price: 27.99,
    originalPrice: 39.99,
    category: 'Books',
    image: '📖',
    rating: 4.7,
    reviews: 2190,
    badge: 'Sale',
    description: 'Douglas Crockford distills JavaScript down to its most elegant and reliable features. Essential for any JS developer.',
    tags: ['javascript', 'js', 'programming', 'web development', 'frontend', 'crockford']
  },
  {
    id: 11,
    name: 'Atomic Habits',
    price: 18.99,
    originalPrice: null,
    category: 'Books',
    image: '🔖',
    rating: 4.8,
    reviews: 5620,
    badge: null,
    description: 'James Clear\'s groundbreaking guide to building good habits and breaking bad ones using the science of marginal gains.',
    tags: ['productivity', 'habits', 'self help', 'motivation', 'james clear', 'mindset']
  },

  // ── Home & Garden ─────────────────────────────────────────
  {
    id: 12,
    name: 'Ceramic Plant Pot Set',
    price: 39.99,
    originalPrice: 54.99,
    category: 'Home & Garden',
    image: '🪴',
    rating: 4.4,
    reviews: 287,
    badge: 'Sale',
    description: 'Set of 3 modern ceramic pots with drainage holes and matching saucers. Minimalist design suits any interior style.',
    tags: ['plants', 'pots', 'ceramic', 'home decor', 'garden', 'indoor']
  },
  {
    id: 13,
    name: 'Aroma Diffuser & LED',
    price: 44.99,
    originalPrice: null,
    category: 'Home & Garden',
    image: '💡',
    rating: 4.6,
    reviews: 512,
    badge: 'New',
    description: 'Ultrasonic essential oil diffuser with 7-color LED ambiance light, whisper-quiet motor, and auto shut-off safety.',
    tags: ['diffuser', 'aromatherapy', 'essential oil', 'led', 'relaxation', 'home']
  },
  {
    id: 14,
    name: 'Bamboo Cutting Board Set',
    price: 29.99,
    originalPrice: 44.99,
    category: 'Home & Garden',
    image: '🍽️',
    rating: 4.3,
    reviews: 194,
    badge: 'Sale',
    description: 'Set of 3 eco-friendly bamboo cutting boards in nested sizes. Naturally antimicrobial, dishwasher safe, and durable.',
    tags: ['kitchen', 'bamboo', 'cutting board', 'eco', 'cooking', 'sustainable']
  }
];

// ── Category List ────────────────────────────────────────────
// 'All' is always first; remaining values must match product category fields.
const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Books', 'Home & Garden'];

// ── Helper: get a product by ID ──────────────────────────────
/**
 * Find a single product by its numeric ID.
 * @param {number} id
 * @returns {object|undefined}
 */
function getProductById(id) {
  return PRODUCTS.find(p => p.id === Number(id));
}

// ── Helper: get discount percentage ─────────────────────────
/**
 * Calculate the integer discount percentage for a product.
 * Returns 0 if there is no original price.
 * @param {object} product
 * @returns {number}
 */
function getDiscountPercent(product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}
