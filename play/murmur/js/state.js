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
    victoryShown: false,
    answersRevealed: false,
    message: "Loading dictionary...",
    messageKind: "",
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
  state.victoryShown = false;
  state.answersRevealed = false;
  state.message = "";
  state.messageKind = "";
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

  const letters = [...state.puzzle.letters];
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
  }

  state.puzzle = { ...state.puzzle, letters: letters.join("") };
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

export function getProgress(state) {
  const total = state.puzzle?.total ?? 0;
  const found = state.foundWords.size;
  const percent = total === 0 ? 0 : Math.floor((found / total) * 100);

  return { found, total, percent };
}

export function getFoundByLength(state) {
  const counts = new Map();

  for (const word of state.foundWords) {
    counts.set(word.length, (counts.get(word.length) ?? 0) + 1);
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
  if (state.currentWord || getProgress(state).percent < 50) {
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
