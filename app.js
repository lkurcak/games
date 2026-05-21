const grid = document.querySelector("#games-grid");
const status = document.querySelector("#games-status");

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
  const card = document.createElement("article");
  card.className = "game-card";

  const cover = document.createElement("div");
  cover.className = "game-cover";

  if (game.cover) {
    const image = document.createElement("img");
    image.src = game.cover;
    image.alt = "";
    image.loading = "lazy";
    cover.append(image);
  } else {
    cover.textContent = game.title.trim().charAt(0).toUpperCase();
  }

  const body = document.createElement("div");
  body.className = "game-body";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const description = document.createElement("p");
  description.textContent = game.description || "Play this browser game.";

  const link = document.createElement("a");
  link.className = "play-link";
  link.href = game.url || `play/${game.slug}/`;
  link.textContent = "Play";

  body.append(title, description, link);
  card.append(cover, body);

  return card;
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}
