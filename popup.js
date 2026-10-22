(() => {
  // Pet elements can live in the Picture-in-Picture document while popped out.
  const $ = (id) =>
    document.getElementById(id) ||
    (window.documentPictureInPicture &&
      window.documentPictureInPicture.window &&
      window.documentPictureInPicture.window.document.getElementById(id));

  function moodFor(hunger, happiness) {
    if (happiness <= 33) return "Unhappy";
    if (hunger <= 33) return "Starving";
    if (hunger <= 66 || happiness <= 66) return "Hungry";
    return "Happy";
  }

  async function renderPet() {
    const s = await StudyPet.getState();
    $("coins").textContent = Math.floor(s.coins);
    $("food").textContent = s.food;
    $("streak").textContent = s.currentStreak || 0;
    const info = getLevelInfo(s.exp);
    $("level").textContent = info.level;
    $("exp-bar").max = info.expForNext;
    $("exp-bar").value = info.expIntoLevel;
    $("exp-text").textContent = `${info.expIntoLevel} / ${info.expForNext}`;
    $("hunger-bar").value = s.hunger;
    const happiness = StudyPet.calculateHappiness(tasks);
    $("happiness-bar").value = happiness;
    $("pet-mood").textContent = moodFor(s.hunger, happiness);
    $("food-cost").textContent = FOOD_COST;
  }

  async function act(action) {
    const result = await action();
    $("message").textContent = result.ok ? "" : result.reason;
    renderPet();
  }

  async function reward(run, label) {
    const before = getLevelInfo((await StudyPet.getState()).exp).level;
    const r = await run();
    const after = getLevelInfo((await StudyPet.getState()).exp).level;
    $("message").textContent = `${label}: +${r.coins} coins, +${r.exp} exp` +
      (r.earlyBonusExp ? ` (includes +${r.earlyBonusExp} early EXP bonus)` : "") +
      (after > before ? ` — Level up! Now level ${after} 🎉` : "");
  }

  $("buy-food").addEventListener("click", () => act(() => StudyPet.buyFood()));
  $("feed").addEventListener("click", () => act(() => StudyPet.feed()));

  // Olly's timer/tasks dispatch these events with the saved session/task.
  window.addEventListener("studySessionsUpdated", (e) => {
    if (e.detail && e.detail.session) {
      reward(() => StudyPet.rewardSession(e.detail.session), "Session reward");
    }
  });
  window.addEventListener("taskCompleted", (e) => {
    reward(() => StudyPet.rewardTask(e.detail.task), "Assignment turned in");
  });
  window.addEventListener("tasksUpdated", renderPet);

  chrome.storage.onChanged.addListener(renderPet);
  renderPet();
})();
