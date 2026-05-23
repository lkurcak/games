import { getFoundByLength, getProgress, getSortedFoundWords } from "./state.js";
import { pluralize } from "./utils.js";

const elements = {
  progressToggle: document.querySelector("#progress-toggle"),
  progressPercent: document.querySelector("#progress-percent"),
  progressDetails: document.querySelector("#progress-details"),
  currentWord: document.querySelector("#current-word"),
  letterButtons: document.querySelector("#letter-buttons"),
  message: document.querySelector("#message"),
  foundCount: document.querySelector("#found-count"),
  foundWords: document.querySelector("#found-words"),
};

export function render(state, actions) {
  renderProgress(state);
  renderCurrentWord(state);
  renderLetters(state, actions);
  renderMessage(state);
  renderFoundWords(state);
}

function renderProgress(state) {
  const progress = getProgress(state);
  elements.progressPercent.textContent = `${progress.percent}%`;
  elements.progressToggle.setAttribute("aria-expanded", String(state.detailsExpanded));
  elements.progressDetails.hidden = !state.detailsExpanded;

  if (!state.detailsExpanded || !state.puzzle) {
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

  const buttons = [...state.puzzle.letters].map((letter) => {
    const button = document.createElement("button");
    button.className = "letter-button";
    button.type = "button";
    button.textContent = letter;
    button.setAttribute("aria-label", `Add ${letter}`);
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
  const words = getSortedFoundWords(state);
  elements.foundCount.textContent = pluralize(words.length, "word");

  const items = words.map((word) => {
    const item = document.createElement("li");
    item.textContent = word;
    return item;
  });

  elements.foundWords.replaceChildren(...items);
}
