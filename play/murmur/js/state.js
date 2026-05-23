export function createState() {
  return {
    puzzle: null,
    currentWord: "",
    foundWords: new Set(),
    detailsExpanded: false,
    message: "Loading dictionary...",
    messageKind: "",
  };
}

export function startPuzzle(state, puzzle) {
  state.puzzle = puzzle;
  state.currentWord = "";
  state.foundWords = new Set();
  state.detailsExpanded = false;
  state.message = "Use the buttons or your keyboard.";
  state.messageKind = "";
}

export function addLetter(state, letter) {
  if (!state.puzzle || !state.puzzle.letters.includes(letter)) {
    return;
  }

  state.currentWord += letter;
}

export function deleteLetter(state) {
  state.currentWord = state.currentWord.slice(0, -1);
}

export function clearWord(state) {
  state.currentWord = "";
}

export function markFound(state, word) {
  state.foundWords.add(word);
  state.currentWord = "";
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

export function getSortedFoundWords(state) {
  return [...state.foundWords].sort((left, right) => left.length - right.length || left.localeCompare(right));
}
