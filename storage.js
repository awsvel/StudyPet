// Shared state helpers. Other features (timer, logging) should call
// StudyPet.addCoins / addExp instead of touching storage directly.
const FOOD_COST = 10;
const FOOD_HUNGER_RESTORE = 25;
const HUNGER_DECAY_PER_HOUR = 5;
const MAX_HUNGER = 100;
const SESSION_BLOCK_MINUTES = 5;
const COINS_PER_BLOCK = 5;
const EXP_PER_BLOCK = 10;
const TASK_COIN_BONUS = 50;
const TASK_EXP_BONUS = 100;
const EARLY_BONUSES = [
  { days: 7, coins: 50, exp: 100 },
  { days: 3, coins: 25, exp: 50 },
  { days: 1, coins: 10, exp: 20 },
];
const OVERDUE_HAPPINESS_LOSS_PER_DAY = 10;
const LEVEL_BASE_EXP = 100;
const LEVEL_EXP_STEP = 20;

// Level 1 costs 100 exp, level 2 costs 120 more, level 3 costs 140 more, ...
function getLevelInfo(totalExp) {
  let level = 0;
  let remaining = Math.floor(totalExp);
  let cost = LEVEL_BASE_EXP;
  while (remaining >= cost) {
    remaining -= cost;
    level += 1;
    cost += LEVEL_EXP_STEP;
  }
  return { level, expIntoLevel: remaining, expForNext: cost };
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysBetweenDateKeys(from, to) {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const fromTime = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toTime = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toTime - fromTime) / 86400000);
}

const DEFAULT_STATE = {
  coins: 0,
  food: 0,
  exp: 0,
  hunger: MAX_HUNGER,
  lastHungerUpdate: Date.now(),
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
};

const StudyPet = {
  async getState() {
    const saved = await chrome.storage.local.get(null);
    const state = { ...DEFAULT_STATE, lastHungerUpdate: Date.now(), ...saved };
    const hours = (Date.now() - state.lastHungerUpdate) / 3600000;
    state.hunger = Math.max(0, state.hunger - hours * HUNGER_DECAY_PER_HOUR);
    state.lastHungerUpdate = Date.now();
    if (state.lastStudyDate) {
      const today = new Date(`${getLocalDateKey(new Date())}T00:00:00`);
      const lastStudyDay = new Date(`${state.lastStudyDate}T00:00:00`);
      const daysSinceStudy = Math.floor((today - lastStudyDay) / 86400000);
      if (daysSinceStudy > 1) state.currentStreak = 0;
    }
    return state;
  },

  async update(fn) {
    const state = await this.getState();
    const result = fn(state);
    await chrome.storage.local.set(state);
    return result === undefined ? state : result;
  },

  calculateHappiness(taskList) {
    const today = getLocalDateKey(new Date());
    const overdueDays = taskList.reduce((total, task) => {
      if (task.completed || !task.dueDate || task.dueDate >= today) return total;
      return total + getDaysBetweenDateKeys(task.dueDate, today);
    }, 0);
    return Math.max(0, 100 - overdueDays * OVERDUE_HAPPINESS_LOSS_PER_DAY);
  },

  addCoins(n) {
    return this.update((s) => { s.coins += n; });
  },

  addExp(n) {
    return this.update((s) => { s.exp += n; });
  },

  rewardSession(session) {
    const blocks = Math.floor(session.duration / 60 / SESSION_BLOCK_MINUTES);
    return this.update((s) => {
      const sessionDate = new Date(session.date);
      if (!Number.isNaN(sessionDate.getTime())) {
        const studyDate = getLocalDateKey(sessionDate);
        if (!s.lastStudyDate || studyDate > s.lastStudyDate) {
          const previousDate = s.lastStudyDate
            ? new Date(`${s.lastStudyDate}T00:00:00`)
            : null;
          const daysSinceLastStudy = previousDate
            ? Math.round((new Date(`${studyDate}T00:00:00`) - previousDate) / 86400000)
            : null;

          s.currentStreak = daysSinceLastStudy === 1
            ? s.currentStreak + 1
            : 1;
          s.lastStudyDate = studyDate;
          s.longestStreak = Math.max(s.longestStreak || 0, s.currentStreak);
        }
      }
      s.coins += blocks * COINS_PER_BLOCK;
      s.exp += blocks * EXP_PER_BLOCK;
      return {
        coins: blocks * COINS_PER_BLOCK,
        exp: blocks * EXP_PER_BLOCK,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
      };
    });
  },

  // Each task pays out once, so toggling complete/undo can't be farmed.
  rewardTask(task) {
    return this.update((s) => {
      s.rewardedTasks = s.rewardedTasks || [];
      if (s.rewardedTasks.includes(task.id)) return { coins: 0, exp: 0 };
      s.rewardedTasks.push(task.id);
      const daysEarly = task.dueDate
        ? getDaysBetweenDateKeys(getLocalDateKey(new Date()), task.dueDate)
        : 0;
      const earlyBonus = EARLY_BONUSES.find((bonus) => daysEarly >= bonus.days)
        || { coins: 0, exp: 0 };
      const coins = TASK_COIN_BONUS + earlyBonus.coins;
      const exp = TASK_EXP_BONUS + earlyBonus.exp;
      s.coins += coins;
      s.exp += exp;
      return {
        coins,
        exp,
        earlyBonusCoins: earlyBonus.coins,
        earlyBonusExp: earlyBonus.exp,
        daysEarly: Math.max(0, daysEarly),
      };
    });
  },

  buyFood() {
    return this.update((s) => {
      if (s.coins < FOOD_COST) return { ok: false, reason: "Not enough coins!" };
      s.coins -= FOOD_COST;
      s.food += 1;
      return { ok: true };
    });
  },

  feed() {
    return this.update((s) => {
      if (s.food < 1) return { ok: false, reason: "No food! Buy some first." };
      s.food -= 1;
      s.hunger = Math.min(MAX_HUNGER, s.hunger + FOOD_HUNGER_RESTORE);
      return { ok: true };
    });
  },
};
