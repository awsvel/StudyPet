
const todayTimeElement = document.getElementById("todayTime");
const weekTimeElement = document.getElementById("weekTime");
const todaySessionsElement = document.getElementById("todaySessions");
const weekSessionsElement = document.getElementById("weekSessions");
const classStatsElement = document.getElementById("classStats");
const emptyClassStatsElement = document.getElementById("emptyClassStats");
const refreshStatsButton = document.getElementById("refreshStats");

function getSavedStudySessions() {
    try {
        const data = JSON.parse(
            localStorage.getItem("studySessions") || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error loading study statistics:", error);
        return [];
    }
}

function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonday(date) {
    const monday = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const daysSinceMonday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);

    return monday;
}

function formatStudyDuration(seconds) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;

    return `${hours} hr ${minutes} min`;
}

function renderStudyStats() {
    const now = new Date();
    const todayKey = getLocalDateKey(now);

    const monday = getMonday(now);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const sessions = getSavedStudySessions().filter(session => {
        return (
            typeof session.duration === "number" &&
            Number.isFinite(session.duration) &&
            session.duration >= 0 &&
            typeof session.date === "string" &&
            !Number.isNaN(new Date(session.date).getTime())
        );
    });

    const todaySessions = sessions.filter(session => {
        return getLocalDateKey(new Date(session.date)) === todayKey;
    });

    const weekSessions = sessions.filter(session => {
        const date = new Date(session.date);
        return date >= monday && date < nextMonday;
    });

    const todaySeconds = todaySessions.reduce(
        (total, session) => total + session.duration,
        0
    );

    const weekSeconds = weekSessions.reduce(
        (total, session) => total + session.duration,
        0
    );

    todayTimeElement.textContent =
        formatStudyDuration(todaySeconds);

    weekTimeElement.textContent =
        formatStudyDuration(weekSeconds);

    todaySessionsElement.textContent =
        String(todaySessions.length);

    weekSessionsElement.textContent =
        String(weekSessions.length);

    const classTotals = {};

    sessions.forEach(session => {
        const name = session.className || "Uncategorized";

        classTotals[name] =
            (classTotals[name] || 0) + session.duration;
    });

    const sortedClasses = Object.entries(classTotals)
        .sort((a, b) => b[1] - a[1]);

    classStatsElement.replaceChildren();
    emptyClassStatsElement.hidden = sortedClasses.length > 0;

    sortedClasses.forEach(([name, seconds]) => {
        const item = document.createElement("li");

        const className = document.createElement("span");
        className.textContent = name;

        const time = document.createElement("strong");
        time.textContent = formatStudyDuration(seconds);

        item.append(className, time);
        classStatsElement.appendChild(item);
    });
}

refreshStatsButton.addEventListener("click", renderStudyStats);
window.addEventListener("studySessionsUpdated", renderStudyStats);
window.addEventListener("focus", renderStudyStats);

renderStudyStats();
