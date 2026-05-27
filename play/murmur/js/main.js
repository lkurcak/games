import {
  addLetter,
  clearWord,
  createState,
  deleteLetter,
  getProgress,
  giveUp,
  hasFoundWord,
  isLetterDone,
  markFound,
  shuffleLetters,
  startPuzzle,
} from "./state.js";
import { render } from "./renderer.js";
import { describeCheckFailure, formatWord } from "./utils.js";

const state = createState();
let wasm = null;
const deleteButton = document.querySelector("#delete-letter");
const deleteHoldDelay = 450;
let deleteHoldTimer = null;
let suppressDeleteClick = false;

const actions = {
  addLetter(letter) {
    addLetter(state, letter);
    state.message = "";
    state.messageKind = "";
    render(state, actions);
  },
  deleteLetter() {
    deleteLetter(state);
    render(state, actions);
  },
  shuffleLetters() {
    shuffleLetters(state);
    render(state, actions);
  },
  submitWord() {
    submitCurrentWord();
  },
  openProgress() {
    state.activeModal = "progress";
    render(state, actions);
  },
  openFound() {
    state.activeModal = "found";
    render(state, actions);
  },
  openInfo() {
    state.activeModal = "info";
    render(state, actions);
  },
  giveUp() {
    giveUpGame();
  },
  closeModal() {
    state.activeModal = null;
    render(state, actions);
  },
};

document.querySelector("#submit-word").addEventListener("click", actions.submitWord);
deleteButton.addEventListener("click", (event) => {
  if (suppressDeleteClick) {
    event.preventDefault();
    suppressDeleteClick = false;
    return;
  }

  actions.deleteLetter();
});
deleteButton.addEventListener("pointerdown", startDeleteHold);
deleteButton.addEventListener("pointerup", cancelDeleteHold);
deleteButton.addEventListener("pointercancel", cancelDeleteHold);
deleteButton.addEventListener("pointerleave", cancelDeleteHold);
document.querySelector("#shuffle-letters").addEventListener("click", actions.shuffleLetters);
document.querySelector("#progress-toggle").addEventListener("click", actions.openProgress);
document.querySelector("#forfeit-game").addEventListener("click", actions.giveUp);
document.querySelector("#info-toggle").addEventListener("click", actions.openInfo);
document.querySelector("#found-toggle").addEventListener("click", actions.openFound);
document.querySelector("#info-prev").addEventListener("click", () => scrollInfoSlide(-1));
document.querySelector("#info-next").addEventListener("click", () => scrollInfoSlide(1));
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", actions.closeModal);
});
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    actions.closeModal();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      actions.closeModal();
    }
  });
});
document.addEventListener("keydown", handleKeydown);

// Prevent long-press context menu and accidental text selection on the game
// surface so rapid tapping never triggers browser-level UI.
const gamePanel = document.querySelector(".game-panel");
gamePanel.addEventListener("contextmenu", (event) => event.preventDefault());
gamePanel.addEventListener("selectstart", (event) => event.preventDefault());

render(state, actions);

try {
  wasm = await import("../pkg/game_wasm.js");
  await wasm.default();
  startPuzzle(state, wasm.generate_puzzle());
  refreshLetterStats();
} catch (error) {
  console.error(error);
  state.message = "Could not load the WASM dictionary. Build web/pkg first.";
  state.messageKind = "bad";
}

render(state, actions);

function handleKeydown(event) {
  if (!state.puzzle || state.gaveUp || state.activeModal) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "enter" || key === " ") {
    event.preventDefault();
    submitCurrentWord();
    return;
  }

  if (key === "backspace" || key === "delete") {
    event.preventDefault();
    actions.deleteLetter();
    return;
  }

  if (key === "escape") {
    clearWord(state);
    render(state, actions);
    return;
  }

  if (/^[a-z]$/.test(key) && state.puzzle.letters.includes(key) && !isLetterDone(state, key)) {
    actions.addLetter(key);
  }
}

function startDeleteHold() {
  if (!state.puzzle || state.gaveUp || state.activeModal) {
    return;
  }

  cancelDeleteHold();
  suppressDeleteClick = false;
  deleteHoldTimer = window.setTimeout(() => {
    deleteHoldTimer = null;
    suppressDeleteClick = true;
    clearWord(state);
    render(state, actions);
  }, deleteHoldDelay);
}

function cancelDeleteHold() {
  if (!deleteHoldTimer) {
    return;
  }

  window.clearTimeout(deleteHoldTimer);
  deleteHoldTimer = null;
}

function submitCurrentWord() {
  if (!state.puzzle || state.gaveUp || !wasm) {
    return;
  }

  const word = state.currentWord.toLowerCase();
  if (!word) {
    state.message = "Type first";
    state.messageKind = "note";
    render(state, actions);
    return;
  }

  if (hasFoundWord(state, word)) {
    state.message = "Already found";
    state.messageKind = "note";
    render(state, actions);
    return;
  }

  const result = wasm.check_word(state.puzzle.letters, word);
  if (result.valid) {
    markFound(state, result.word, result.bonus);
    refreshLetterStats();
    state.message = result.bonus
      ? `Bonus ${formatWord(result.word)}`
      : `Found ${formatWord(result.word)}`;
    state.messageKind = "note";
    showVictoryIfComplete();
  } else {
    state.message = describeCheckFailure(result.reason);
    state.messageKind = "note";
  }

  render(state, actions);
}

function giveUpGame() {
  const progress = getProgress(state);
  if (
    !state.puzzle ||
    state.gaveUp ||
    !wasm ||
    progress.percent < 50 ||
    progress.found >= progress.total
  ) {
    return;
  }

  const answers = wasm.get_answers(state.puzzle.letters);
  giveUp(state, Array.isArray(answers) ? answers : []);
  render(state, actions);
}

function refreshLetterStats() {
  if (!wasm || !state.puzzle) {
    state.letterStats = [];
    return;
  }

  state.letterStats = wasm.get_letter_stats(state.puzzle.letters, [...state.foundWords]);
}

function showVictoryIfComplete() {
  if (state.victoryShown || !state.puzzle || state.foundWords.size !== state.puzzle.total) {
    return;
  }

  state.victoryShown = true;
  state.activeModal = "victory";
}

function scrollInfoSlide(direction) {
  const slides = document.querySelector("#info-dialog .info-slides");
  slides.scrollBy({ left: direction * slides.clientWidth, behavior: "smooth" });
}
