import {
  TILE,
  GRID_W,
  GRID_H,
  TILE_FLOOR,
  TILE_WALL,
  TILE_CASTLE,
  TILE_FOREST,
  TILE_WATER,
  TILE_BRIDGE,
  TILE_MOUNTAIN,
  buildStage,
} from "./stage.js";

const TILE = 24;
const GRID_W = 32;
const GRID_H = 24;

const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_CASTLE = 2;
const TILE_FOREST = 3;
const TILE_WATER = 4;
const TILE_BRIDGE = 5;
const TILE_MOUNTAIN = 6;

const COLORS = {
  bg: "#000000",
  floor: "#222222",
  wall: "#555555",
  castle: "#5e35b1",
  forest: "#2e7d32",
  water: "#1565c0",
  bridge: "#8d6e63",
  mountain: "#757575",
  hero: "#ffe082",
  soldier: "#66bb6a",
  knight: "#c5e1a5",
  enemyScout: "#ff8a65",
  enemySoldier: "#ef5350",
  enemyKnight: "#e57373",
  prisoner: "#4dd0e1",
  excalibur: "#ffd54f",
  text: "#ffffff",
  shadow: "rgba(0,0,0,0.35)",
};

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createInitialState() {
  return {
    running: false,
    mode: "title",
    stage: 1,
    score: 0,
    kills: 0,

    hero: {
      x: 2,
      y: 12,
      hp: 8,
      maxHp: 8,
      hasExcalibur: false,
    },

    mage: {
      mana: 8,
      maxMana: 8,
      cooldown: 0,
      regen: 0.2,
    },

    priest: {
      mana: 8,
      maxMana: 8,
      cooldown: 0,
      regen: 0.18,
      barrierTime: 0,
      barrierCooldown: 0,
      barrierDuration: 3.5,
      barrierCost: 3,
    },

    formation: [
      { type: "soldier" },
      { type: "soldier" },
      { type: "soldier" },
    ],

    map: [],
    enemies: [],
    prisoners: [],
    excalibur: null,

    input: {
      pressed: new Set(),
    },

    timers: {
      moveCooldown: 0,
    },

    effects: [],
    lastMessage: "初期化完了。",
  };
}

function countFormation(formation) {
  let soldiers = 0;
  let knights = 0;
  for (const unit of formation) {
    if (unit.type === "knight") knights += 1;
    else soldiers += 1;
  }
  return { soldiers, knights };
}

function isInBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

function getTile(state, x, y) {
  if (!isInBounds(x, y)) return TILE_WALL;
  return state.map[y][x];
}

function isPassable(state, x, y) {
  const t = getTile(state, x, y);
  return t !== TILE_WALL && t !== TILE_WATER && t !== TILE_MOUNTAIN;
}

function isCastle(state, x, y) {
  return getTile(state, x, y) === TILE_CASTLE;
}

function makeMap() {
  const m = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE_FLOOR));

  for (let x = 0; x < GRID_W; x++) {
    m[0][x] = TILE_WALL;
    m[GRID_H - 1][x] = TILE_WALL;
  }
  for (let y = 0; y < GRID_H; y++) {
    m[y][0] = TILE_WALL;
    m[y][GRID_W - 1] = TILE_WALL;
  }

  const roadY = rand(7, GRID_H - 8);
  for (let x = 1; x < GRID_W - 1; x++) {
    m[roadY][x] = TILE_FLOOR;
  }

  const rivers = [rand(8, 11), rand(18, 23)].sort((a, b) => a - b);
  for (const riverX of rivers) {
    for (let y = 1; y < GRID_H - 1; y++) {
      m[y][riverX] = TILE_WATER;
    }
    m[roadY][riverX] = TILE_BRIDGE;
    const by = clamp(roadY + rand(-3, 3), 1, GRID_H - 2);
    m[by][riverX] = TILE_BRIDGE;
  }

  for (let i = 0; i < 4; i++) {
    const fx = rand(3, GRID_W - 7);
    const fy = rand(2, GRID_H - 6);
    const fw = rand(2, 4);
    const fh = rand(2, 4);
    for (let y = fy; y < fy + fh; y++) {
      for (let x = fx; x < fx + fw; x++) {
        if (isInBounds(x, y) && m[y][x] === TILE_FLOOR) {
          m[y][x] = TILE_FOREST;
        }
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const mx = rand(10, GRID_W - 6);
    const my = rand(2, GRID_H - 5);
    const mw = rand(2, 3);
    const mh = rand(2, 3);
    for (let y = my; y < my + mh; y++) {
      for (let x = mx; x < mx + mw; x++) {
        if (isInBounds(x, y) && x > 0 && x < GRID_W - 1 && y > 0 && y < GRID_H - 1) {
          m[y][x] = TILE_MOUNTAIN;
        }
      }
    }
  }

  for (let y = roadY - 2; y <= roadY + 2; y++) {
    for (let x = GRID_W - 5; x <= GRID_W - 2; x++) {
      if (isInBounds(x, y)) m[y][x] = TILE_CASTLE;
    }
  }

  for (let y = roadY - 1; y <= roadY + 1; y++) {
    for (let x = 1; x <= 4; x++) {
      if (isInBounds(x, y)) m[y][x] = TILE_FLOOR;
    }
  }

  return { map: m, roadY };
}

function findFreeTile(state, xMin = 1, xMax = GRID_W - 2, allowCastle = false) {
  for (let i = 0; i < 500; i++) {
    const x = rand(xMin, xMax);
    const y = rand(2, GRID_H - 3);
    const tile = getTile(state, x, y);
    if (!allowCastle && tile === TILE_CASTLE) continue;
    if (![TILE_FLOOR, TILE_FOREST, TILE_BRIDGE, TILE_CASTLE].includes(tile)) continue;
    if (state.hero.x === x && state.hero.y === y) continue;
    if (state.enemies.some((e) => e.x === x && e.y === y)) continue;
    if (state.prisoners.some((p) => p.x === x && p.y === y)) continue;
    if (state.excalibur && state.excalibur.x === x && state.excalibur.y === y && !state.excalibur.picked) continue;
    return { x, y };
  }
  return null;
}

function spawnStageEntities(state) {
  state.enemies = [];
  state.prisoners = [];

  const stageBoost = Math.max(0, state.stage - 1);

  for (let i = 0; i < 8 + state.stage; i++) {
    const p = findFreeTile(state, 5, GRID_W - 10);
    if (!p) continue;
    state.enemies.push({
      type: "scout",
      x: p.x,
      y: p.y,
      hp: 1,
      maxHp: 1,
      power: 2 + Math.floor(stageBoost / 3),
      cooldown: 0,
      speed: 0.18,
      color: COLORS.enemyScout,
    });
  }

  for (let i = 0; i < 10 + state.stage * 2; i++) {
    const p = findFreeTile(state, 8, GRID_W - 8);
    if (!p) continue;
    state.enemies.push({
      type: "soldier",
      x: p.x,
      y: p.y,
      hp: 1,
      maxHp: 1,
      power: 3 + Math.floor(stageBoost / 3),
      cooldown: 0,
      speed: 0.22,
      color: COLORS.enemySoldier,
    });
  }

  for (let i = 0; i < 5 + state.stage; i++) {
    const p = findFreeTile(state, 12, GRID_W - 6);
    if (!p) continue;
    state.enemies.push({
      type: "knight",
      x: p.x,
      y: p.y,
      hp: 2,
      maxHp: 2,
      power: 5 + Math.floor(stageBoost / 2),
      cooldown: 0,
      speed: 0.25,
      color: COLORS.enemyKnight,
    });
  }

  for (let i = 0; i < 2 + Math.floor(state.stage / 2); i++) {
    const p = findFreeTile(state, GRID_W - 14, GRID_W - 8, true);
    if (!p) continue;
    state.enemies.push({
      type: "miniboss",
      x: p.x,
      y: p.y,
      hp: 4 + stageBoost,
      maxHp: 4 + stageBoost,
      power: 7 + stageBoost,
      cooldown: 0,
      speed: 0.28,
      color: "#ab47bc",
    });
  }

  const finalPos = findFreeTile(state, GRID_W - 8, GRID_W - 5, true);
  if (finalPos) {
    state.enemies.push({
      type: "finalBoss",
      x: finalPos.x,
      y: finalPos.y,
      hp: 10 + stageBoost * 2,
      maxHp: 10 + stageBoost * 2,
      power: 10 + stageBoost,
      cooldown: 0,
      speed: 0.35,
      color: "#ffd54f",
      demonGuard: true,
    });
  }

  for (let i = 0; i < 10 + Math.floor(state.stage / 2); i++) {
    const p = findFreeTile(state, 5, GRID_W - 8);
    if (!p) continue;
    state.prisoners.push({ x: p.x, y: p.y });
  }

  const ex = findFreeTile(state, Math.floor(GRID_W * 0.45), Math.floor(GRID_W * 0.72));
  state.excalibur = ex ? { x: ex.x, y: ex.y, picked: false } : null;
}

function setupStage(state) {
  const { map, roadY } = makeMap();
  state.map = map;
  state.hero.x = 2;
  state.hero.y = roadY;
  state.hero.hp = state.hero.maxHp;
  state.hero.hasExcalibur = false;
  state.mage.mana = state.mage.maxMana;
  state.priest.mana = state.priest.maxMana;
  state.priest.barrierTime = 0;
  state.priest.barrierCooldown = 0;
  state.timers.moveCooldown = 0;
  state.effects = [];
  spawnStageEntities(state);
}

function getEnemyAt(state, x, y) {
  return state.enemies.findIndex((e) => e.x === x && e.y === y);
}

function getPrisonerAt(state, x, y) {
  return state.prisoners.findIndex((p) => p.x === x && p.y === y);
}

function addMessage(state, msg) {
  state.lastMessage = msg;
}

function getFormationCounts(state) {
  return countFormation(state.formation);
}

function heroAttackPower(state) {
  const front = frontUnit(state);
  if (front.type === "knight") return rand(3, 8);
  if (front.type === "soldier") return rand(1, 6);
  return rand(4, 9);
}

function frontUnit(state) {
  return state.formation.length > 0 ? state.formation[0] : { type: "hero" };
}

function removeEnemy(state, index) {
  const enemy = state.enemies[index];
  if (!enemy) return;
  state.score += enemy.type === "finalBoss" ? 500
    : enemy.type === "miniboss" ? 180
    : enemy.type === "knight" ? 35
    : 10;
  state.kills += enemy.type === "finalBoss" ? 20
    : enemy.type === "miniboss" ? 5
    : enemy.type === "knight" ? 2
    : 1;
  state.enemies.splice(index, 1);
}

function battle(state, enemyIndex) {
  const enemy = state.enemies[enemyIndex];
  if (!enemy) return;

  if (state.hero.hasExcalibur && ["miniboss", "finalBoss"].includes(enemy.type)) {
    addMessage(state, enemy.type === "finalBoss" ? "エクスカリバーでラスボスを一撃撃破。" : "エクスカリバーで強敵を撃破。");
    state.hero.x = enemy.x;
    state.hero.y = enemy.y;
    removeEnemy(state, enemyIndex);
    return;
  }

  const player = heroAttackPower(state) + 2;
  const foe = rand(1, 6) + enemy.power;

  if (player >= foe) {
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      state.hero.x = enemy.x;
      state.hero.y = enemy.y;
      removeEnemy(state, enemyIndex);
      addMessage(state, `${enemy.type} を撃破しました。`);
    } else {
      addMessage(state, `${enemy.type} にダメージ。`);
    }
  } else {
    if (state.formation.length > 0) {
      const lost = state.formation.shift();
      addMessage(state, lost.type === "knight" ? "騎士が倒れました。" : "兵が倒れました。");
    } else {
      state.hero.hp -= enemy.type === "finalBoss" ? 2 : 1;
      if (state.hero.hp <= 0) {
        state.hero.hp = 0;
        state.mode = "gameover";
        state.running = false;
        addMessage(state, "GAME OVER");
      } else {
        addMessage(state, "王が傷つきました。");
      }
    }
  }
}

function pickupThings(state) {
  const pIndex = getPrisonerAt(state, state.hero.x, state.hero.y);
  if (pIndex >= 0) {
    state.prisoners.splice(pIndex, 1);
    const nextCount = state.formation.length + 1;
    state.formation.push(nextCount % 3 === 0 ? { type: "knight" } : { type: "soldier" });
    state.score += 20;
    addMessage(state, nextCount % 3 === 0 ? "捕虜を救出。騎士が加入。" : "捕虜を救出。兵が加入。");
  }

  if (
    state.excalibur &&
    !state.excalibur.picked &&
    state.excalibur.x === state.hero.x &&
    state.excalibur.y === state.hero.y
  ) {
    state.excalibur.picked = true;
    state.hero.hasExcalibur = true;
    state.score += 150;
    addMessage(state, "エクスカリバーを入手しました。");
  }
}

function tryMove(state, dx, dy) {
  if (state.mode !== "game") return;

  const nx = state.hero.x + dx;
  const ny = state.hero.y + dy;

  if (!isInBounds(nx, ny)) {
    addMessage(state, "これ以上は進めません。");
    return;
  }
  if (!isPassable(state, nx, ny)) {
    addMessage(state, getTile(state, nx, ny) === TILE_WATER ? "川は渡れません。橋を探してください。" : "その地形には進めません。");
    return;
  }

  const enemyIndex = getEnemyAt(state, nx, ny);
  if (enemyIndex >= 0) {
    battle(state, enemyIndex);
    return;
  }

  state.hero.x = nx;
  state.hero.y = ny;
  pickupThings(state);

  const bossAlive = state.enemies.some((e) => e.type === "finalBoss");
  if (isCastle(state, nx, ny)) {
    if (bossAlive) {
      addMessage(state, "まだラスボスが生きています。");
    } else {
      state.mode = "clear";
      state.running = false;
      state.score += 100 * state.stage;
      addMessage(state, "STAGE CLEAR");
    }
  }
}

function castMagic(state, auto = false) {
  if (state.mode !== "game") return;
  if (state.mage.cooldown > 0) return;
  if (state.mage.mana < 1) {
    if (!auto) addMessage(state, "大魔法使いのMPが足りません。");
    return;
  }

  const targets = [];
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.y === state.hero.y && e.x > state.hero.x && e.x <= state.hero.x + 6) {
      targets.push({ index: i, dist: e.x - state.hero.x });
    }
  }
  targets.sort((a, b) => a.dist - b.dist);

  if (targets.length === 0) {
    if (!auto) addMessage(state, "前方に敵がいません。");
    return;
  }

  state.mage.mana -= 1;
  state.mage.cooldown = auto ? 1.4 : 0.9;

  const picked = targets.slice(0, 3).map((t) => t.index).sort((a, b) => b - a);
  for (const idx of picked) {
    const e = state.enemies[idx];
    if (!e) continue;
    e.hp -= 2;
    if (e.hp <= 0) removeEnemy(state, idx);
  }

  addMessage(state, auto ? "大魔法使いが自動援護魔法を放ちました。" : "大魔法使いが魔法を放ちました。");
}

function activateBarrier(state) {
  if (state.mode !== "game") return;
  if (state.priest.barrierCooldown > 0) {
    addMessage(state, "結界はまだ使えません。");
    return;
  }
  if (state.priest.mana < state.priest.barrierCost) {
    addMessage(state, "僧侶のMPが足りません。");
    return;
  }

  state.priest.mana -= state.priest.barrierCost;
  state.priest.barrierTime = state.priest.barrierDuration;
  state.priest.barrierCooldown = 6.5;
  addMessage(state, "僧侶が聖結界を展開しました。");
}

function archmageUltimate(state) {
  if (state.mode !== "game") return;
  if (state.mage.mana < 5) {
    addMessage(state, "必殺に必要なMPが足りません。");
    return;
  }

  state.mage.mana -= 5;
  state.score += state.enemies.length * 15;
  state.kills += state.enemies.length;
  state.enemies = [];
  addMessage(state, "大魔法使いが必殺魔法を放ちました。");
}

function moveEnemies(state, dt) {
  if (state.mode !== "game") return;

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    enemy.cooldown -= dt;
    if (enemy.cooldown > 0) continue;

    enemy.cooldown = enemy.speed;

    const dx = Math.sign(state.hero.x - enemy.x);
    const dy = Math.sign(state.hero.y - enemy.y);

    const candidates = [
      { x: enemy.x + dx, y: enemy.y },
      { x: enemy.x, y: enemy.y + dy },
      { x: enemy.x + dx, y: enemy.y + dy },
    ];

    let moved = false;
    for (const c of candidates) {
      if (!isInBounds(c.x, c.y)) continue;
      if (c.x === state.hero.x && c.y === state.hero.y) {
        battle(state, i);
        moved = true;
        break;
      }
      if (!isPassable(state, c.x, c.y)) continue;
      if (getEnemyAt(state, c.x, c.y) >= 0) continue;
      enemy.x = c.x;
      enemy.y = c.y;
      moved = true;
      break;
    }

    if (!moved && enemy.type === "finalBoss") {
      if (
        state.hero.y === enemy.y &&
        state.hero.x < enemy.x &&
        Math.abs(state.hero.x - enemy.x) <= 8
      ) {
        if (state.priest.barrierTime > 0) {
          addMessage(state, "聖結界がラスボスのブレスを防ぎました。");
        } else {
          state.hero.hp -= 2;
          if (state.hero.hp <= 0) {
            state.hero.hp = 0;
            state.mode = "gameover";
            state.running = false;
            addMessage(state, "ラスボスのブレスでGAME OVER");
          } else {
            addMessage(state, "ラスボスのブレスを受けました。");
          }
        }
      }
    }
  }
}

function drawTile(ctx, tile, x, y) {
  const px = x * TILE;
  const py = y * TILE;

  switch (tile) {
    case TILE_WALL:
      ctx.fillStyle = COLORS.wall;
      break;
    case TILE_CASTLE:
      ctx.fillStyle = COLORS.castle;
      break;
    case TILE_FOREST:
      ctx.fillStyle = COLORS.forest;
      break;
    case TILE_WATER:
      ctx.fillStyle = COLORS.water;
      break;
    case TILE_BRIDGE:
      ctx.fillStyle = COLORS.bridge;
      break;
    case TILE_MOUNTAIN:
      ctx.fillStyle = COLORS.mountain;
      break;
    default:
      ctx.fillStyle = COLORS.floor;
  }
  ctx.fillRect(px, py, TILE, TILE);

  if (tile === TILE_CASTLE) {
    ctx.fillStyle = "#b39ddb";
    ctx.fillRect(px + 3, py + 4, 18, 12);
    ctx.fillStyle = "#311b92";
    ctx.fillRect(px + 8, py + 10, 6, 8);
  }
}

function drawUnit(ctx, x, y, color) {
  const px = x * TILE;
  const py = y * TILE;
  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(px + 3, py + 3, 18, 18);
  ctx.fillStyle = color;
  ctx.fillRect(px + 5, py + 5, 14, 14);
}

function drawBar(ctx, x, y, w, h, value, max, color) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * (max <= 0 ? 0 : value / max), h);
}

function renderTitle(ctx, canvas) {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0d1321");
  grad.addColorStop(1, "#1d2d44");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 54px monospace";
  ctx.fillText("Kingdom Wars DX", canvas.width / 2, 180);
  ctx.font = "22px monospace";
  ctx.fillStyle = "#cfd8dc";
  ctx.fillText("GitHub CLI 本格版", canvas.width / 2, 220);
  ctx.font = "18px monospace";
  ctx.fillText("ゲーム開始で進軍開始", canvas.width / 2, 320);
  ctx.fillText("F: 魔法 / B: 結界 / U: 必殺", canvas.width / 2, 350);
}

function renderGame(ctx, canvas, state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      drawTile(ctx, state.map[y][x], x, y);
    }
  }

  if (state.excalibur && !state.excalibur.picked) {
    drawUnit(ctx, state.excalibur.x, state.excalibur.y, COLORS.excalibur);
  }

  for (const p of state.prisoners) {
    drawUnit(ctx, p.x, p.y, COLORS.prisoner);
  }

  for (const e of state.enemies) {
    drawUnit(ctx, e.x, e.y, e.color);
    if (["miniboss", "finalBoss"].includes(e.type)) {
      drawBar(ctx, e.x * TILE + 2, e.y * TILE - 5, TILE - 4, 4, e.hp, e.maxHp, e.type === "finalBoss" ? "#ffd54f" : "#ce93d8");
    }
  }

  const priestX = Math.max(1, state.hero.x - state.formation.length - 2);
  const mageX = Math.max(1, state.hero.x - state.formation.length - 1);

  drawUnit(ctx, priestX, state.hero.y, "#fff59d");
  drawUnit(ctx, mageX, state.hero.y, "#90caf9");

  let fx = state.hero.x;
  for (let i = 0; i < state.formation.length; i++) {
    fx--;
    if (!isInBounds(fx, state.hero.y)) break;
    drawUnit(ctx, fx, state.hero.y, state.formation[i].type === "knight" ? COLORS.knight : COLORS.soldier);
  }

  drawUnit(ctx, state.hero.x, state.hero.y, COLORS.hero);
  drawBar(ctx, state.hero.x * TILE + 2, state.hero.y * TILE - 5, TILE - 4, 4, state.hero.hp, state.hero.maxHp, "#81c784");

  if (state.mode === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff6666";
    ctx.textAlign = "center";
    ctx.font = "bold 62px monospace";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  }

  if (state.mode === "clear") {
    ctx.fillStyle = "rgba(0,0,0,0.56)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#66ff99";
    ctx.textAlign = "center";
    ctx.font = "bold 58px monospace";
    ctx.fillText("STAGE CLEAR", canvas.width / 2, canvas.height / 2);
  }
}

export function createGame({ canvas, hud, controls }) {
  const ctx = canvas.getContext("2d");
  const state = createInitialState();

  function syncHud() {
    const { soldiers, knights } = getFormationCounts(state);
    hud.status.textContent =
      state.mode === "title" ? "タイトル" :
      state.mode === "gameover" ? "ゲームオーバー" :
      state.mode === "clear" ? "クリア" :
      "進軍中";
    hud.stage.textContent = String(state.stage);
    hud.score.textContent = String(state.score);
    hud.hp.textContent = `${state.hero.hp}/${state.hero.maxHp}`;
    hud.soldier.textContent = String(soldiers);
    hud.knight.textContent = String(knights);
    hud.message.textContent = state.lastMessage;
  }

  function start() {
    state.running = true;
    state.mode = "game";
    state.stage = 1;
    state.score = 0;
    state.kills = 0;
    state.formation = [{ type: "soldier" }, { type: "soldier" }, { type: "soldier" }];
    setupStage(state);
    addMessage(state, "ゲーム開始。敵城へ進軍してください。");
    syncHud();
    render();
  }

  function restart() {
    if (state.mode === "clear") {
      state.stage += 1;
      state.mode = "game";
      state.running = true;
      state.formation = [{ type: "soldier" }, { type: "soldier" }, { type: "soldier" }];
      setupStage(state);
      addMessage(state, `STAGE ${state.stage} 開始。`);
    } else {
      const fresh = createInitialState();
      Object.assign(state, fresh);
      syncHud();
      render();
      return;
    }
    syncHud();
    render();
  }

  function onKeyDown(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();

    if (e.key === "f" || e.key === "F") castMagic(state, false);
    else if (e.key === "b" || e.key === "B") activateBarrier(state);
    else if (e.key === "u" || e.key === "U") archmageUltimate(state);
    else if (e.key === "r" || e.key === "R") restart();
    else state.input.pressed.add(e.key);

    syncHud();
  }

  function onKeyUp(e) {
    state.input.pressed.delete(e.key);
  }

  function consumeMoveInput() {
    const p = state.input.pressed;
    if (p.has("ArrowUp") || p.has("w") || p.has("W")) return [0, -1];
    if (p.has("ArrowDown") || p.has("s") || p.has("S")) return [0, 1];
    if (p.has("ArrowLeft") || p.has("a") || p.has("A")) return [-1, 0];
    if (p.has("ArrowRight") || p.has("d") || p.has("D")) return [1, 0];
    return null;
  }

  function update(dt) {
    if (state.mode === "title") {
      syncHud();
      return;
    }

    state.mage.cooldown = Math.max(0, state.mage.cooldown - dt);
    state.priest.cooldown = Math.max(0, state.priest.cooldown - dt);
    state.priest.barrierCooldown = Math.max(0, state.priest.barrierCooldown - dt);
    state.priest.barrierTime = Math.max(0, state.priest.barrierTime - dt);
    state.timers.moveCooldown -= dt;

    state.mage.mana = Math.min(state.mage.maxMana, state.mage.mana + dt * state.mage.regen);
    state.priest.mana = Math.min(state.priest.maxMana, state.priest.mana + dt * state.priest.regen);

    const dir = consumeMoveInput();
    if (dir && state.timers.moveCooldown <= 0 && state.mode === "game") {
      tryMove(state, dir[0], dir[1]);
      state.timers.moveCooldown = 0.12;
    }

    const nearThreat = state.enemies.some((e) => e.y === state.hero.y && e.x > state.hero.x && e.x <= state.hero.x + 4);
    if (nearThreat && Math.random() < 0.01) castMagic(state, true);

    moveEnemies(state, dt);
    syncHud();
  }

  function render() {
    if (state.mode === "title") renderTitle(ctx, canvas);
    else renderGame(ctx, canvas, state);
  }

  function loop(t) {
    const dt = Math.min(0.05, ((t - (state._lastTime ?? t)) / 1000) || 0);
    state._lastTime = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function bind() {
    controls.startBtn.addEventListener("click", start);
    controls.restartBtn.addEventListener("click", restart);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  function mount() {
    bind();
    syncHud();
    render();
    requestAnimationFrame(loop);
  }

  return { mount };
}
