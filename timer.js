
const SESSIONS_STORAGE_KEY = "studySessions";

let elapsedSeconds = 0;
let startTime = null;
let timerInterval = null;
let running = false;
let sessions = loadSessions();

const timerDisplay = document.getElementById("timer");
const startPauseButton = document.getElementById("startPause");
const resetButton = document.getElementById("reset");
const finishSessionButton = document.getElementById("finishSession");
const timerTaskSelect = document.getElementById("sessionTask");
const sessionMessage = document.getElementById("sessionMessage");
const sessionHistory = document.getElementById("sessionHistory");
const emptyHistory = document.getElementById("emptyHistory");

function loadSessions() {
    try {
        const data = JSON.parse(
            localStorage.getItem(SESSIONS_STORAGE_KEY) || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error loading study sessions:", error);
        return [];
    }
}

function saveSessions() {
    try {
        localStorage.setItem(
            SESSIONS_STORAGE_KEY,
            JSON.stringify(sessions)
        );
        return true;
    } catch (error) {
        console.error("Error saving study sessions:", error);
        alert("Could not save the study session. Check browser storage.");
        return false;
    }
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(elapsedSeconds);
}

function isTimerRunning() {
    return running;
}

function updateFinishButton() {
    finishSessionButton.disabled =
        elapsedSeconds <= 0 || !timerTaskSelect.value;
}

function updateTimer() {
    if (running && startTime !== null) {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        updateTimerDisplay();
        updateFinishButton();
    }
}

function startTimer() {
    if (running) {
        pauseTimer();
        return;
    }

    const selectedTask = tasks.find(
        task => task.id === timerTaskSelect.value && !task.completed
    );

    if (!selectedTask) {
        sessionMessage.textContent =
            "Please add and select an active task before starting.";
        return;
    }

    running = true;
    startTime = Date.now() - elapsedSeconds * 1000;

    startPauseButton.textContent = "Pause";
    timerTaskSelect.disabled = true;
    sessionMessage.textContent = "Study session in progress.";

    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    updateFinishButton();
}

function pauseTimer() {
    if (!running) return;

    updateTimer();

    running = false;
    startTime = null;

    clearInterval(timerInterval);
    timerInterval = null;

    startPauseButton.textContent = "Resume";
    timerTaskSelect.disabled = false;
    sessionMessage.textContent = "Session paused.";

    updateFinishButton();
}

function resetTimer() {
    clearInterval(timerInterval);

    timerInterval = null;
    elapsedSeconds = 0;
    startTime = null;
    running = false;

    startPauseButton.textContent = "Start";
    timerTaskSelect.disabled = false;

    updateTimerDisplay();
    updateFinishButton();
    sessionMessage.textContent = "";
}

function finishSession() {
    if (running) {
        updateTimer();
    }

    if (elapsedSeconds <= 0) {
        sessionMessage.textContent =
            "Study for at least one second before finishing.";
        return;
    }

    const selectedTask = tasks.find(
        task => task.id === timerTaskSelect.value
    );

    if (!selectedTask) {
        sessionMessage.textContent = "Please select a valid task.";
        return;
    }

    const session = {
        id: typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        taskId: selectedTask.id,
        className: selectedTask.className,
        taskName: selectedTask.name,
        duration: elapsedSeconds,
        date: new Date().toISOString()
    };

    sessions.push(session);

    if (!saveSessions()) {
        sessions.pop();
        return;
    }

    clearInterval(timerInterval);
    timerInterval = null;
    elapsedSeconds = 0;
    startTime = null;
    running = false;

    startPauseButton.textContent = "Start";
    timerTaskSelect.disabled = false;

    updateTimerDisplay();
    renderSessionHistory();
    updateFinishButton();

    sessionMessage.textContent =
        `Session saved! You studied ${formatTime(session.duration)}.`;

    window.dispatchEvent(new Event("studySessionsUpdated"));
}

function renderSessionHistory() {
    sessionHistory.replaceChildren();
    emptyHistory.hidden = sessions.length > 0;

    [...sessions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(session => {
            const item = document.createElement("li");
            item.className = "history-item";

            const title = document.createElement("strong");
            title.textContent = session.taskName || "Untitled task";

            const className = document.createElement("div");
            className.className = "history-meta";
            className.textContent = `Class: ${session.className || "Unknown"}`;

            const duration = document.createElement("div");
            duration.textContent =
                `Study time: ${formatTime(session.duration)}`;

            const date = document.createElement("div");
            date.className = "history-meta";

            const parsedDate = new Date(session.date);
            date.textContent = Number.isNaN(parsedDate.getTime())
                ? "Date unavailable"
                : parsedDate.toLocaleString();

            item.append(title, className, duration, date);
            sessionHistory.appendChild(item);
        });
}

function initializeTimer() {
    startPauseButton.addEventListener("click", startTimer);

    resetButton.addEventListener("click", () => {
        resetTimer();
        sessionMessage.textContent = "Timer reset.";
    });

    finishSessionButton.addEventListener("click", finishSession);
    timerTaskSelect.addEventListener("change", updateFinishButton);

    updateTimerDisplay();
    updateFinishButton();
    renderSessionHistory();
}

initializeTimer();
console.log("Timer JavaScript loaded successfully!");