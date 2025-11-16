// ==========================
// === POMODORO TIMER LOGIC ===
// ==========================

// --------------------------
// Focus score (global across the app)
// --------------------------
const TASK_POINTS = 10; // points awarded per completed task (once)
const POMODORO_POINTS = 5; // points awarded per finished pomodoro session

let focusScore = 0;
const FOCUS_SCORE_SCHEMA_VERSION = 1; // bump to reset existing scores when structure/logic changes

function loadFocusScore() {
  try {
    // If schema version changed, reset the stored score to 0 once to avoid legacy imbalances
    const currentVersion = parseInt(localStorage.getItem("focusScoreVersion")) || 0;
    if (currentVersion < FOCUS_SCORE_SCHEMA_VERSION) {
      focusScore = 0;
      localStorage.setItem("focusScoreVersion", String(FOCUS_SCORE_SCHEMA_VERSION));
      localStorage.setItem("focusScore", "0");
      return;
    }

    const raw = localStorage.getItem("focusScore");
    focusScore = Math.max(0, parseInt(raw) || 0);
  } catch (err) {
    focusScore = 0;
  }
}

function saveFocusScore() {
  try {
    localStorage.setItem("focusScore", String(focusScore));
  } catch (err) {
    console.error("Failed to save focus score:", err);
  }
}

// UI for score (create if missing)
function ensureScoreElement() {
  let el = document.getElementById("focusScoreDisplay");
  if (!el) {
    el = document.createElement("div");
    el.id = "focusScoreDisplay";
    // Use CSS class for styling so it fits the app theme (defined in style.css)
    el.className = "score-badge";
    // Prefer inserting into the navbar so it visually integrates with the header
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      // position will be absolute relative to the fixed navbar
      navbar.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  }
  return el;
}

function updateScoreDisplay() {
  const el = ensureScoreElement();
  el.textContent = `Focus Score: ${focusScore}`;
}

function incrementFocusScore(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  focusScore = Math.max(0, focusScore + Math.floor(amount));
  saveFocusScore();
  // update display and give a subtle pulse animation to the badge
  const el = ensureScoreElement();
  updateScoreDisplay();
  el.classList.add('score-pulse');
  // remove class after animation completes
  setTimeout(() => el.classList.remove('score-pulse'), 800);
}

// load score immediately so UI is correct
loadFocusScore();
updateScoreDisplay();

// Get DOM elements related to the Pomodoro feature
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const timeDisplay = document.getElementById("time");
const taskInput = document.getElementById("taskName");
const quoteEl = document.getElementById("motivationQuote");
const circle = document.querySelector(".progress-ring-circle");

// Check if all timer-related elements exist (prevents script errors on other pages)
if (startBtn && pauseBtn && resetBtn && timeDisplay && circle) {
  // Initial setup values
  // Default values (may be overridden by saved settings)
  let duration = 25 * 60; // total Pomodoro session duration (25 minutes)
  let timeLeft = duration; // countdown variable
  let timerInterval = null; // interval ID for setInterval()
  let isRunning = false; // tracks timer state (running/paused)
  let startedAt = null; // timestamp when the running timer was started (ms)
  let lastPomodoroCompletedAt = null; // timestamp of last scored pomodoro completion

  // Circle animation setup (for SVG circular progress bar)
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;

  // Pool of motivational quotes displayed after reset or finish
  const quotes = [
    "Stay focused — you're doing great.",
    "Discipline beats motivation every time.",
    "Deep work brings deep rewards.",
    "Small steps every day lead to big results.",
    "The future depends on what you do now."
  ];

  // Function to update both the visible timer text and the progress circle
  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    timeDisplay.textContent = `${minutes}:${seconds}`;

    // Calculate circle stroke offset (progress animation)
    const offset = circumference - (timeLeft / duration) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  // Persist and restore Pomodoro settings to localStorage
  function savePomodoroSettings() {
    const payload = {
      duration,
      timeLeft,
      isRunning,
      startedAt,
      lastCompletedAt: lastPomodoroCompletedAt,
    };
    try {
      localStorage.setItem("pomodoroSettings", JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to save pomodoro settings:", err);
    }
  }

  function loadPomodoroSettings() {
    try {
      const raw = localStorage.getItem("pomodoroSettings");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.duration && typeof s.duration === "number") {
        duration = s.duration;
      }
      // If timeLeft was saved, prefer it; otherwise use duration
      timeLeft = typeof s.timeLeft === "number" ? s.timeLeft : duration;
      isRunning = !!s.isRunning;
      startedAt = s.startedAt || null;
  lastPomodoroCompletedAt = s.lastCompletedAt || null;
      // If timer was running, compute elapsed time since startedAt
      if (isRunning && startedAt) {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        timeLeft = Math.max(0, timeLeft - elapsed);
        // if time ran out while offline or page was closed, finalize
        if (timeLeft <= 0) {
          isRunning = false;
          startedAt = null;
        }
      }
    } catch (err) {
      console.error("Failed to load pomodoro settings:", err);
    }
  }

  // Centralized completion handler to award focus points once per finished session
  function handlePomodoroCompletion() {
    // Award points only if we haven't already recorded this completion
    const justNow = Date.now();
    if (!lastPomodoroCompletedAt || (justNow - lastPomodoroCompletedAt) > 1000) {
      incrementFocusScore(POMODORO_POINTS);
      lastPomodoroCompletedAt = justNow;
      savePomodoroSettings();
    }

    timeDisplay.textContent = "DONE!";
    const task = taskInput?.value || "your task";
    quoteEl.textContent = `✅ Great job finishing ${task}!`;
    circle.style.strokeDashoffset = 0;
    alert("Pomodoro session complete!");
  }

  // === Start Button ===
  startBtn.addEventListener("click", () => {
    // Prevent multiple timers from running simultaneously
    if (isRunning) return;
    isRunning = true;
    startedAt = Date.now();
    savePomodoroSettings();

    // Start countdown (1 second interval)
    timerInterval = setInterval(() => {
      // compute elapsed since startedAt to be robust across tab throttling
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      timeLeft = Math.max(0, duration - elapsed - (duration - timeLeft));
      updateTimerDisplay();

      // When timer reaches 0
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        startedAt = null;
        handlePomodoroCompletion();
        savePomodoroSettings();
      }
    }, 1000);
  });

  // === Pause Button ===
  pauseBtn.addEventListener("click", () => {
    // Recalculate remaining time using startedAt to avoid drift
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      timeLeft = Math.max(0, timeLeft - elapsed);
    }
    clearInterval(timerInterval);
    isRunning = false;
    startedAt = null;
    savePomodoroSettings();
  });

  // === Reset Button ===
  resetBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    isRunning = false;
    startedAt = null;
    timeLeft = duration; // reset time to configured duration
    savePomodoroSettings();
    updateTimerDisplay();

    // Display random motivational quote on reset
    quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  });

  // Initialize the timer display on page load
  // Load any saved pomodoro state and update UI accordingly
  loadPomodoroSettings();
  updateTimerDisplay();

  // If the saved state had the timer running, resume it
  if (isRunning) {
    // If time already elapsed to zero during inactivity, finalize
    if (timeLeft <= 0) {
      timeDisplay.textContent = "DONE!";
      isRunning = false;
      startedAt = null;
      savePomodoroSettings();
    } else {
      // set startedAt so interval calculates elapsed correctly
      if (!startedAt) startedAt = Date.now();
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        timeLeft = Math.max(0, duration - elapsed - (duration - timeLeft));
        updateTimerDisplay();

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          startedAt = null;
          handlePomodoroCompletion();
          savePomodoroSettings();
        }
      }, 1000);
    }
  }
}

// ==========================
// === TASK MANAGER LOGIC ===
// ==========================

// Get DOM elements for task management feature
const taskNameInput = document.getElementById("taskName");
const taskCategoryInput = document.getElementById("taskCategory");
const taskTimeInput = document.getElementById("taskTime");
const addTaskBtn = document.getElementById("addTask");
const taskList = document.getElementById("taskList");
const sortBySelect = document.getElementById("sortBy");

// Run only if task elements are available (ensures page compatibility)
if (addTaskBtn && taskList) {
  // Load previously saved tasks from localStorage or start empty
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  // Normalize tasks so every task has a 'scored' boolean to prevent double-scoring
  tasks = tasks.map(t => ({ ...t, scored: !!t.scored }));

  // UI/settings persistence for task manager (e.g., sort preference)
  function saveTaskSettings() {
    const payload = { sortBy: sortBySelect?.value || "default" };
    try {
      localStorage.setItem("taskSettings", JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to save task settings:", err);
    }
  }

  function loadTaskSettings() {
    try {
      const raw = localStorage.getItem("taskSettings");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (sortBySelect && s.sortBy) sortBySelect.value = s.sortBy;
    } catch (err) {
      console.error("Failed to load task settings:", err);
    }
  }

  // Save tasks array to localStorage for persistence
  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Display all tasks dynamically, optionally sorted
  function renderTasks(sortBy = "default") {
    taskList.innerHTML = "";

    // Create a copy of tasks for sorting
    let sortedTasks = [...tasks];

    // Sorting logic based on user selection
    if (sortBy === "category") {
      sortedTasks.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortBy === "time") {
      sortedTasks.sort((a, b) => a.time - b.time);
    } else if (sortBy === "completed") {
      sortedTasks.sort((a, b) => a.completed - b.completed);
    }

    // Loop through each task and create UI elements for it
    sortedTasks.forEach((task, index) => {
      // Card container for each task
      const card = document.createElement("div");
      card.className = "task-card";
      if (task.completed) card.classList.add("completed");

      // Task info (name, category, and duration)
      const info = document.createElement("div");
      info.className = "task-info";
      info.innerHTML = `
        <h3>${task.name}</h3>
        <p>${task.category} • ${task.time} mins</p>
      `;

      // Action buttons (complete / delete)
      const actions = document.createElement("div");
      actions.className = "task-actions";
      actions.innerHTML = `
        <button class="complete-btn">${task.completed ? "Undo" : "Complete"}</button>
        <button class="delete-btn">Delete</button>
      `;

        // Mark task as completed or undo it
        actions.querySelector(".complete-btn").addEventListener("click", () => {
          // toggle completion
          task.completed = !task.completed;
          // Award points only once per task (no decrease when undone)
          if (task.completed && !task.scored) {
            task.scored = true;
            incrementFocusScore(TASK_POINTS);
            saveFocusScore();
          }
          saveTasks();
          renderTasks(sortBy);
        });

      // Delete task from list
      actions.querySelector(".delete-btn").addEventListener("click", () => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks(sortBy);
      });

      // Assemble and add task card to list
      card.appendChild(info);
      card.appendChild(actions);
      taskList.appendChild(card);
    });
  }

  // === Add Task Button ===
  addTaskBtn.addEventListener("click", () => {
    const name = taskNameInput.value.trim();
    const category = taskCategoryInput.value.trim() || "General";
    const time = parseInt(taskTimeInput.value) || 25;

    // Prevent adding empty tasks
    if (!name) return alert("Please enter a task name!");

  // Push new task object to the array (scored:false prevents cheating by toggling)
  tasks.push({ name, category, time, completed: false, scored: false });
    saveTasks();
    renderTasks(sortBySelect.value);

    // Clear input fields
    taskNameInput.value = "";
    taskCategoryInput.value = "";
    taskTimeInput.value = "";
  });

  // === Sorting Dropdown ===
  if (sortBySelect) {
    sortBySelect.addEventListener("change", () => {
      renderTasks(sortBySelect.value);
      saveTaskSettings();
    });
  }

  // Initial render on page load — restore sort preference if any
  loadTaskSettings();
  renderTasks(sortBySelect?.value || "default");
}

// ==========================
// === MOTIVATION PAGE LOGIC ===
// ==========================

// Get elements for motivation page functionality
const newQuoteBtn = document.getElementById("newQuote");
const motivationText = document.getElementById("motivationText");
const aiBtn = document.getElementById("aiMotivateBtn");
const aiResponse = document.getElementById("aiResponse");

// === Random Quote Generator ===
if (newQuoteBtn && motivationText) {
  // Array of motivational quotes
  const quotes = [
    "Push yourself, because no one else is going to do it for you.",
    "Success doesn't come from what you do occasionally—it comes from what you do consistently.",
    "Your future is created by what you do today, not tomorrow.",
    "Discipline will take you places motivation can't.",
    "Start where you are. Use what you have. Do what you can.",
    "Dream big. Start small. Act now."
  ];

  // On click, choose a random quote and display it
  newQuoteBtn.addEventListener("click", () => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    motivationText.textContent = `"${randomQuote}"`;
  });
}

// === AI Motivation Feature ===
if (aiBtn && aiResponse) {
  aiBtn.addEventListener("click", async () => {
    const mood = document.getElementById("moodInput").value.trim();

    // Validate user input
    if (!mood) {
      aiResponse.textContent = "Please describe how you're feeling.";
      return;
    }

    aiResponse.textContent = "Thinking...";

    try {
      // Send user mood to local server endpoint for AI-generated response
      const res = await fetch("http://localhost:3000/aiMotivation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });

      // Parse and display AI's motivational message
      const data = await res.json();
      aiResponse.textContent = data.message || "Couldn't generate motivation.";
    } catch (err) {
      // Handle server connection errors gracefully
      console.error(err);
      aiResponse.textContent = "Coming Soon: AI-powered encouragement is still being trained.";
    }
  });
}
