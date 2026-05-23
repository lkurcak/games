import {
  getFoundByLength,
  getProgress,
  getRecentFoundWords,
  getSortedFoundWords,
} from "./state.js";
import { pluralize } from "./utils.js";

const elements = {
  progressDialog: document.querySelector("#progress-dialog"),
  progressPercent: document.querySelector("#progress-percent"),
  progressDetails: document.querySelector("#progress-details"),
  currentWord: document.querySelector("#current-word"),
  letterButtons: document.querySelector("#letter-buttons"),
  message: document.querySelector("#message"),
  foundDialog: document.querySelector("#found-dialog"),
  foundCount: document.querySelector("#found-count"),
  recentWords: document.querySelector("#recent-words"),
  foundWords: document.querySelector("#found-words"),
};

export function render(state, actions) {
  renderProgress(state);
  renderCurrentWord(state);
  renderLetters(state, actions);
  renderMessage(state);
  renderFoundWords(state);
  syncDialog(elements.progressDialog, state.activeModal === "progress");
  syncDialog(elements.foundDialog, state.activeModal === "found");
}

function renderProgress(state) {
  const progress = getProgress(state);
  elements.progressPercent.textContent = `${progress.percent}%`;

  if (!state.puzzle) {
    elements.progressDetails.replaceChildren();
    return;
  }

  const foundByLength = getFoundByLength(state);
  const rows = state.puzzle.byLength.map((entry) => {
    const found = foundByLength.get(entry.length) ?? 0;
    const row = document.createElement("div");
    const label = document.createElement("span");
    const bar = document.createElement("span");
    const fill = document.createElement("span");
    const count = document.createElement("span");

    row.className = "progress-line";
    label.textContent = `${entry.length} letters`;
    bar.className = "bar";
    fill.className = "bar-fill";
    fill.style.width = `${entry.total === 0 ? 0 : Math.floor((found / entry.total) * 100)}%`;
    count.textContent = `${found}/${entry.total}`;

    bar.append(fill);
    row.append(label, bar, count);
    return row;
  });

  elements.progressDetails.replaceChildren(...rows);
}

function renderCurrentWord(state) {
  elements.currentWord.textContent = state.currentWord;
}

function renderLetters(state, actions) {
  if (!state.puzzle) {
    elements.letterButtons.replaceChildren();
    return;
  }

  const statsByLetter = new Map(state.letterStats.map((entry) => [entry.letter, entry]));
  const buttons = [...state.puzzle.letters].map((letter) => {
    const stats = statsByLetter.get(letter);
    const button = document.createElement("button");

    button.className = "letter-button";
    button.type = "button";
    button.textContent = letter;
    button.disabled = Boolean(stats?.done);
    button.setAttribute(
      "aria-label",
      stats?.done ? `${letter}, completed` : `Add ${letter}, ${stats?.remaining ?? 0} words remaining`,
    );
    button.addEventListener("click", () => actions.addLetter(letter));

    return button;
  });

  elements.letterButtons.replaceChildren(...buttons);
}

function renderMessage(state) {
  elements.message.textContent = state.message;
  elements.message.className = `message ${state.messageKind}`.trim();
}

function renderFoundWords(state) {
  const recentWords = getRecentFoundWords(state);
  const allWords = getSortedFoundWords(state);

  elements.foundCount.textContent = pluralize(allWords.length, "word");
  elements.recentWords.replaceChildren(...recentWords.map(createWordItem));
  elements.foundWords.replaceChildren(...allWords.map(createWordItem));
}

function createWordItem(word) {
  const item = document.createElement("li");
  item.textContent = word;
  return item;
}

function syncDialog(dialog, shouldBeOpen) {
  if (shouldBeOpen && !dialog.open) {
    dialog.showModal();
  }

  if (!shouldBeOpen && dialog.open) {
    dialog.close();
  }
}
