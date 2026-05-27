/**
 * ============================================================
 * STEP 5: Client-Side Router — js/router.js
 * ============================================================
 * Implements hash-based routing for our Single Page Application.
 *
 * Why hash-based routing?
 *   URLs like /#/products change the fragment identifier (hash)
 *   without causing a browser page reload. The browser fires
 *   the 'hashchange' event, which we intercept to swap content.
 *
 * How it works (step by step):
 *   1. app.js registers route handlers:
 *        Router.register('/home', renderHomePage)
 *        Router.register('/products', renderProductsPage)
 *
 *   2. When the user clicks a nav link (href="#/products"),
 *      the browser updates window.location.hash to "#/products"
 *      and fires the 'hashchange' event.
 *
 *   3. handleRouteChange() reads the hash, looks up the handler
 *      in this.routes, and calls it — swapping the page content.
 *
 *   4. Router.init() also runs handleRouteChange() on first load
 *      so the correct page appears immediately.
 *
 * Route format:
 *   window.location.hash = "#/products"
 *   → getCurrentRoute() returns "/products"
 *   → this.routes['/products'] is called
 * ============================================================
 */

const Router = {

  /**
   * Route registry — maps path strings to handler functions.
   * Populated by Router.register() calls in app.js.
   * Example: { '/home': renderHomePage, '/products': renderProductsPage }
   */
  routes: {},

  /**
   * Register a route handler.
   * @param {string}   path    - Route path, e.g. '/home' or '/products'
   * @param {Function} handler - Function to call when this route is active
   *
   * Usage:
   *   Router.register('/home', renderHomePage);
   */
  register(path, handler) {
    this.routes[path] = handler;
  },

  /**
   * Programmatically navigate to a route by updating the hash.
   * This triggers a 'hashchange' event, which handleRouteChange catches.
   * @param {string} path - e.g. '/products' or '/cart'
   *
   * Usage:
   *   Router.navigate('/products');
   *   // → sets window.location.hash = '#/products'
   */
  navigate(path) {
    window.location.hash = path;
  },

  /**
   * Read and normalise the current route from the URL hash.
   * Returns '/home' as the default if the hash is empty.
   *
   * Examples:
   *   hash = ""        → "/home"
   *   hash = "#/cart"  → "/cart"
   *
   * @returns {string} - Normalised path starting with '/'
   */
  getCurrentRoute() {
    // window.location.hash includes the '#' character, so we slice it off.
    // If the hash is empty (first load), default to '/home'.
    const hash = window.location.hash.slice(1) || '/home';
    return hash;
  },

  /**
   * Core routing logic — called on every hashchange event and on init.
   *
   * Steps:
   *   1. Read the current route from the URL hash.
   *   2. Parse a base path and optional params from the route.
   *      e.g. route="/product/5" → basePath="product", params=["5"]
   *   3. Update active styling on nav links.
   *   4. Scroll to the top of the page (simulates a page transition).
   *   5. Look up and invoke the registered route handler.
   *   6. Fall back to the /404 handler if no match is found.
   */
  handleRouteChange() {
    const route = this.getCurrentRoute(); // e.g. "/products" or "/cart"

    // Split the route to support parameterised paths like /product/5
    // route.slice(1) removes the leading '/', then we split on '/'
    // e.g. "/products"  → parts = ["products"]       basePath="/products", params=[]
    // e.g. "/product/5" → parts = ["product","5"]    basePath="/product",  params=["5"]
    const parts    = route.slice(1).split('/');
    const basePath = '/' + parts[0];      // Always the first segment
    const params   = parts.slice(1);      // Any additional segments (empty array if none)

    // ── Update active nav link ──────────────────────────────
    // Mark the matching nav link as active, remove from all others.
    // We match on both href (exact) and data-route (for parameterised routes).
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkRoute = link.getAttribute('href').replace('#', ''); // e.g. "/home"
      const isActive  = linkRoute === route || link.dataset.route === parts[0];
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // ── Scroll to top ───────────────────────────────────────
    // Smooth scroll feels more native; falls back gracefully in older browsers.
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── Invoke the handler ──────────────────────────────────
    const handler = this.routes[basePath];

    if (handler) {
      // Spread params so handlers can accept them as individual arguments.
      // e.g. renderProductDetail('5') for route "/product/5"
      handler(...params);
    } else {
      // No matching route — show 404 page if registered.
      if (this.routes['/404']) {
        this.routes['/404']();
      } else {
        // Absolute fallback if /404 isn't registered yet.
        document.getElementById('app').innerHTML = `
          <div style="text-align:center;padding:6rem 2rem;">
            <h1 style="font-size:4rem;">404</h1>
            <p>Page not found.</p>
            <a href="#/home">Go Home</a>
          </div>`;
      }
    }
  },

  /**
   * Initialise the router.
   * - Attaches the 'hashchange' listener to the window.
   * - Immediately calls handleRouteChange() to render the correct
   *   page for the current URL (handles direct links & page refreshes).
   *
   * Call this once at application startup (end of app.js).
   */
  init() {
    // Listen for future hash changes (user clicks nav links or calls Router.navigate)
    window.addEventListener('hashchange', () => this.handleRouteChange());

    // Handle the route that's in the URL right now (first load / refresh)
    this.handleRouteChange();
  }
};
