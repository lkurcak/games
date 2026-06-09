import {
  canAddLetter,
  getFoundCountByLength,
  getProgress,
  getRecentFoundWords,
  getRemainingByStart,
  getSortedBonusWords,
  getSortedFoundWords,
  getSortedMissedWords,
  isFirstLetterUnavailable,
} from "./state.js";
import { formatTime, formatWord, pluralize, wordUsesEveryLetter } from "./utils.js";
import { getAchievementList } from "./achievements.js";

const elements = {
  progressDialog: document.querySelector("#progress-dialog"),
  progressPercent: document.querySelector("#progress-percent"),
  progressFill: document.querySelector("#progress-fill"),
  progressDetails: document.querySelector("#progress-details"),
  revealAnswers: document.querySelector("#reveal-answers"),
  currentWord: document.querySelector("#current-word"),
  letterButtons: document.querySelector("#letter-buttons"),
  deleteLetter: document.querySelector("#delete-letter"),
  shuffleLetters: document.querySelector("#shuffle-letters"),
  submitWord: document.querySelector("#submit-word"),
  message: document.querySelector("#message"),
  foundDialog: document.querySelector("#found-dialog"),
  infoDialog: document.querySelector("#info-dialog"),
  victoryDialog: document.querySelector("#victory-dialog"),
  answersDialog: document.querySelector("#answers-dialog"),
  wordDetailDialog: document.querySelector("#word-detail-dialog"),
  wordDetailWord: document.querySelector("#word-detail-word"),
  wordDetailError: document.querySelector("#word-detail-error"),
  wordDetailReport: document.querySelector("#confirm-report-word"),
  answersProgressRing: document.querySelector("#answers-progress-ring"),
  foundCount: document.querySelector("#found-count"),
  recentWords: document.querySelector("#recent-words"),
  foundWords: document.querySelector("#found-words"),
  bonusFoundSection: document.querySelector("#bonus-found-section"),
  bonusFoundWords: document.querySelector("#bonus-found-words"),
  victoryTime: document.querySelector("#victory-time"),
  answersTime: document.querySelector("#answers-time"),
  achievementsDialog: document.querySelector("#achievements-dialog"),
  achievementsList: document.querySelector("#achievements-list"),
};

export function render(state, actions) {
  renderProgress(state);
  renderCurrentWord(state);
  renderLetters(state, actions);
  renderControls(state);
  renderMessage(state);
  renderFoundWords(state, actions);
  renderAnswersModal(state);
  renderWordDetailDialog(state);
  renderTime(state);
  renderAchievementsModal(state);
  syncDialog(elements.progressDialog, state.activeModal === "progress");
  syncDialog(elements.foundDialog, state.activeModal === "found");
  syncDialog(elements.infoDialog, state.activeModal === "info");
  syncDialog(elements.victoryDialog, state.activeModal === "victory");
  syncDialog(elements.answersDialog, state.activeModal === "answers");
  syncDialog(elements.wordDetailDialog, state.activeModal === "word-detail");
  syncDialog(elements.achievementsDialog, state.activeModal === "achievements");
}

function renderProgress(state) {
  const progress = getProgress(state);
  const canRevealAnswers =
    state.puzzle &&
    !state.answersRevealed &&
    progress.percent >= 50 &&
    progress.found < progress.total;
  elements.progressPercent.textContent = `${progress.percent}%`;
  elements.progressFill.style.width = `${progress.percent}%`;
  elements.revealAnswers.hidden = !canRevealAnswers;

  if (!state.puzzle) {
    elements.progressDetails.replaceChildren();
    return;
  }

  const foundByLength = getFoundCountByLength(state);
  const rows = state.puzzle.byLength.map((entry) => {
    const found = foundByLength.get(entry.length) ?? 0;
    const row = document.createElement("div");
    const label = document.createElement("span");
    const bar = document.createElement("span");
    const fill = document.createElement("span");
    const count = document.createElement("span");
    const percent = entry.total === 0 ? 0 : (found / entry.total) * 100;

    row.className = "progress-line";
    label.textContent = `${entry.length} letters`;
    bar.className = "bar";
    fill.className = "bar-fill";
    fill.style.width = `${percent}%`;
    count.className = "progress-count";
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

function renderControls(state) {
  const disabled = !state.puzzle || state.answersRevealed;
  elements.deleteLetter.disabled = disabled;
  elements.shuffleLetters.disabled = disabled;
  elements.submitWord.disabled = disabled;
}

/**
 * Cached letter button elements.  Buttons are created once per puzzle (keyed
 * by the *sorted* letter set so that shuffles don't trigger a rebuild) and
 * then updated in-place on every render.  A single delegated pointerdown
 * listener on the grid container reads the current letter from each button's
 * data attribute, so the handler stays valid even after shuffles.
 */
let letterCache = { key: "", buttons: [] };
let letterDelegated = false;

function renderLetters(state, actions) {
  if (!state.puzzle) {
    letterCache = { key: "", buttons: [] };
    elements.letterButtons.replaceChildren();
    return;
  }

  // Sorted key: same letter set in any order produces the same key, so
  // shuffling letters is handled as a cheap in-place update.
  const puzzleKey = [...state.puzzle.letters].sort().join("");
  const progress = getProgress(state);
  const showHints = progress.percent >= 50;
  const statsByLetter = new Map(state.letterStats.map((entry) => [entry.letter, entry]));
  const startsByLetter = getRemainingByStart(state);

  // Rebuild buttons only when a new puzzle is started (different letter set).
  if (letterCache.key !== puzzleKey) {
    const buttons = [...state.puzzle.letters].map(() => {
      const button = document.createElement("button");
      const letterText = document.createElement("span");
      const hint = document.createElement("span");

      button.className = "letter-button";
      button.type = "button";
      letterText.className = "letter-text";
      hint.className = "letter-hint";

      button.append(letterText, hint);
      return button;
    });

    letterCache = { key: puzzleKey, buttons };
    elements.letterButtons.replaceChildren(...buttons);
  }

  // Install a single delegated pointerdown listener on the grid container.
  // This is done once for the lifetime of the page – the handler reads each
  // button's current data-letter attribute, so it stays valid across puzzles
  // and shuffles without any rebinding.
  if (!letterDelegated) {
    letterDelegated = true;
    elements.letterButtons.addEventListener("pointerdown", (event) => {
      const button = event.target.closest(".letter-button");
      if (!button || button.disabled) return;
      event.preventDefault();
      const letter = button.dataset.letter;
      if (letter) actions.addLetter(letter);
    });
  }

  // Update every button's mutable properties (letter, disabled, hints, aria).
  const letters = [...state.puzzle.letters];
  letterCache.buttons.forEach((button, i) => {
    const letter = letters[i];
    const stats = statsByLetter.get(letter);
    const startCount = startsByLetter.get(letter) ?? 0;
    const letterDone = Boolean(stats?.done);
    const firstLetterUnavailable = isFirstLetterUnavailable(state, letter);

    button.dataset.letter = letter;
    button.querySelector(".letter-text").textContent = letter;
    button.disabled = !canAddLetter(state, letter);
    let ariaLabel = `Add ${letter}, ${stats?.remaining ?? 0} words remaining`;
    if (state.answersRevealed) {
      ariaLabel = `${letter}, answers revealed`;
    } else if (letterDone) {
      ariaLabel = `${letter}, completed`;
    } else if (firstLetterUnavailable) {
      ariaLabel = `${letter}, no remaining words start with ${letter}`;
    }
    button.setAttribute("aria-label", ariaLabel);

    button.querySelector(".letter-hint").textContent = showHints ? String(startCount) : "";
  });
}

function renderMessage(state) {
  elements.message.textContent = state.message;
  elements.message.className = `message ${state.messageKind}`.trim();
}

function renderFoundWords(state, actions) {
  const recentWords = getRecentFoundWords(state);
  const regularWords = getSortedFoundWords(state);
  const missedWords = getSortedMissedWords(state);
  const bonusWords = getSortedBonusWords(state);
  const totalWords = regularWords.length + bonusWords.length;
  const regularItems = [
    ...regularWords.map((word) => ({ word, missed: false })),
    ...missedWords.map((word) => ({ word, missed: true })),
  ].sort((left, right) => left.word.localeCompare(right.word));

  elements.foundCount.textContent = pluralize(totalWords, "word");
  elements.recentWords.replaceChildren(
    ...createRecentWordNodes(recentWords, state.puzzle?.letters ?? ""),
  );
  renderWordList(
    elements.foundWords,
    regularItems,
    state.puzzle?.letters ?? "",
    state,
    actions,
  );
  elements.foundWords.classList.toggle("hide-empty-message", bonusWords.length > 0);
  elements.bonusFoundSection.hidden = bonusWords.length === 0;
  renderWordList(
    elements.bonusFoundWords,
    bonusWords.map((word) => ({ word, missed: false })),
    state.puzzle?.letters ?? "",
    state,
    actions,
  );
}

function renderWordList(element, words, letters, state, actions) {
  const rows = Math.max(1, Math.ceil(words.length / 2));
  element.style.gridTemplateRows = `repeat(${rows}, auto)`;
  element.replaceChildren(
    ...words.map((word) => createWordItem(word, letters, state, actions)),
  );
}

function createWordItem(entry, letters, state, actions) {
  const { word, missed } = entry;
  const item = document.createElement("li");
  const text = document.createElement("span");

  text.className = "word-text";
  text.textContent = formatWord(word);
  item.classList.toggle("golden-word", wordUsesEveryLetter(word, letters));
  item.classList.toggle("missed-word", missed);
  item.append(text);

  item.addEventListener("click", () => {
    actions.openWordDetail(word);
  });

  return item;
}

function renderAnswersModal(state) {
  const progress = getProgress(state);

  elements.answersProgressRing.style.strokeDasharray = `${progress.percent} 100`;
}

function renderWordDetailDialog(state) {
  elements.wordDetailWord.textContent = state.reportWord ? formatWord(state.reportWord) : "";
  elements.wordDetailError.textContent = state.reportError;
  elements.wordDetailReport.disabled = state.reportSubmitting || state.reportedWords.has(state.reportWord);
  elements.wordDetailReport.textContent = state.reportSubmitting ? "Sending..." : "Report word";
}

function renderTime(state) {
  const time = state.elapsedMs > 0 ? formatTime(state.elapsedMs) : "";
  elements.victoryTime.textContent = time;
  elements.answersTime.textContent = time;
}

function createRecentWordNodes(entries, letters) {
  const nodes = [];

  entries.forEach((entry, index) => {
    const item = document.createElement("span");
    item.textContent = formatWord(entry);
    item.classList.toggle("golden-word", wordUsesEveryLetter(entry, letters));
    nodes.push(item);

    if (index < entries.length - 1) {
      nodes.push(document.createTextNode(", "));
    }
  });

  return nodes;
}

function renderAchievementsModal(state) {
  if (!elements.achievementsList || !state.achievementData) {
    return;
  }

  const items = getAchievementList(state.achievementData);

  elements.achievementsList.replaceChildren(
    ...items.map((item) => {
      const el = document.createElement("div");
      el.className = `achievement-item ${item.locked ? "locked" : ""}`;

      const header = document.createElement("div");
      header.className = "achievement-header";

      const name = document.createElement("span");
      name.className = "achievement-name";
      name.textContent = item.locked ? "???" : item.achievement.name;

      const stars = document.createElement("span");
      stars.className = "achievement-stars";

      const totalStars = item.achievement.type === "tiered" ? item.achievement.tiers.length : 6;
      const filled = item.achievement.type === "tiered" ? item.currentTier + 1 : (item.locked ? 0 : 1);
      for (let i = 0; i < totalStars; i++) {
        const star = document.createElement("span");
        star.className = `achievement-star ${i < filled ? "filled" : ""}`;
        star.textContent = "★";
        stars.append(star);
      }

      header.append(name, stars);

      const desc = document.createElement("p");
      desc.className = item.locked ? "achievement-hint" : "achievement-desc";
      desc.textContent = item.locked
        ? item.achievement.hint
        : item.achievement.description;

      if (
        !item.locked &&
        item.achievement.type === "tiered" &&
        item.nextTierIndex !== null
      ) {
        const remaining = Math.max(0, item.nextTierCount - item.currentCount);
        desc.textContent += ` — ${remaining} more for next star`;
      }

      el.append(header, desc);
      return el;
    }),
  );
}

function syncDialog(dialog, shouldBeOpen) {
  if (shouldBeOpen && !dialog.open) {
    dialog.showModal();
  }

  if (!shouldBeOpen && dialog.open) {
    dialog.close();
  }
}
