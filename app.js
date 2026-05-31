const grid = document.querySelector("#games-grid");
const status = document.querySelector("#games-status");

registerServiceWorker();
loadGames();

async function loadGames() {
  try {
    const response = await fetch("games.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load games.json: ${response.status}`);
    }

    const manifest = await response.json();
    const games = Array.isArray(manifest) ? manifest : manifest.games;

    renderGames(Array.isArray(games) ? games : []);
  } catch (error) {
    console.error(error);
    status.textContent = "Could not load games.";
    grid.replaceChildren(createEmptyState("The game manifest could not be loaded."));
  }
}

function renderGames(games) {
  const publishedGames = games.filter((game) => game && game.slug && game.title);

  if (publishedGames.length === 0) {
    status.textContent = "No games published yet.";
    grid.replaceChildren(createEmptyState("Publish a game into play/<slug>/ and add it to games.json."));
    return;
  }

  status.textContent = `${publishedGames.length} ${publishedGames.length === 1 ? "game" : "games"}`;
  grid.replaceChildren(...publishedGames.map(createGameCard));
}

function createGameCard(game) {
  const card = document.createElement("a");
  card.className = "game-card";
  card.href = game.url || `play/${game.slug}/`;

  const icon = document.createElement("div");
  icon.className = "game-icon";
  icon.setAttribute("aria-hidden", "true");

  if (isHexColor(game.iconBackground)) {
    icon.style.setProperty("--game-icon-bg", game.iconBackground.trim());
  }

  const iconSource = game.icon || game.cover;

  if (iconSource) {
    const image = document.createElement("img");
    image.src = iconSource;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    icon.append(image);
  } else {
    icon.textContent = game.title.trim().charAt(0).toUpperCase();
  }

  const body = document.createElement("div");
  body.className = "game-body";

  const title = document.createElement("h3");
  title.className = "game-title";
  title.textContent = game.title;

  const description = document.createElement("p");
  description.textContent = game.description || "Play this browser game.";

  body.append(title, description);
  card.append(icon, body);

  return card;
}

function isHexColor(value) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value.trim());
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const scriptUrl = new URL("./sw.js", import.meta.url);
    const scopeUrl = new URL("./", import.meta.url);

    navigator.serviceWorker
      .register(scriptUrl, { scope: scopeUrl })
      .catch((error) => console.warn("Could not register service worker", error));
  });
}
