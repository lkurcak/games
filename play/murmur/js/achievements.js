import { getRemainingByStart } from "./state.js";

const STORAGE_KEY = "murmur:achievements";
const DATA_VERSION = 1;

const WORD_ACHIEVEMENT_IDS = [
  "golden-word",
  "first-word-golden",
  "find-words",
  "find-bonus",
];
const PROGRESS_ACHIEVEMENT_IDS = ["reach-50", "reach-75"];
const VICTORY_ACHIEVEMENT_IDS = [
  "complete",
  "speed-3min",
  "speed-1min",
];

export const ACHIEVEMENTS = [
  {
    id: "reach-50",
    name: "Halfway There",
    description: "Reach 50% progress in a puzzle",
    hint: "Find enough words to feel like you're making real progress...",
    type: "tiered",
    tiers: [1, 5, 20, 50, 100, 200],
    statKey: "puzzlesReached50",
  },
  {
    id: "reach-75",
    name: "Strong Finish",
    description: "Reach 75% progress in a puzzle",
    hint: "Most of the way to completion, but not quite all the way...",
    type: "tiered",
    tiers: [1, 5, 20, 50, 100, 200],
    statKey: "puzzlesReached75",
  },
  {
    id: "complete",
    name: "Perfectionist",
    description: "Complete a puzzle (100%)",
    hint: "Leave no word unfound...",
    type: "tiered",
    tiers: [1, 5, 20, 50, 100, 200],
    statKey: "puzzlesCompleted",
  },
  {
    id: "golden-word",
    name: "Golden Touch",
    description: "Find a golden word",
    hint: "Some words shine brighter than others...",
    type: "tiered",
    tiers: [1, 5, 20, 50, 100, 200],
    statKey: "totalGoldenWords",
  },
  {
    id: "first-word-golden",
    name: "Opening Gambit",
    description: "Find a golden word as your very first word in a puzzle",
    hint: "Start strong, start shiny...",
    type: "tiered",
    tiers: [1, 5, 10, 25, 50, 100],
    statKey: "firstWordGoldenCount",
  },
  {
    id: "find-words",
    name: "Word Hunter",
    description: "Find words across all puzzles",
    hint: "The more you find, the more you'll discover...",
    type: "tiered",
    tiers: [10, 50, 200, 500, 1000, 2000],
    statKey: "totalWordsFound",
  },
  {
    id: "find-bonus",
    name: "Bonus Hunter",
    description: "Find bonus words",
    hint: "Some words are extra special...",
    type: "tiered",
    tiers: [1, 5, 20, 50, 100, 200],
    statKey: "totalBonusWords",
  },
  {
    id: "in-order",
    name: "In Order",
    description: "Complete all words for consecutive starting letters in alphabetical order",
    hint: "There's a method to the madness...",
    type: "tiered",
    tiers: [1, 2, 3, 4, 5, 6],
    statKey: "bestAlphaStreak",
  },
  {
    id: "speed-3min",
    name: "Speedster",
    description: "Complete a puzzle in under 3 minutes",
    hint: "Fast fingers, sharp mind...",
    type: "oneoff",
    statKey: "fast3MinCompletions",
  },
  {
    id: "speed-1min",
    name: "Lightning",
    description: "Complete a puzzle in under 1 minute",
    hint: "Blink and you'll miss it...",
    type: "oneoff",
    statKey: "fast1MinCompletions",
  },
];

function createDefaultData() {
  return {
    version: DATA_VERSION,
    stats: {
      puzzlesCompleted: 0,
      puzzlesReached50: 0,
      puzzlesReached75: 0,
      totalWordsFound: 0,
      totalGoldenWords: 0,
      totalBonusWords: 0,
      firstWordGoldenCount: 0,
      fast3MinCompletions: 0,
      fast1MinCompletions: 0,
      bestAlphaStreak: 0,
    },
    unlocked: {},
  };
}

export function loadAchievementData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const data = JSON.parse(raw);
    if (data?.version !== DATA_VERSION) return createDefaultData();
    return data;
  } catch {
    return createDefaultData();
  }
}

export function saveAchievementData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

export function createPuzzleTracker() {
  return {
    reached50: false,
    reached75: false,
    reached100: false,
    firstWordFound: false,
    usedReveal: false,
    alphaBroken: false,
  };
}

function getTierForCount(achievement, count) {
  if (achievement.type !== "tiered") return -1;
  let tier = -1;
  for (let i = 0; i < achievement.tiers.length; i++) {
    if (count >= achievement.tiers[i]) {
      tier = i;
    } else {
      break;
    }
  }
  return tier;
}

function checkAchievementUnlocks(data, filterIds = null) {
  const unlocks = [];
  for (const ach of ACHIEVEMENTS) {
    if (filterIds && !filterIds.includes(ach.id)) continue;
    const currentTier = data.unlocked[ach.id] ?? -1;
    const count = data.stats[ach.statKey];
    if (ach.type === "tiered") {
      const newTier = getTierForCount(ach, count);
      if (newTier > currentTier) {
        data.unlocked[ach.id] = newTier;
        unlocks.push({ achievement: ach, tier: newTier });
      }
    } else if (ach.type === "oneoff") {
      if (count > 0 && currentTier < 0) {
        data.unlocked[ach.id] = 0;
        unlocks.push({ achievement: ach, tier: 0 });
      }
    }
  }
  return unlocks;
}

export function evaluateWordFound(data, tracker, word, bonus, isFirstWord, isGolden) {
  if (!data || !tracker) return [];

  data.stats.totalWordsFound += 1;
  if (bonus) {
    data.stats.totalBonusWords += 1;
  }
  if (isGolden) {
    data.stats.totalGoldenWords += 1;
  }
  if (isFirstWord && isGolden) {
    data.stats.firstWordGoldenCount += 1;
  }
  tracker.firstWordFound = true;

  return checkAchievementUnlocks(data, WORD_ACHIEVEMENT_IDS);
}

export function evaluateProgress(data, tracker, percent) {
  if (!data || !tracker) return [];

  if (percent >= 50 && !tracker.reached50) {
    tracker.reached50 = true;
    data.stats.puzzlesReached50 += 1;
  }
  if (percent >= 75 && !tracker.reached75) {
    tracker.reached75 = true;
    data.stats.puzzlesReached75 += 1;
  }

  return checkAchievementUnlocks(data, PROGRESS_ACHIEVEMENT_IDS);
}

export function evaluateVictory(data, tracker, elapsedMs) {
  if (!data || !tracker) return [];

  if (!tracker.reached100) {
    tracker.reached100 = true;
    data.stats.puzzlesCompleted += 1;
  }
  if (elapsedMs < 3 * 60 * 1000) {
    data.stats.fast3MinCompletions += 1;
  }
  if (elapsedMs < 1 * 60 * 1000) {
    data.stats.fast1MinCompletions += 1;
  }

  return checkAchievementUnlocks(data, VICTORY_ACHIEVEMENT_IDS);
}

export function evaluateInOrder(data, tracker, state) {
  if (!data || !tracker || tracker.alphaBroken || !state.puzzle) return [];

  const sortedLetters = [...new Set(state.puzzle.letters)].sort();
  const remaining = getRemainingByStart(state);

  const completedLetters = new Set(
    sortedLetters.filter((letter) => (remaining.get(letter) ?? 0) === 0),
  );

  let firstIncompleteIndex = -1;
  for (let i = 0; i < sortedLetters.length; i++) {
    if (!completedLetters.has(sortedLetters[i])) {
      firstIncompleteIndex = i;
      break;
    }
  }

  if (firstIncompleteIndex === -1) {
    const streak = sortedLetters.length;
    if (streak > data.stats.bestAlphaStreak) {
      data.stats.bestAlphaStreak = streak;
    }
    return checkAchievementUnlocks(data, ["in-order"]);
  }

  for (let i = firstIncompleteIndex + 1; i < sortedLetters.length; i++) {
    if (completedLetters.has(sortedLetters[i])) {
      tracker.alphaBroken = true;
      return [];
    }
  }

  const streak = firstIncompleteIndex;
  if (streak > data.stats.bestAlphaStreak) {
    data.stats.bestAlphaStreak = streak;
  }

  return checkAchievementUnlocks(data, ["in-order"]);
}

export function getAchievementStatus(data, achievement) {
  const currentTier = data?.unlocked[achievement.id] ?? -1;
  const count = data?.stats[achievement.statKey] ?? 0;

  if (achievement.type === "oneoff") {
    return {
      locked: currentTier < 0,
      currentTier,
      maxTier: 0,
      currentCount: count,
    };
  }

  const nextTierIndex = achievement.tiers.findIndex(
    (tier, i) => i > currentTier && count < tier,
  );

  return {
    locked: currentTier < 0,
    currentTier,
    maxTier: achievement.tiers.length - 1,
    currentCount: count,
    nextTierIndex: nextTierIndex >= 0 ? nextTierIndex : null,
    nextTierCount: nextTierIndex >= 0 ? achievement.tiers[nextTierIndex] : null,
  };
}

export function getAchievementList(data) {
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    ...getAchievementStatus(data, achievement),
  }));
}

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.id = "achievement-toasts";
  toastContainer.className = "achievement-toasts";
  document.body.append(toastContainer);
  return toastContainer;
}

export function showAchievementToast(achievement, tier) {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = "achievement-toast";

  const totalStars = achievement.type === "tiered" ? achievement.tiers.length : 6;
  const tierCount = achievement.type === "tiered" ? tier + 1 : 1;
  const stars = "★".repeat(tierCount) + "☆".repeat(Math.max(0, totalStars - tierCount));

  let subtext;
  if (achievement.type === "tiered") {
    const threshold = achievement.tiers[tier];
    if (achievement.id === "first-word-golden") {
      subtext = `${threshold} puzzles`;
    } else if (achievement.id.startsWith("reach") || achievement.id === "complete") {
      subtext = `${threshold} puzzles`;
    } else if (achievement.id === "in-order") {
      subtext = `${threshold} letters`;
    } else {
      subtext = `${threshold} words`;
    }
  } else {
    subtext = "Unlocked";
  }

  el.innerHTML = `
    <div class="toast-stars">${stars}</div>
    <div class="toast-body">
      <strong>${achievement.name}</strong>
      <span>${subtext}</span>
    </div>
  `;

  container.append(el);

  setTimeout(() => {
    el.classList.add("exiting");
    setTimeout(() => el.remove(), 300);
  }, 4000);
}
