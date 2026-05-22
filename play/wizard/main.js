import init, { WebGame } from "./pkg/wizard.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const statsEl = document.querySelector("#stats");
const abilitiesEl = document.querySelector("#abilities");
const restartButton = document.querySelector("#restart-button");
const gameOverEl = document.querySelector("#game-over");
const gameOverSummaryEl = document.querySelector("#game-over-summary");
const gameOverRestartButton = document.querySelector("#game-over-restart");

const palette = {
  background: "#030303",
  floor: "#111111",
  floorLine: "#191919",
  wall: "#2b2b2b",
  wallLine: "#4b4b4b",
  breakable: "#3a3a3a",
  pit: "#000000",
  object: "#e8e8e8",
  muted: "#8a8a8a",
  dim: "#5f5f5f",
  dark: "#0a0a0a",
};

const spriteSources = {
  floor: "./assets/path.png",
  wall: "./assets/wall.png",
  breakable_wall: "./assets/broken-wall.png",
  door: "./assets/door.png",
  stairs: "./assets/stairs.png",
  wizard: "./assets/wizard.png",
  wizard_up: "./assets/wizard-facing-up.png",
  wizard_down: "./assets/wizard-facing-down.png",
  snake: "./assets/snake.png",
  explosion: "./assets/explosion.png",
  chest: "./assets/coin.png",
  key: "./assets/key.png",
  block: "./assets/block.png",
  trail: "./assets/magic.png",
};

const directionKeys = new Map([
  ["ArrowUp", "up"],
  ["w", "up"],
  ["W", "up"],
  ["ArrowDown", "down"],
  ["s", "down"],
  ["S", "down"],
  ["ArrowLeft", "left"],
  ["a", "left"],
  ["A", "left"],
  ["ArrowRight", "right"],
  ["d", "right"],
  ["D", "right"],
]);

const abilityKeys = new Map([
  [" ", "missile"],
  ["b", "blink"],
  ["B", "blink"],
  ["f", "fireball"],
  ["F", "fireball"],
  ["e", "drain"],
  ["E", "drain"],
  ["x", "blade"],
  ["X", "blade"],
  ["i", "invisibility"],
  ["I", "invisibility"],
]);

let game = null;
let snapshot = null;
let pointerStart = null;

const sprites = Object.fromEntries(
  Object.entries(spriteSources).map(([name, src]) => [name, createSprite(src)]),
);

init()
  .then(() => {
    game = new WebGame();
    statusEl.classList.add("hidden");
    render();
  })
  .catch((error) => {
    statusEl.classList.remove("hidden");
    statusEl.textContent = "Could not load the WASM build. Run wasm-pack first.";
    console.error(error);
  });

bindPress(restartButton, restart);
bindPress(gameOverRestartButton, restart);

abilitiesEl.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("button[data-ability]");
  if (!button || button.disabled || !game) {
    return;
  }

  event.preventDefault();
  flashPressed(button);
  game.useAbility(button.dataset.ability);
  render();
});
abilitiesEl.addEventListener("click", (event) => {
  event.preventDefault();
});

document.addEventListener("dblclick", preventPageGesture, { passive: false });
document.addEventListener("touchmove", preventPageGesture, { passive: false });
for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(eventName, preventPageGesture, { passive: false });
}

window.addEventListener("keydown", (event) => {
  if (!game || event.repeat) {
    return;
  }

  if ((event.key === "r" || event.key === "R") && snapshot?.game_over) {
    event.preventDefault();
    restart();
    return;
  }

  const direction = directionKeys.get(event.key);
  if (direction) {
    event.preventDefault();
    game.moveDirection(direction);
    render();
    return;
  }

  const ability = abilityKeys.get(event.key);
  if (ability) {
    event.preventDefault();
    game.useAbility(ability);
    render();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  if (!game || !pointerStart || pointerStart.id !== event.pointerId) {
    pointerStart = null;
    return;
  }

  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;

  const rect = canvas.getBoundingClientRect();
  const threshold = Math.max(24, Math.min(rect.width, rect.height) * 0.055);
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
    return;
  }

  const direction = Math.abs(dx) > Math.abs(dy)
    ? dx > 0 ? "right" : "left"
    : dy > 0 ? "down" : "up";
  game.moveDirection(direction);
  render();
});

canvas.addEventListener("pointercancel", () => {
  pointerStart = null;
});

new ResizeObserver(() => {
  if (snapshot) {
    drawBoard(snapshot);
  }
}).observe(canvas);

function restart() {
  if (!game) {
    return;
  }

  game.restart();
  render();
}

function render() {
  snapshot = JSON.parse(game.snapshotJson());
  drawBoard(snapshot);
  renderStats(snapshot);
  renderAbilities(snapshot);
  renderGameOver(snapshot);
}

function renderStats({ stats }) {
  const items = [
    ["Lvl", stats.level],
    ["Step", stats.steps],
    ["HP", stats.health],
    ["MP", stats.mana],
    ["Kills", stats.kills],
    ["Gold", stats.gold],
    ["Keys", stats.keys],
    ["Inv", stats.stealth_steps],
  ];

  statsEl.innerHTML = items
    .map(([label, value]) => `
      <div class="stat">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      </div>
    `)
    .join("");
}

function renderAbilities({ abilities }) {
  abilitiesEl.innerHTML = abilities
    .map((ability) => {
      const cost = ability.mana_cost == null ? "No MP" : `${ability.mana_cost} MP`;
      return `
        <button class="ability-button" type="button" data-ability="${ability.id}" ${ability.usable ? "" : "disabled"}>
          <span class="ability-name">${ability.name}</span>
          <span class="ability-meta">${ability.key_label} | ${cost}</span>
        </button>
      `;
    })
    .join("");
}

function renderGameOver({ game_over, stats }) {
  gameOverEl.classList.toggle("hidden", !game_over);
  if (game_over) {
    gameOverSummaryEl.textContent = `Level ${stats.level}, ${stats.kills} kills, ${stats.gold} gold`;
  }
}

function drawBoard({ width, height, tiles, stats }) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
  const nextHeight = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const tileSize = Math.max(1, Math.floor(Math.min(rect.width / width, rect.height / height)));
  const boardWidth = tileSize * width;
  const boardHeight = tileSize * height;
  const offsetX = Math.floor((rect.width - boardWidth) / 2);
  const offsetY = Math.floor((rect.height - boardHeight) / 2);

  for (const tile of tiles) {
    const x = offsetX + tile.x * tileSize;
    const y = offsetY + tile.y * tileSize;
    drawTerrain(tile.terrain, x, y, tileSize);
  }

  for (const tile of tiles) {
    if (!tile.occupant) {
      continue;
    }

    const x = offsetX + tile.x * tileSize;
    const y = offsetY + tile.y * tileSize;
    drawOccupant(tile, x, y, tileSize, stats.last_direction);
  }
}

function drawTerrain(kind, x, y, size) {
  ctx.fillStyle = palette.floor;
  ctx.fillRect(x, y, size, size);

  if (kind !== "pit" && drawSprite(kind, x, y, size)) {
    return;
  }

  ctx.strokeStyle = palette.floorLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

  if (kind === "floor") {
    return;
  }

  if (kind === "wall") {
    ctx.fillStyle = palette.wall;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.strokeStyle = palette.wallLine;
    ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
    return;
  }

  if (kind === "breakable_wall") {
    ctx.fillStyle = palette.breakable;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = Math.max(1, Math.floor(size / 12));
    for (let i = -size; i < size * 2; i += Math.max(5, Math.floor(size / 3))) {
      line(x + i, y + size, x + i + size, y);
    }
    return;
  }

  if (kind === "door") {
    ctx.fillStyle = palette.dark;
    ctx.fillRect(x + size * 0.22, y + size * 0.12, size * 0.56, size * 0.76);
    ctx.strokeStyle = palette.object;
    ctx.lineWidth = Math.max(2, Math.floor(size / 11));
    ctx.strokeRect(x + size * 0.24, y + size * 0.14, size * 0.52, size * 0.72);
    circle(x + size * 0.62, y + size * 0.5, Math.max(1.5, size * 0.045), palette.object);
    return;
  }

  if (kind === "pit") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = palette.dim;
    ctx.lineWidth = Math.max(1, Math.floor(size / 16));
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size / 2, size * 0.36, size * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (kind === "stairs") {
    ctx.strokeStyle = palette.object;
    ctx.lineWidth = Math.max(2, Math.floor(size / 12));
    const left = x + size * 0.24;
    const right = x + size * 0.76;
    for (let i = 0; i < 4; i += 1) {
      const yy = y + size * (0.28 + i * 0.13);
      line(left + i * size * 0.06, yy, right, yy);
    }
  }
}

function drawOccupant(tile, x, y, size, lastDirection) {
  const alpha = tile.invisible ? 0.42 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;

  const sprite = occupantSprite(tile.occupant, lastDirection);
  if (sprite && drawSprite(sprite.name, x, y, size, { flipX: sprite.flipX })) {
    ctx.restore();
    return;
  }

  switch (tile.occupant) {
    case "wizard":
      drawWizard(x, y, size);
      break;
    case "snake":
      drawSnake(x, y, size);
      break;
    case "explosion":
      drawExplosion(x, y, size);
      break;
    case "chest":
      drawChest(x, y, size);
      break;
    case "key":
      drawKey(x, y, size);
      break;
    case "block":
      drawBlock(x, y, size);
      break;
    case "trail":
      circle(x + size / 2, y + size / 2, size * 0.09, palette.muted);
      break;
  }

  ctx.restore();
}

function occupantSprite(occupant, lastDirection) {
  if (occupant !== "wizard") {
    return occupant ? { name: occupant, flipX: false } : null;
  }

  if (lastDirection.y < 0) {
    return { name: "wizard_up", flipX: false };
  }
  if (lastDirection.y > 0) {
    return { name: "wizard_down", flipX: false };
  }

  return { name: "wizard", flipX: lastDirection.x < 0 };
}

function drawWizard(x, y, size) {
  ctx.fillStyle = palette.object;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size * 0.12);
  ctx.lineTo(x + size * 0.25, y + size * 0.48);
  ctx.lineTo(x + size * 0.75, y + size * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(x + size * 0.36, y + size * 0.47, size * 0.28, size * 0.34);
  circle(x + size * 0.5, y + size * 0.43, size * 0.12, palette.dark);
  ctx.fillStyle = palette.object;
  ctx.fillRect(x + size * 0.22, y + size * 0.82, size * 0.56, Math.max(2, size * 0.08));
}

function drawSnake(x, y, size) {
  ctx.strokeStyle = palette.object;
  ctx.lineWidth = Math.max(3, Math.floor(size / 7));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.63);
  ctx.bezierCurveTo(
    x + size * 0.35,
    y + size * 0.2,
    x + size * 0.58,
    y + size * 0.82,
    x + size * 0.78,
    y + size * 0.36,
  );
  ctx.stroke();
  circle(x + size * 0.78, y + size * 0.36, size * 0.08, palette.object);
}

function drawExplosion(x, y, size) {
  ctx.fillStyle = palette.object;
  ctx.beginPath();
  const cx = x + size / 2;
  const cy = y + size / 2;
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size * 0.42 : size * 0.16;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawChest(x, y, size) {
  ctx.strokeStyle = palette.object;
  ctx.fillStyle = palette.dark;
  ctx.lineWidth = Math.max(2, Math.floor(size / 12));
  ctx.fillRect(x + size * 0.2, y + size * 0.38, size * 0.6, size * 0.36);
  ctx.strokeRect(x + size * 0.2, y + size * 0.38, size * 0.6, size * 0.36);
  line(x + size * 0.2, y + size * 0.52, x + size * 0.8, y + size * 0.52);
  circle(x + size * 0.5, y + size * 0.56, size * 0.045, palette.object);
}

function drawKey(x, y, size) {
  ctx.strokeStyle = palette.object;
  ctx.lineWidth = Math.max(2, Math.floor(size / 11));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x + size * 0.36, y + size * 0.48, size * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  line(x + size * 0.48, y + size * 0.48, x + size * 0.76, y + size * 0.48);
  line(x + size * 0.68, y + size * 0.48, x + size * 0.68, y + size * 0.62);
}

function drawBlock(x, y, size) {
  ctx.fillStyle = palette.wall;
  ctx.strokeStyle = palette.object;
  ctx.lineWidth = Math.max(2, Math.floor(size / 12));
  ctx.fillRect(x + size * 0.18, y + size * 0.18, size * 0.64, size * 0.64);
  ctx.strokeRect(x + size * 0.18, y + size * 0.18, size * 0.64, size * 0.64);
  line(x + size * 0.18, y + size * 0.18, x + size * 0.82, y + size * 0.82);
  line(x + size * 0.82, y + size * 0.18, x + size * 0.18, y + size * 0.82);
}

function bindPress(element, handler) {
  if (!element) {
    return;
  }

  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    flashPressed(element);
    handler(event);
  });
  element.addEventListener("click", (event) => {
    event.preventDefault();
  });
}

function flashPressed(element) {
  element.classList.add("is-pressed");
  window.setTimeout(() => {
    element.classList.remove("is-pressed");
  }, 120);
}

function preventPageGesture(event) {
  if (event.cancelable) {
    event.preventDefault();
  }
}

function createSprite(src) {
  const image = new Image();
  const sprite = { image, loaded: false, failed: false };

  image.addEventListener("load", () => {
    sprite.loaded = true;
    if (snapshot) {
      drawBoard(snapshot);
    }
  });
  image.addEventListener("error", () => {
    sprite.failed = true;
    console.warn(`Could not load sprite: ${src}`);
  });
  image.src = src;

  return sprite;
}

function drawSprite(name, x, y, size, options = {}) {
  const sprite = sprites[name];
  if (!sprite?.loaded) {
    return false;
  }

  ctx.save();
  if (options.flipX) {
    ctx.translate(x + size, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite.image, 0, 0, size, size);
  } else {
    ctx.drawImage(sprite.image, x, y, size, size);
  }
  ctx.restore();

  return true;
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
