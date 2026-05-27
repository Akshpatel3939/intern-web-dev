/**
 * ================================================================
 * STEP 4: Asynchronous JavaScript & RESTful APIs
 * ----------------------------------------------------------------
 * Project : Real-time Weather Dashboard
 * API     : OpenWeatherMap  https://openweathermap.org/api
 *
 * ── Key Concepts ──────────────────────────────────────────────
 *
 *  1. PROMISES
 *     A Promise is a JavaScript object that represents an eventual
 *     result of an asynchronous operation. It can be in one of
 *     three states:
 *       • pending   — the async work is still running
 *       • fulfilled — the work completed successfully
 *       • rejected  — the work failed with an error
 *
 *  2. async / await
 *     'async' before a function declaration makes that function
 *     always return a Promise.  Inside an async function you can
 *     use 'await' to PAUSE execution until a Promise settles,
 *     then resume with the resolved value — all without callback
 *     nesting (callback hell).
 *
 *       async function example() {
 *         const result = await somePromise(); // pauses here
 *         console.log(result);                // runs after
 *       }
 *
 *  3. FETCH API
 *     fetch(url) sends an HTTP request and returns a Promise that
 *     resolves to a Response object.  Crucially, fetch() does NOT
 *     reject on HTTP error codes (404, 401, 500 etc.); it only
 *     rejects on network failures.  This is why we ALWAYS check
 *     response.ok manually.
 *
 *  4. try / catch / finally
 *     The error-handling trio:
 *       try     { … }  — run the risky code
 *       catch(e){ … }  — runs ONLY if an error is thrown
 *       finally { … }  — runs ALWAYS (success or failure)
 *     We use 'finally' to hide the loading spinner no matter what.
 *
 *  5. REST API
 *     REST (Representational State Transfer) is a design style for
 *     APIs over HTTP.  Each resource has a URL, and you interact
 *     with it using HTTP verbs (GET, POST, PUT, DELETE).
 *     OpenWeatherMap's current-weather endpoint is:
 *       GET https://api.openweathermap.org/data/2.5/weather
 *           ?q={city}&appid={key}&units=metric
 *
 *  6. JSON
 *     JavaScript Object Notation — the data format APIs use.
 *     response.json() parses the response body into a JS object.
 * ================================================================
 */


/* ============================================================
   CONFIGURATION
   ============================================================ */

// ⚠️  IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your free key.
//     Sign up at: https://openweathermap.org/api
//     Free tier  → 1,000 API calls per day, no credit card needed.
//     After signing up, go to "API Keys" in your account dashboard.
const API_KEY = 'efb2db2e792b216d9baa5fc82e8cedd0';

// Base URL for the OpenWeatherMap REST API (v2.5)
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Units system:  'metric'   → Celsius  + m/s wind
//                'imperial' → Fahrenheit + mph wind
//                'standard' → Kelvin
const UNITS = 'metric';

// localStorage key used to persist recent searches across sessions
const STORAGE_KEY = 'weather-recent';

// Maximum number of recent searches to remember
const MAX_RECENT = 5;


/* ============================================================
   EXAMPLE JSON RESPONSE FROM OPENWEATHERMAP
   ============================================================
   Understanding the shape of the data before you code saves a
   lot of confusion.  Here is an annotated snippet of what the
   API returns for a successful city search:

   {
     "name": "London",              ← city name  (data.name)
     "sys": {
       "country": "GB"              ← ISO country code  (data.sys.country)
     },
     "main": {
       "temp":       15.3,          ← current temp in chosen units
       "feels_like": 13.8,          ← perceived temperature
       "humidity":   72,            ← percentage  0–100
       "pressure":   1013           ← atmospheric pressure in hPa
     },
     "weather": [                   ← array (always check index 0)
       {
         "description": "overcast clouds",
         "icon":        "04d"       ← icon code; build URL with it
       }
     ],
     "wind": {
       "speed": 4.6                 ← wind speed in m/s (metric)
     },
     "visibility": 10000            ← in metres; divide by 1000 → km
   }

   Error responses look like:
   {
     "cod":     "404",
     "message": "city not found"
   }
   ============================================================ */


/* ============================================================
   APPLICATION STATE
   ============================================================
   Centralising mutable state in one object makes it easier to
   reason about what data the app holds at any given moment.
   ============================================================ */
const state = {
  /** The city name currently displayed (or null if none). */
  currentCity: null,

  /**
   * Recent searches loaded from localStorage.
   * JSON.parse turns the stored string back into a JS array.
   * If nothing is stored yet, the fallback '[]' gives an empty array.
   */
  recentSearches: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
};


/* ============================================================
   DOM REFERENCES
   ============================================================
   Caching references at startup is more efficient than calling
   getElementById() every time we need to update the UI.
   ============================================================ */
const searchForm      = document.getElementById('search-form');
const cityInput       = document.getElementById('city-input');
const searchBtn       = document.getElementById('search-btn');
const btnText         = document.getElementById('btn-text');
const spinner         = document.getElementById('spinner');
const recentContainer = document.getElementById('recent-searches');
const errorCard       = document.getElementById('error-card');
const weatherSection  = document.getElementById('weather-section');
const welcomeState    = document.getElementById('welcome-state');

// Main card elements
const cityNameEl      = document.getElementById('city-name');
const countryDateEl   = document.getElementById('country-date');
const weatherIconEl   = document.getElementById('weather-icon');
const temperatureEl   = document.getElementById('temperature');
const weatherDescEl   = document.getElementById('weather-desc');
const feelsLikeEl     = document.getElementById('feels-like');

// Stat card elements
const humidityEl      = document.getElementById('humidity');
const windSpeedEl     = document.getElementById('wind-speed');
const pressureEl      = document.getElementById('pressure');
const visibilityEl    = document.getElementById('visibility');


/* ============================================================
   API FUNCTIONS
   ============================================================ */

/**
 * Fetches current weather data for a city from OpenWeatherMap.
 *
 * WHY async/await here?
 *   Without async/await we'd need to chain .then().then().catch()
 *   callbacks.  async/await lets us write sequential-looking code
 *   that is still non-blocking (the browser stays responsive).
 *
 * @param  {string} city   - City name to search for (e.g. "London")
 * @returns {Promise<Object>} Raw API response object
 * @throws {Error}  On non-OK HTTP responses or network failures
 */
async function fetchWeather(city) {
  /*
   * Build the full API URL.
   * encodeURIComponent ensures spaces/special chars are URL-safe
   * e.g. "New York" → "New%20York"
   */
  const url =
    `${BASE_URL}/weather` +
    `?q=${encodeURIComponent(city)}` +
    `&appid=${API_KEY}` +
    `&units=${UNITS}`;

  /*
   * fetch() returns a Promise.
   * 'await' pauses this function until the HTTP response arrives.
   * The browser is NOT frozen — other events still fire.
   */
  const response = await fetch(url);

  /*
   * IMPORTANT: fetch() resolves (does NOT reject) even for HTTP
   * errors like 404 or 401.  We must manually check response.ok
   * (which is true only for status codes 200–299).
   */
  if (!response.ok) {
    // Map common HTTP error codes to human-readable messages
    switch (response.status) {
      case 404:
        throw new Error(
          `City "${city}" not found. Check the spelling and try again.`
        );
      case 401:
        throw new Error(
          'Invalid API key. Check your OpenWeatherMap key in app.js.'
        );
      case 429:
        throw new Error(
          'Too many requests. Please wait a moment and try again.'
        );
      default:
        throw new Error(
          `Weather service error (HTTP ${response.status}). Please try again.`
        );
    }
  }

  /*
   * response.json() reads the response body and parses it.
   * It also returns a Promise, so we await it too.
   * The result is a plain JavaScript object we can dot-access.
   */
  const data = await response.json();
  return data;
}


/* ============================================================
   DATA PARSING
   ============================================================ */

/**
 * Transforms the raw, deeply-nested OpenWeatherMap JSON into a
 * flat, friendly object that the rest of the app can use easily.
 *
 * Parsing data into a clean shape (sometimes called a "view model")
 * keeps UI code simple — it only needs to read, not navigate.
 *
 * @param  {Object} data - Raw API response from fetchWeather()
 * @returns {Object}      Normalised weather data object
 */
function parseWeatherData(data) {
  return {
    city:        data.name,
    country:     data.sys.country,

    // Math.round removes the decimal for cleaner display
    temp:        Math.round(data.main.temp),
    feelsLike:   Math.round(data.main.feels_like),

    // data.weather is an array; the first item is the primary condition
    description: data.weather[0].description,

    /*
     * Build the icon image URL from the icon code.
     * '@2x' requests the double-resolution (64×64) version.
     * Example code "04d" → https://openweathermap.org/img/wn/04d@2x.png
     */
    icon:        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
    iconAlt:     data.weather[0].description,

    humidity:    data.main.humidity,

    /*
     * Wind speed comes in m/s for metric units.
     * Multiply by 3.6 to convert to km/h (1 m/s = 3.6 km/h).
     */
    windSpeed:   Math.round(data.wind.speed * 3.6),

    pressure:    data.main.pressure,

    /*
     * Visibility comes in metres; divide by 1000 for km.
     * The logical OR handles cities where visibility is missing.
     */
    visibility:  Math.round((data.visibility || 0) / 1000),
  };
}


/* ============================================================
   HELPER — DATE FORMATTING
   ============================================================ */

/**
 * Returns a human-readable date string for today, e.g.
 * "Tuesday, 27 May 2026"
 *
 * @returns {string}
 */
function getFormattedDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}


/* ============================================================
   UI — RENDERING
   ============================================================ */

/**
 * Populates every DOM element with live weather data and makes
 * the weather section visible while hiding the welcome state.
 *
 * @param {Object} weather - Parsed weather data from parseWeatherData()
 */
function displayWeather(weather) {
  // ── Main card ──
  cityNameEl.textContent    = weather.city;
  countryDateEl.textContent = `${weather.country} • ${getFormattedDate()}`;

  // Weather icon
  weatherIconEl.src = weather.icon;
  weatherIconEl.alt = weather.iconAlt;

  // Temperature & description
  // textContent is safer than innerHTML when inserting dynamic data
  temperatureEl.textContent = `${weather.temp}°C`;
  weatherDescEl.textContent = weather.description;
  feelsLikeEl.textContent   = `Feels like ${weather.feelsLike}°C`;

  // ── Stat cards ──
  humidityEl.textContent  = `${weather.humidity}%`;
  windSpeedEl.textContent = `${weather.windSpeed} km/h`;
  pressureEl.textContent  = `${weather.pressure} hPa`;
  visibilityEl.textContent = `${weather.visibility} km`;

  // ── Visibility toggling ──
  // Remove 'hidden' attribute to show the weather section
  weatherSection.removeAttribute('hidden');
  // Add 'hidden' to remove the welcome state from the flow
  welcomeState.setAttribute('hidden', '');

  // Hide any previous errors
  hideError();

  // Scroll the results into view on mobile (smooth behaviour)
  weatherSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Displays an error message in the error card and hides weather data.
 *
 * @param {string} message - Human-readable error text
 */
function showError(message) {
  // Prepend an emoji for quick visual scanning
  errorCard.textContent = `⚠️  ${message}`;
  errorCard.removeAttribute('hidden');

  // Ensure stale weather data is not shown at the same time
  weatherSection.setAttribute('hidden', '');
}

/**
 * Hides the error card (called before each new search).
 */
function hideError() {
  errorCard.setAttribute('hidden', '');
  errorCard.textContent = '';
}

/**
 * Puts the UI into a "loading" state while the API call is in flight.
 * Disabling the button prevents duplicate submissions.
 */
function showLoading() {
  searchBtn.disabled       = true;
  btnText.textContent      = 'Searching…';
  spinner.removeAttribute('hidden');   // show spinner
}

/**
 * Restores the button to its default state after the API call ends
 * (whether it succeeded or failed — called from the 'finally' block).
 */
function hideLoading() {
  searchBtn.disabled  = false;
  btnText.textContent = 'Search';
  spinner.setAttribute('hidden', '');  // hide spinner
}


/* ============================================================
   UI — RECENT SEARCHES
   ============================================================ */

/**
 * Renders the recent-searches pill buttons from state.recentSearches.
 * Clears and re-renders on every call to stay in sync with state.
 */
function displayRecentSearches() {
  // Clear existing pills first
  recentContainer.innerHTML = '';

  if (state.recentSearches.length === 0) return;

  // Optional label so the user understands what the pills are
  const label = document.createElement('span');
  label.className   = 'recent-label';
  label.textContent = 'Recent:';
  label.style.cssText =
    'color: var(--color-text-muted); font-size: 0.8rem; align-self: center;';
  recentContainer.appendChild(label);

  // Create one pill button per saved city
  state.recentSearches.forEach((city) => {
    const pill = document.createElement('button');
    pill.type      = 'button';
    pill.className = 'recent-pill';
    pill.textContent = city;

    // Clicking a pill triggers a new search for that city
    pill.addEventListener('click', () => {
      cityInput.value = city;
      handleSearch(city);
    });

    recentContainer.appendChild(pill);
  });
}

/**
 * Adds a city to the recent-searches list, removes duplicates,
 * caps the list at MAX_RECENT, and persists to localStorage.
 *
 * @param {string} city - The city name to store
 */
function addRecentSearch(city) {
  /*
   * Filter out any existing occurrence of this city (case-insensitive)
   * so it won't appear twice.  Then prepend it to the front.
   */
  const filtered = state.recentSearches.filter(
    (c) => c.toLowerCase() !== city.toLowerCase()
  );
  state.recentSearches = [city, ...filtered].slice(0, MAX_RECENT);

  /*
   * Persist to localStorage so searches survive page refreshes.
   * JSON.stringify converts the array to a string for storage.
   */
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recentSearches));
}


/* ============================================================
   EVENT HANDLING — SEARCH ORCHESTRATION
   ============================================================ */

/**
 * Main search handler: orchestrates the full async fetch-and-display flow.
 *
 * This is an async function so we can use 'await' inside it.
 * The try/catch/finally pattern ensures we handle errors gracefully
 * and always clean up the loading state.
 *
 * @param {string} city - City name to search for
 */
async function handleSearch(city) {
  // Guard: ignore empty or whitespace-only input
  const trimmed = city.trim();
  if (!trimmed) return;

  // Update state
  state.currentCity = trimmed;

  // Set up loading UI
  showLoading();
  hideError();

  /*
   * try   → run the async work that might fail
   * catch → handle any error thrown in the try block
   * finally → ALWAYS runs last; perfect for cleanup
   */
  try {
    /*
     * Step 1: Fetch raw JSON from the OpenWeatherMap REST API.
     * 'await' suspends this function until the Promise resolves.
     * If the server returns a non-OK status, fetchWeather() throws.
     */
    const rawData = await fetchWeather(trimmed);

    /*
     * Step 2: Transform the raw nested JSON into a clean flat object.
     * This is pure synchronous work, so no 'await' needed.
     */
    const weather = parseWeatherData(rawData);

    /*
     * Step 3: Update the DOM with the parsed weather values.
     */
    displayWeather(weather);

    /*
     * Step 4: Save this city to recent searches and refresh the pills.
     * We use weather.city (from the API response) instead of the raw
     * input so capitalisation is always consistent.
     */
    addRecentSearch(weather.city);
    displayRecentSearches();

    // Clear the input field for the next search
    cityInput.value = '';

  } catch (error) {
    /*
     * Two broad error categories:
     *
     *  TypeError — fetch() itself threw because there is no network
     *              (offline, DNS failure, CORS block, etc.)
     *
     *  Any other Error — thrown by our own fetchWeather() function
     *                    for bad status codes, or any unexpected issue.
     */
    if (error instanceof TypeError) {
      // Network-level problem (no internet, etc.)
      showError(
        'Network error. Please check your internet connection and try again.'
      );
    } else {
      // API-level problem (404, 401, etc.) — use our custom message
      showError(error.message);
    }

    // Log to the console for developer debugging
    console.error('[Weather App] Fetch error:', error);

  } finally {
    /*
     * 'finally' runs whether the try block succeeded or the catch
     * block ran.  Ideal for resetting the loading UI so the button
     * is never left permanently disabled.
     */
    hideLoading();
  }
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

/*
 * Form submit — fires when the user presses Enter or clicks "Search".
 * preventDefault() stops the browser from reloading the page,
 * which is the default behaviour for form submission.
 */
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleSearch(cityInput.value);
});

/*
 * Allow pressing Enter inside the input even without a surrounding form
 * (belt-and-suspenders approach for maximum compatibility).
 */
cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSearch(cityInput.value);
  }
});


/* ============================================================
   INITIALIZATION
   ============================================================ */

/**
 * init() is called once when the page loads.
 * It renders any saved recent searches and, if there are any,
 * automatically fetches weather for the most recently searched city.
 *
 * This gives returning users an instant result without re-typing.
 */
function init() {
  // Render any saved recent searches
  displayRecentSearches();

  /*
   * Auto-search for the most recent city.
   * state.recentSearches[0] is the last city the user searched for
   * (we prepend new searches, so index 0 is always the newest).
   */
  if (state.recentSearches.length > 0) {
    const lastCity = state.recentSearches[0];
    cityInput.value = lastCity;
    handleSearch(lastCity);
  }
}

// Kick off the application
init();
