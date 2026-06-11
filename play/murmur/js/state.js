export function createState() {
  return {
    puzzle: null,
    currentWord: "",
    foundWords: new Set(),
    bonusWords: new Set(),
    missedWords: [],
    foundEntries: [],
    letterStats: [],
    activeModal: null,
    reportWord: null,
    reportSubmitting: false,
    reportError: "",
    reportedWords: new Set(),
    victoryShown: false,
    answersRevealed: false,
    startTime: 0,
    elapsedMs: 0,
    message: "Loading dictionary...",
    messageKind: "",
    achievementData: null,
    achievementTracker: null,
  };
}

export function startPuzzle(state, puzzle) {
  state.puzzle = puzzle;
  state.currentWord = "";
  state.foundWords = new Set();
  state.bonusWords = new Set();
  state.missedWords = [];
  state.foundEntries = [];
  state.letterStats = [];
  state.activeModal = null;
  state.reportWord = null;
  state.reportSubmitting = false;
  state.reportError = "";
  state.reportedWords = new Set();
  state.victoryShown = false;
  state.answersRevealed = false;
  state.startTime = 0;
  state.elapsedMs = 0;
  state.message = "";
  state.messageKind = "";
  state.achievementTracker = null;
}

export function addLetter(state, letter) {
  if (!canAddLetter(state, letter)) {
    return;
  }

  state.currentWord += letter;
}

export function deleteLetter(state) {
  if (state.answersRevealed) {
    return;
  }

  state.currentWord = state.currentWord.slice(0, -1);
}

export function shuffleLetters(state) {
  if (state.answersRevealed || !state.puzzle) {
    return;
  }

  const current = state.puzzle.letters;
  const letters = [...current];
  let shuffled;

  do {
    shuffled = [...letters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
  } while (shuffled.some((letter, index) => letter === letters[index]));

  state.puzzle = { ...state.puzzle, letters: shuffled.join("") };
}

export function clearWord(state) {
  if (state.answersRevealed) {
    return;
  }

  state.currentWord = "";
}

export function markFound(state, word, bonus = false) {
  if (state.answersRevealed) {
    return;
  }

  if (bonus) {
    state.bonusWords.add(word);
  } else {
    state.foundWords.add(word);
  }

  state.foundEntries.push(word);
  state.currentWord = "";
}

export function revealAnswers(state, answers) {
  state.answersRevealed = true;
  state.currentWord = "";
  state.missedWords = [...new Set(answers)]
    .filter((word) => !state.foundWords.has(word))
    .sort((left, right) => left.localeCompare(right));
  state.activeModal = "answers";
  state.message = "Answers revealed";
  state.messageKind = "note";
}

export function openWordDetail(state, word) {
  if (state.reportSubmitting) {
    return false;
  }

  state.reportWord = word;
  state.reportError = "";
  state.activeModal = "word-detail";
  return true;
}

export function clearReport(state) {
  state.reportWord = null;
  state.reportError = "";
}

export function setReportedWords(state, words) {
  state.reportedWords = new Set(words);
}

export function markReported(state, word) {
  state.reportedWords.add(word);
}

function getWordWeight(state, length) {
  const offset = state.puzzle?.wordWeightOffset ?? 0;
  return Math.max(1, length + offset);
}

export function getFoundWeight(state) {
  let weight = 0;

  for (const word of state.foundWords) {
    weight += getWordWeight(state, word.length);
  }

  return weight;
}

export function getProgress(state) {
  const total = state.puzzle?.totalWeight ?? 0;
  const found = getFoundWeight(state);
  const percent = total === 0 ? 0 : Math.floor((found / total) * 100);

  return { found, total, percent };
}

export function getFoundCountByLength(state) {
  const counts = new Map();

  for (const word of state.foundWords) {
    const length = word.length;
    counts.set(length, (counts.get(length) ?? 0) + 1);
  }

  return counts;
}

export function getRemainingByStart(state) {
  const foundByStart = getFoundByStart(state);

  return new Map(
    (state.puzzle?.byStart ?? []).map((entry) => [
      entry.letter,
      Math.max(0, entry.total - (foundByStart.get(entry.letter) ?? 0)),
    ]),
  );
}

export function getRecentFoundWords(state, limit = 24) {
  return state.foundEntries.slice(-limit).reverse();
}

export function getSortedFoundWords(state) {
  return [...state.foundWords].sort((left, right) => left.localeCompare(right));
}

export function getSortedMissedWords(state) {
  return [...state.missedWords];
}

export function getSortedBonusWords(state) {
  return [...state.bonusWords].sort((left, right) => left.localeCompare(right));
}

export function hasFoundWord(state, word) {
  return state.foundWords.has(word) || state.bonusWords.has(word);
}

export function isLetterDone(state, letter) {
  return state.letterStats.some((entry) => entry.letter === letter && entry.done);
}

export function isFirstLetterUnavailable(state, letter) {
  if (state.currentWord) {
    return false;
  }

  return getRemainingByStart(state).get(letter) === 0;
}

export function canAddLetter(state, letter) {
  return (
    !state.answersRevealed &&
    Boolean(state.puzzle) &&
    state.puzzle.letters.includes(letter) &&
    !isLetterDone(state, letter) &&
    !isFirstLetterUnavailable(state, letter)
  );
}

function getFoundByStart(state) {
  const counts = new Map();

  for (const word of state.foundWords) {
    const firstLetter = word[0];
    counts.set(firstLetter, (counts.get(firstLetter) ?? 0) + 1);
  }

  return counts;
}
