
const TASKS_STORAGE_KEY = "studyTasks";
let tasks = loadTasks();

const taskForm = document.getElementById("taskForm");
const classNameInput = document.getElementById("className");
const taskNameInput = document.getElementById("taskName");
const taskNotesInput = document.getElementById("taskNotes");
const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");
const sessionTaskSelect = document.getElementById("sessionTask");

function loadTasks() {
    try {
        const data = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error loading tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Error saving tasks:", error);
        alert("Could not save tasks. Check your browser storage settings.");
        return false;
    }
}

function createTaskId() {
    return typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function populateTaskOptions() {
    const previousValue = sessionTaskSelect.value;
    sessionTaskSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a task";
    sessionTaskSelect.appendChild(placeholder);

    tasks.filter(task => !task.completed).forEach(task => {
        const option = document.createElement("option");
        option.value = task.id;
        option.textContent = `${task.className} — ${task.name}`;
        sessionTaskSelect.appendChild(option);
    });

    if (tasks.some(task => task.id === previousValue && !task.completed)) {
        sessionTaskSelect.value = previousValue;
    }

    if (typeof updateFinishButton === "function") {
        updateFinishButton();
    }
}

function renderTasks() {
    taskList.replaceChildren();
    emptyMessage.hidden = tasks.length > 0;

    tasks.forEach(task => {
        const item = document.createElement("li");
        item.className = "task-item";

        if (task.completed) item.classList.add("completed");

        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.name;

        const classLabel = document.createElement("p");
        classLabel.className = "task-meta";
        classLabel.textContent = `Class: ${task.className}`;

        item.append(title, classLabel);

        if (task.notes) {
            const notes = document.createElement("p");
            notes.className = "task-notes";
            notes.textContent = task.notes;
            item.appendChild(notes);
        }

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = task.completed
            ? "Undo"
            : "Mark Complete";

        completeButton.addEventListener("click", () => {
            if (
                typeof isTimerRunning === "function" &&
                isTimerRunning() &&
                sessionTaskSelect.value === task.id
            ) {
                alert("Pause the timer before changing this task.");
                return;
            }

            const previousValue = task.completed;
            task.completed = !task.completed;

            if (!saveTasks()) {
                task.completed = previousValue;
                return;
            }

            renderTasks();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            const isSelected = sessionTaskSelect.value === task.id;

            if (
                isSelected &&
                typeof isTimerRunning === "function" &&
                isTimerRunning()
            ) {
                alert("Pause or reset the timer before deleting this task.");
                return;
            }

            const previousTasks = tasks;
            tasks = tasks.filter(current => current.id !== task.id);

            if (!saveTasks()) {
                tasks = previousTasks;
                return;
            }

            if (isSelected && typeof resetTimer === "function") {
                resetTimer();
            }

            renderTasks();
        });

        actions.append(completeButton, deleteButton);
        item.appendChild(actions);
        taskList.appendChild(item);
    });

    populateTaskOptions();
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const className = classNameInput.value.trim();
    const name = taskNameInput.value.trim();
    const notes = taskNotesInput.value.trim();

    if (!className || !name) {
        alert("Please enter a class name and task name.");
        return;
    }

    const task = {
        id: createTaskId(),
        className,
        name,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);

    if (!saveTasks()) {
        tasks.pop();
        return;
    }

    taskForm.reset();
    renderTasks();
    sessionTaskSelect.value = task.id;

    if (typeof updateFinishButton === "function") {
        updateFinishButton();
    }
});
