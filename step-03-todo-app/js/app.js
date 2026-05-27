/**
 * ================================================================
 * STEP 3: JavaScript Logic & State Management
 * To-Do App — Main Application Script
 *
 * KEY CONCEPTS DEMONSTRATED:
 *  1. State Management    — Single source-of-truth object; UI is
 *                           always derived from state, not the DOM.
 *  2. CRUD Operations     — Create, Read, Update, Delete tasks.
 *  3. localStorage        — Persist tasks across page refreshes
 *                           using JSON serialisation.
 *  4. Event Delegation    — Attach ONE listener to the parent list
 *                           instead of one per task (handles
 *                           dynamically created elements too).
 *  5. DOM Manipulation    — Building elements via createElement /
 *                           innerHTML template literals.
 *  6. Filtering           — Derive a view from state without
 *                           mutating the source array.
 *  7. Accessible Modal    — Focus trapping and keyboard navigation.
 * ================================================================
 */

'use strict'; // Catches common mistakes (e.g. undeclared variables)

/* ================================================================
   1. STATE MANAGEMENT
   ------------------------------------------------------------------
   All application data lives in ONE plain object called `state`.
   The UI is ALWAYS re-rendered from this object — we never read
   truth back from the DOM. This pattern is known as "unidirectional
   data flow" (the same idea behind React/Vue).
   ================================================================ */

/**
 * @typedef {Object} Task
 * @property {string}  id        - Unique identifier (Date.now + random)
 * @property {string}  text      - The task description
 * @property {boolean} completed - Whether the task is done
 * @property {number}  createdAt - Timestamp (milliseconds since epoch)
 */

/** Application state — single source of truth */
const state = {
  /** @type {Task[]} */
  tasks: [],

  /** @type {'all'|'active'|'completed'} Which filter tab is active */
  filter: 'all',

  /** @type {string|null} ID of the task currently being edited in the modal */
  editingId: null,
};

/* ================================================================
   2. DOM REFERENCES
   ------------------------------------------------------------------
   Cache all DOM elements at startup. Querying the DOM once and
   storing the reference is faster than calling getElementById()
   every time we need the element.
   ================================================================ */

const taskForm        = document.getElementById('add-task-form');
const taskInput       = document.getElementById('task-input');
const addBtn          = document.getElementById('add-btn');
const taskList        = document.getElementById('task-list');
const emptyState      = document.getElementById('empty-state');
const taskFooter      = document.getElementById('task-footer');
const itemsLeftLabel  = document.getElementById('items-left');
const taskCounter     = document.getElementById('task-counter');
const clearCompletedBtn = document.getElementById('clear-completed');

// Filter buttons (NodeList → convert to Array for easy iteration)
const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const editInput    = document.getElementById('edit-input');
const modalSave    = document.getElementById('modal-save');
const modalCancel  = document.getElementById('modal-cancel');

/* ================================================================
   3. localStorage HELPERS
   ------------------------------------------------------------------
   localStorage only stores strings, so we use JSON.stringify() to
   serialise our tasks array into a string when saving, and
   JSON.parse() to deserialise it back into an array when loading.
   ================================================================ */

/** Storage key — namespaced to avoid collisions with other apps */
const STORAGE_KEY = 'ag-intern-tasks-v1';

/**
 * Persists `state.tasks` to localStorage.
 * Called after every mutation (add, delete, toggle, update).
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch (err) {
    // localStorage can throw if storage quota is exceeded
    console.warn('Could not save tasks to localStorage:', err);
  }
}

/**
 * Loads tasks from localStorage into `state.tasks`.
 * Falls back to an empty array if nothing is stored or JSON is invalid.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.tasks = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not load tasks from localStorage:', err);
    state.tasks = [];
  }
}

/* ================================================================
   4. ID GENERATION
   ------------------------------------------------------------------
   Each task needs a unique ID so we can find it later (for toggle /
   delete / edit). We combine Date.now() with Math.random() to make
   collisions virtually impossible, even if multiple tasks are added
   within the same millisecond.
   ================================================================ */

/**
 * Generates a unique string ID.
 * Uses crypto.randomUUID() when available (modern browsers), with a
 * Date.now + Math.random fallback for older environments.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + 6-digit random number
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/* ================================================================
   5. TASK CRUD OPERATIONS
   ------------------------------------------------------------------
   Each function:
     1. Mutates `state`
     2. Persists to localStorage (saveTasks)
     3. Re-renders the UI (renderTasks)
   This sequence guarantees that state, storage, and DOM are ALWAYS
   in sync.
   ================================================================ */

/**
 * Creates a new task and adds it to `state.tasks`.
 * @param {string} text - The task description (already trimmed)
 */
function addTask(text) {
  /** @type {Task} */
  const newTask = {
    id:        generateId(),
    text:      text,
    completed: false,
    createdAt: Date.now(),
  };

  // Unshift adds to the BEGINNING of the array so newest tasks appear first
  state.tasks.unshift(newTask);

  saveTasks();
  renderTasks();
}

/**
 * Removes a task from `state.tasks` by its ID.
 * We animate the removal (CSS class) before actually deleting the DOM node.
 * @param {string} id - Task ID
 */
function deleteTask(id) {
  // Find the DOM element BEFORE mutating state, so we can animate it
  const taskEl = taskList.querySelector(`[data-id="${id}"]`);

  const doDelete = () => {
    // Array.filter returns a NEW array without the removed task
    state.tasks = state.tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
  };

  if (taskEl) {
    // Add the CSS removing class, then delete after the animation (250ms)
    taskEl.classList.add('removing');
    taskEl.addEventListener('animationend', doDelete, { once: true });
    // Safety net in case animationend doesn't fire (e.g. reduced-motion)
    setTimeout(doDelete, 300);
  } else {
    doDelete();
  }
}

/**
 * Toggles the `completed` boolean of a task.
 * @param {string} id - Task ID
 */
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed; // Flip the boolean

  saveTasks();
  renderTasks();
}

/**
 * Updates the `text` of a task.
 * Called when the user saves changes in the edit modal.
 * @param {string} id      - Task ID
 * @param {string} newText - New text (already trimmed)
 */
function updateTask(id, newText) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.text = newText;

  saveTasks();
  renderTasks();
}

/**
 * Removes ALL completed tasks in one operation.
 */
function clearCompleted() {
  // Keep only tasks that are NOT completed
  state.tasks = state.tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
}

/* ================================================================
   6. FILTER LOGIC
   ================================================================ */

/**
 * Returns a filtered subset of `state.tasks` based on `state.filter`.
 * The original array is NEVER mutated — we return a new array.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (state.filter) {
    case 'active':
      return state.tasks.filter(task => !task.completed);
    case 'completed':
      return state.tasks.filter(task => task.completed);
    case 'all':
    default:
      return state.tasks; // All tasks — no filtering needed
  }
}

/* ================================================================
   7. RENDERING
   ------------------------------------------------------------------
   The renderTasks function is the "view" layer. It:
     1. Gets the filtered task list from state
     2. Clears the current DOM list
     3. Creates a <li> for each task and appends it
     4. Shows/hides the empty state and footer
     5. Updates the counter
   ================================================================ */

/**
 * Main render function. Re-draws the entire task list from state.
 * Called after every state mutation.
 */
function renderTasks() {
  const filtered = getFilteredTasks();

  // -- Clear the current DOM list --
  // We reassign innerHTML to '' rather than using removeChild in a loop,
  // which is simpler for a list of this size.
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    // Show the empty state illustration
    emptyState.classList.remove('hidden');
    taskFooter.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    taskFooter.classList.remove('hidden');

    // Use a DocumentFragment to batch DOM inserts — only ONE reflow
    const fragment = document.createDocumentFragment();
    filtered.forEach(task => {
      fragment.appendChild(createTaskElement(task));
    });
    taskList.appendChild(fragment);
  }

  updateCounter();
  updateFilterButtons();
}

/**
 * Builds and returns a <li> element for a single task.
 * We use a custom checkbox (CSS-styled) instead of a plain button
 * so it's semantically correct and keyboard-accessible.
 *
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');

  // data-id is used by event delegation to identify which task was acted on
  li.dataset.id = task.id;
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.setAttribute('role', 'listitem');

  /*
   * TEMPLATE LITERAL HTML:
   * We build the inner markup as a string and inject it with innerHTML.
   * Note: task.text is sanitised below to prevent XSS.
   */
  li.innerHTML = `
    <label class="task-checkbox-wrapper" title="${task.completed ? 'Mark as active' : 'Mark as completed'}">
      <input
        type="checkbox"
        class="task-checkbox"
        data-action="toggle"
        aria-label="Mark '${escapeHtml(task.text)}' as ${task.completed ? 'active' : 'completed'}"
        ${task.completed ? 'checked' : ''}
      />
      <span class="checkbox-ui" aria-hidden="true"></span>
    </label>

    <span class="task-text">${escapeHtml(task.text)}</span>

    <div class="task-actions" role="group" aria-label="Task actions">
      <button
        class="task-action-btn btn-edit"
        data-action="edit"
        aria-label="Edit task: ${escapeHtml(task.text)}"
        title="Edit"
      >✏️</button>
      <button
        class="task-action-btn btn-delete"
        data-action="delete"
        aria-label="Delete task: ${escapeHtml(task.text)}"
        title="Delete"
      >🗑️</button>
    </div>
  `;

  return li;
}

/**
 * Updates the header counter badge and the footer "X items left" label.
 * "Items left" counts only ACTIVE (non-completed) tasks — same as
 * classic todo apps like TodoMVC.
 */
function updateCounter() {
  const activeCount = state.tasks.filter(t => !t.completed).length;
  const totalCount  = state.tasks.length;

  // Header badge
  taskCounter.textContent = `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`;

  // Footer label
  itemsLeftLabel.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;

  // Grey out the "Clear Completed" button if there's nothing to clear
  const hasCompleted = state.tasks.some(t => t.completed);
  clearCompletedBtn.disabled = !hasCompleted;
  clearCompletedBtn.style.opacity = hasCompleted ? '1' : '0.4';
}

/**
 * Ensures the correct filter button has the `.active` class.
 * Called inside renderTasks so the active filter always matches state.
 */
function updateFilterButtons() {
  filterBtns.forEach(btn => {
    if (btn.dataset.filter === state.filter) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}

/* ================================================================
   8. XSS PREVENTION — HTML Escaping
   ------------------------------------------------------------------
   Any text that comes from user input MUST be escaped before it
   is inserted into the DOM. Without this, a task named
   "<script>alert('hacked')</script>" would execute JS!
   ================================================================ */

/**
 * Escapes HTML special characters in a string.
 * Prevents Cross-Site Scripting (XSS) when injecting user content.
 * @param {string} str - Raw user input
 * @returns {string}  - Safe HTML string
 */
function escapeHtml(str) {
  const map = {
    '&':  '&amp;',
    '<':  '&lt;',
    '>':  '&gt;',
    '"':  '&quot;',
    "'":  '&#039;',
  };
  return String(str).replace(/[&<>"']/g, char => map[char]);
}

/* ================================================================
   9. MODAL (Edit Task)
   ------------------------------------------------------------------
   The modal overlays the page and lets the user edit a task's text.
   Good modal UX requires:
     - Removing the `hidden` attribute to show (not just CSS)
     - Moving focus into the modal when opened
     - Returning focus to the trigger element when closed
     - Trapping the Tab key inside the modal while open
     - Closing on Escape key or backdrop click
   ================================================================ */

/** The element that triggered the modal; focus returns here on close */
let _lastFocusedEl = null;

/**
 * Opens the edit modal for a given task.
 * @param {string} id - Task ID to edit
 */
function openModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  state.editingId = id;

  // Pre-fill the input with the current task text
  editInput.value = task.text;

  // Remove the `hidden` attribute to make the modal visible
  modalOverlay.removeAttribute('hidden');

  // Save the focused element so we can restore it when the modal closes
  _lastFocusedEl = document.activeElement;

  // Move focus into the input for immediate typing
  editInput.focus();
  editInput.select(); // Select all text so user can immediately retype
}

/**
 * Closes the edit modal without saving.
 */
function closeModal() {
  modalOverlay.setAttribute('hidden', '');
  state.editingId = null;

  // Restore focus to the element that opened the modal
  if (_lastFocusedEl) {
    _lastFocusedEl.focus();
    _lastFocusedEl = null;
  }
}

/**
 * Saves the edited task text and closes the modal.
 */
function saveModal() {
  const newText = editInput.value.trim();

  if (!newText) {
    // Shake the input to signal validation failure
    editInput.style.animation = 'none';
    editInput.offsetHeight; // Force reflow
    editInput.style.animation = '';
    editInput.focus();
    return;
  }

  if (state.editingId) {
    updateTask(state.editingId, newText);
  }
  closeModal();
}

/* ================================================================
   10. EVENT LISTENERS
   ================================================================ */

/* ── 10a. Add Task Form (submit) ─────────────────────────────── */
/**
 * Handles the form's "submit" event.
 * We listen for "submit" rather than the button "click" so that
 * pressing Enter in the input also triggers it.
 */
taskForm.addEventListener('submit', function (event) {
  // Prevent the browser's default behaviour of reloading the page
  event.preventDefault();

  const text = taskInput.value.trim();

  if (!text) {
    // Visual feedback: briefly highlight the empty input
    taskInput.focus();
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () => {
      taskInput.classList.remove('shake');
    }, { once: true });
    return;
  }

  addTask(text);

  // Clear the input and refocus for quick consecutive additions
  taskInput.value = '';
  taskInput.focus();
});

/* ── 10b. Filter Buttons ─────────────────────────────────────── */
/**
 * Attach a click listener to each filter button.
 * When clicked, update `state.filter` and re-render.
 */
filterBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    state.filter = this.dataset.filter; // 'all' | 'active' | 'completed'
    renderTasks();
  });
});

/* ── 10c. Task List — Event Delegation ───────────────────────── */
/**
 * EVENT DELEGATION:
 * Instead of attaching separate click listeners to every task's
 * checkbox, edit button, and delete button (which would be dozens
 * of listeners, and would break for dynamically-added tasks),
 * we attach ONE listener to the parent `taskList`.
 *
 * When any element inside the list is clicked, the event "bubbles up"
 * to this listener. We then inspect event.target to see WHICH element
 * was actually clicked, using `data-action` attributes as a
 * declarative "command" system.
 */
taskList.addEventListener('click', function (event) {
  // Find the closest element with a data-action attribute
  // (handles clicks on child elements like emoji inside buttons)
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return; // Clicked on the list background — ignore

  // Walk up the DOM to find the parent <li> with data-id
  const taskItem = actionEl.closest('.task-item');
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;
  const action = actionEl.dataset.action;

  // Route to the correct handler based on the data-action value
  switch (action) {
    case 'toggle':
      toggleTask(taskId);
      break;
    case 'delete':
      deleteTask(taskId);
      break;
    case 'edit':
      openModal(taskId);
      break;
  }
});

/**
 * Also handle the 'change' event on checkboxes via delegation.
 * The 'change' event fires when a checkbox value changes, giving
 * a more semantically correct event for toggles than 'click'.
 */
taskList.addEventListener('change', function (event) {
  if (event.target.dataset.action === 'toggle') {
    const taskItem = event.target.closest('.task-item');
    if (taskItem) {
      toggleTask(taskItem.dataset.id);
    }
  }
});

/* ── 10d. Clear Completed Button ─────────────────────────────── */
clearCompletedBtn.addEventListener('click', clearCompleted);

/* ── 10e. Modal — Save ───────────────────────────────────────── */
modalSave.addEventListener('click', saveModal);

/* ── 10f. Modal — Cancel ─────────────────────────────────────── */
modalCancel.addEventListener('click', closeModal);

/* ── 10g. Modal — Backdrop click to close ───────────────────── */
/**
 * Clicking the dark overlay (but NOT the modal card itself)
 * should close the modal. We check that the clicked target
 * is exactly the overlay, not a child element.
 */
modalOverlay.addEventListener('click', function (event) {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

/* ── 10h. Keyboard Shortcuts ─────────────────────────────────── */
/**
 * Global keydown listener handles:
 *   - Escape: close modal
 *   - Enter in edit modal: save
 *   - Tab inside modal: trap focus within the modal
 */
document.addEventListener('keydown', function (event) {
  // Only handle keys when the modal is open
  if (modalOverlay.hasAttribute('hidden')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }

  if (event.key === 'Enter') {
    // Don't capture Enter if focus is on a button (would double-fire)
    if (document.activeElement !== modalSave && document.activeElement !== modalCancel) {
      event.preventDefault();
      saveModal();
      return;
    }
  }

  // Focus trap: keep Tab key inside the modal
  if (event.key === 'Tab') {
    const focusable = modalOverlay.querySelectorAll(
      'button, input, [href], [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
});

/* ================================================================
   11. SAMPLE DATA (shown on first visit only)
   ------------------------------------------------------------------
   A friendly onboarding experience: if the user has never used the
   app before (localStorage is empty), we seed a few example tasks
   so the app doesn't open to a blank screen.
   ================================================================ */

/**
 * Loads a set of sample tasks when the app is run for the first time.
 * This only fires when localStorage has no data for our STORAGE_KEY.
 */
function loadSampleData() {
  const samples = [
    { text: 'Welcome! Check off this task ✅', completed: true  },
    { text: 'Click the ✏️ button to edit a task',   completed: false },
    { text: 'Click the 🗑️ button to delete a task', completed: false },
    { text: 'Use the filter bar to show Active / Completed tasks', completed: false },
    { text: 'Add a new task using the input above!', completed: false },
  ];

  // Add in reverse so they appear in the right order (unshift adds to front)
  [...samples].reverse().forEach(s => {
    state.tasks.push({
      id:        generateId(),
      text:      s.text,
      completed: s.completed,
      createdAt: Date.now(),
    });
  });

  saveTasks();
}

/* ================================================================
   12. INITIALISATION
   ------------------------------------------------------------------
   The `init` function is the entry point. It runs once when the
   script loads (after the DOM is ready, since the <script> tag
   is at the end of <body>).
   ================================================================ */

/**
 * Initialises the application:
 *   1. Load persisted tasks from localStorage
 *   2. Seed sample data on first visit
 *   3. Render the initial UI
 */
function init() {
  loadTasks();

  // First visit: localStorage is empty → seed sample tasks
  if (state.tasks.length === 0) {
    loadSampleData();
  }

  renderTasks();

  // Give the input autofocus so the user can start typing immediately
  taskInput.focus();

  console.info(
    '%c✅ To-Do App Initialised',
    'color: #a78bfa; font-weight: bold; font-size: 14px;'
  );
  console.info(
    `%cLoaded ${state.tasks.length} task(s) from localStorage.`,
    'color: #94a3b8;'
  );
}

// Kick everything off 🚀
init();
