import {
  addLetter,
  clearWord,
  createState,
  deleteLetter,
  isLetterDone,
  markFound,
  startPuzzle,
} from "./state.js";
import { render } from "./renderer.js";
import { describeCheckFailure } from "./utils.js";

const state = createState();
let wasm = null;

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
  submitWord() {
    submitCurrentWord();
  },
  newGame() {
    if (!wasm) {
      return;
    }

    startPuzzle(state, wasm.generate_puzzle());
    refreshLetterStats();
    render(state, actions);
  },
  openProgress() {
    state.activeModal = "progress";
    render(state, actions);
  },
  openFound() {
    state.activeModal = "found";
    render(state, actions);
  },
  closeModal() {
    state.activeModal = null;
    render(state, actions);
  },
};

document.querySelector("#submit-word").addEventListener("click", actions.submitWord);
document.querySelector("#delete-letter").addEventListener("click", actions.deleteLetter);
document.querySelector("#new-game").addEventListener("click", actions.newGame);
document.querySelector("#progress-toggle").addEventListener("click", actions.openProgress);
document.querySelector("#found-toggle").addEventListener("click", actions.openFound);
document.querySelector("#recent-words").addEventListener("click", actions.openFound);
document.querySelector("#recent-words").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    actions.openFound();
  }
});
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
  if (!state.puzzle || state.activeModal) {
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

function submitCurrentWord() {
  if (!state.puzzle || !wasm) {
    return;
  }

  const word = state.currentWord.toLowerCase();
  if (!word) {
    state.message = "Build a word first.";
    state.messageKind = "bad";
    render(state, actions);
    return;
  }

  if (state.foundWords.has(word)) {
    state.message = "Already found.";
    state.messageKind = "bad";
    clearWord(state);
    render(state, actions);
    return;
  }

  const result = wasm.check_word(state.puzzle.letters, word);
  if (result.valid) {
    markFound(state, result.word);
    refreshLetterStats();
    state.message = `Found ${result.word}.`;
    state.messageKind = "good";
  } else {
    state.message = describeCheckFailure(result.reason);
    state.messageKind = "bad";
  }

  render(state, actions);
}

function refreshLetterStats() {
  if (!wasm || !state.puzzle) {
    state.letterStats = [];
    return;
  }

  state.letterStats = wasm.get_letter_stats(state.puzzle.letters, [...state.foundWords]);
}
