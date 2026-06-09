import {
  addLetter,
  canAddLetter,
  clearWord,
  clearReport,
  createState,
  deleteLetter,
  getFoundWeight,
  getProgress,
  hasFoundWord,
  markFound,
  markReported,
  openWordDetail as openWordDetailState,
  revealAnswers,
  setReportedWords,
  shuffleLetters,
  startPuzzle,
} from "./state.js";
import { render } from "./renderer.js";
import { describeCheckFailure, formatWord } from "./utils.js";

const state = createState();
let wasm = null;
const deleteButton = document.querySelector("#delete-letter");
const deleteHoldDelay = 450;
const hostedApiBaseUrl = "https://murmur.moojtube.com";
const reportStoragePrefix = "murmur:reported";
let deleteHoldTimer = null;
let suppressDeleteClick = false;

deleteButton.style.setProperty("--delete-hold-delay", `${deleteHoldDelay}ms`);

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
  revealAnswers() {
    revealAllAnswers();
  },
  openWordDetail(word) {
    if (openWordDetailState(state, word)) {
      render(state, actions);
    }
  },
  lookupDefinition() {
    if (state.reportWord) {
      const url = `https://www.google.com/search?q=definition+of+${encodeURIComponent(state.reportWord)}`;
      window.open(url, "_blank");
    }
  },
  confirmReport() {
    submitWordReport();
  },
  closeModal() {
    if (state.reportSubmitting) {
      return;
    }

    if (state.activeModal === "word-detail") {
      clearReport(state);
      state.activeModal = "found";
      render(state, actions);
      return;
    }

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
document.querySelector("#reveal-answers").addEventListener("click", actions.revealAnswers);
document.querySelector("#info-toggle").addEventListener("click", actions.openInfo);
document.querySelector("#found-toggle").addEventListener("click", actions.openFound);
document.querySelector("#confirm-report-word").addEventListener("click", actions.confirmReport);
document.querySelector("#lookup-definition").addEventListener("click", actions.lookupDefinition);
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

registerServiceWorker();
render(state, actions);

try {
  wasm = await import("../pkg/game_wasm.js");
  await wasm.default();
  startPuzzle(state, wasm.generate_puzzle());
  state.startTime = Date.now();
  setReportedWords(state, loadReportedWords(state.puzzle.letters));
  refreshLetterStats();
} catch (error) {
  console.error(error);
  state.message = "Could not load the WASM dictionary. Build web/pkg first.";
  state.messageKind = "bad";
}

render(state, actions);

function handleKeydown(event) {
  if (!state.puzzle || state.answersRevealed || state.activeModal) {
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
    if (key === "backspace" && event.ctrlKey) {
      clearWord(state);
      render(state, actions);
      return;
    }

    actions.deleteLetter();
    return;
  }

  if (key === "tab") {
    event.preventDefault();
    actions.shuffleLetters();
    return;
  }

  if (key === "escape") {
    clearWord(state);
    render(state, actions);
    return;
  }

  if (/^[a-z]$/.test(key) && canAddLetter(state, key)) {
    actions.addLetter(key);
  }
}

function startDeleteHold() {
  if (!state.puzzle || state.answersRevealed || state.activeModal) {
    return;
  }

  cancelDeleteHold();
  suppressDeleteClick = false;
  deleteButton.classList.add("is-holding");
  deleteHoldTimer = window.setTimeout(() => {
    deleteHoldTimer = null;
    suppressDeleteClick = true;
    clearWord(state);
    render(state, actions);
  }, deleteHoldDelay);
}

function cancelDeleteHold() {
  deleteButton.classList.remove("is-holding");

  if (!deleteHoldTimer) {
    return;
  }

  window.clearTimeout(deleteHoldTimer);
  deleteHoldTimer = null;
}

function submitCurrentWord() {
  if (!state.puzzle || state.answersRevealed || !wasm) {
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

function revealAllAnswers() {
  const progress = getProgress(state);
  if (
    !state.puzzle ||
    state.answersRevealed ||
    !wasm ||
    progress.percent < 50 ||
    progress.found >= progress.total
  ) {
    return;
  }

  const answers = wasm.get_answers(state.puzzle.letters);
  revealAnswers(state, Array.isArray(answers) ? answers : []);
  state.elapsedMs = Date.now() - state.startTime;
  render(state, actions);
}

async function submitWordReport() {
  if (!state.puzzle || !state.reportWord || state.reportSubmitting) {
    return;
  }

  const word = state.reportWord;
  state.reportSubmitting = true;
  state.reportError = "";
  render(state, actions);

  try {
    const response = await fetch(apiUrl("/api/word-flags"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        letters: state.puzzle.letters,
        word,
        context: "revealed",
      }),
    });

    if (!response.ok) {
      throw new Error(await reportErrorMessage(response));
    }

    markReported(state, word);
    saveReportedWord(state.puzzle.letters, word);
    state.activeModal = "found";
    state.reportWord = null;
    state.message = `Reported ${formatWord(word)}`;
    state.messageKind = "note";
  } catch (error) {
    console.warn("Could not report word", error);
    state.reportError = error instanceof Error ? error.message : "Could not send the report.";
  } finally {
    state.reportSubmitting = false;
    render(state, actions);
  }
}

function refreshLetterStats() {
  if (!wasm || !state.puzzle) {
    state.letterStats = [];
    return;
  }

  state.letterStats = wasm.get_letter_stats(state.puzzle.letters, [...state.foundWords]);
}

function showVictoryIfComplete() {
  if (
    state.victoryShown ||
    !state.puzzle ||
    getFoundWeight(state) !== state.puzzle.totalWeight
  ) {
    return;
  }

  state.victoryShown = true;
  state.elapsedMs = Date.now() - state.startTime;
  state.activeModal = "victory";
}

function apiUrl(path) {
  const baseUrl = String(globalThis.MURMUR_API_BASE_URL ?? defaultApiBaseUrl());
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function defaultApiBaseUrl() {
  const hostname = globalThis.location?.hostname ?? "";
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "murmur.moojtube.com"
  ) {
    return "";
  }

  return hostedApiBaseUrl;
}

async function reportErrorMessage(response) {
  try {
    const payload = await response.json();
    if (typeof payload?.error === "string") {
      return payload.error;
    }
  } catch (_error) {
    // Fall back to the HTTP status when the server did not return JSON.
  }

  return response.statusText || `Report failed with status ${response.status}`;
}

function reportStorageKey(letters) {
  return `${reportStoragePrefix}:${canonicalLetters(letters)}`;
}

function canonicalLetters(letters) {
  return [...letters.toLowerCase()].sort().join("");
}

function loadReportedWords(letters) {
  try {
    const value = localStorage.getItem(reportStorageKey(letters));
    const words = JSON.parse(value);
    return Array.isArray(words) ? words.filter((word) => typeof word === "string") : [];
  } catch (_error) {
    return [];
  }
}

function saveReportedWord(letters, word) {
  try {
    const words = new Set(loadReportedWords(letters));
    words.add(word);
    localStorage.setItem(reportStorageKey(letters), JSON.stringify([...words].sort()));
  } catch (_error) {
    // Reporting should still succeed if localStorage is unavailable.
  }
}

function scrollInfoSlide(direction) {
  const slides = document.querySelector("#info-dialog .info-slides");
  const slideWidth = slides.clientWidth;
  const lastSlideIndex = slides.children.length - 1;
  if (!slideWidth || lastSlideIndex < 0) {
    return;
  }

  const currentIndex = Math.min(
    lastSlideIndex,
    Math.max(0, Math.round(slides.scrollLeft / slideWidth)),
  );
  const targetIndex = Math.min(lastSlideIndex, Math.max(0, currentIndex + direction));
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

  slides.scrollTo({ left: targetIndex * slideWidth, behavior });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const scriptUrl = new URL("../sw.js", import.meta.url);
    const scopeUrl = new URL("../", import.meta.url);

    navigator.serviceWorker
      .register(scriptUrl, { scope: scopeUrl })
      .catch((error) => console.warn("Could not register service worker", error));
  });
}
