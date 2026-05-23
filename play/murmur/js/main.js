import {
  addLetter,
  clearWord,
  createState,
  deleteLetter,
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
    render(state, actions);
  },
  toggleDetails() {
    state.detailsExpanded = !state.detailsExpanded;
    render(state, actions);
  },
};

document.querySelector("#submit-word").addEventListener("click", actions.submitWord);
document.querySelector("#delete-letter").addEventListener("click", actions.deleteLetter);
document.querySelector("#new-game").addEventListener("click", actions.newGame);
document.querySelector("#progress-toggle").addEventListener("click", actions.toggleDetails);
document.addEventListener("keydown", handleKeydown);

render(state, actions);

try {
  wasm = await import("../pkg/game_wasm.js");
  await wasm.default();
  startPuzzle(state, wasm.generate_puzzle());
} catch (error) {
  console.error(error);
  state.message = "Could not load the WASM dictionary. Build web/pkg first.";
  state.messageKind = "bad";
}

render(state, actions);

function handleKeydown(event) {
  if (!state.puzzle) {
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

  if (/^[a-z]$/.test(key) && state.puzzle.letters.includes(key)) {
    actions.addLetter(key);
  }
}

function submitCurrentWord() {
  if (!state.puzzle) {
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
    state.message = `Found ${result.word}.`;
    state.messageKind = "good";
  } else {
    state.message = describeCheckFailure(result.reason);
    state.messageKind = "bad";
  }

  render(state, actions);
}
