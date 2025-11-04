// ==========================
// === POMODORO TIMER LOGIC ===
// ==========================

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
  let duration = 25 * 60; // total Pomodoro session duration (25 minutes)
  let timeLeft = duration; // countdown variable
  let timerInterval = null; // interval ID for setInterval()
  let isRunning = false; // tracks timer state (running/paused)

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

  // === Start Button ===
  startBtn.addEventListener("click", () => {
    // Prevent multiple timers from running simultaneously
    if (isRunning) return;
    isRunning = true;

    // Start countdown (1 second interval)
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();

      // When timer reaches 0
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        timeDisplay.textContent = "DONE!";

        // Personalized message depending on user's entered task
        const task = taskInput?.value || "your task";
        quoteEl.textContent = `✅ Great job finishing ${task}!`;
        circle.style.strokeDashoffset = 0;
        alert("Pomodoro session complete!");
      }
    }, 1000);
  });

  // === Pause Button ===
  pauseBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    isRunning = false;
  });

  // === Reset Button ===
  resetBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = duration; // reset time to 25 minutes
    updateTimerDisplay();

    // Display random motivational quote on reset
    quoteEl.textContent =
      quotes[Math.floor(Math.random() * quotes.length)];
  });

  // Initialize the timer display on page load
  updateTimerDisplay();
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
        task.completed = !task.completed;
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

    // Push new task object to the array
    tasks.push({ name, category, time, completed: false });
    saveTasks();
    renderTasks(sortBySelect.value);

    // Clear input fields
    taskNameInput.value = "";
    taskCategoryInput.value = "";
    taskTimeInput.value = "";
  });

  // === Sorting Dropdown ===
  sortBySelect.addEventListener("change", () => renderTasks(sortBySelect.value));

  // Initial render on page load
  renderTasks();
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
      aiResponse.textContent = "Couldn't connect to AI.";
    }
  });
}
