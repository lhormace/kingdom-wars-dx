export const TILE = 24;
export const GRID_W = 32;
export const GRID_H = 24;

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_CASTLE = 2;
export const TILE_FOREST = 3;
export const TILE_WATER = 4;
export const TILE_BRIDGE = 5;
export const TILE_MOUNTAIN = 6;
export const TILE_SCORCHED = 7;
export const TILE_GRAVE = 8;

export const ENEMY_COLORS = {
  scout: "#ff8a65",
  soldier: "#ef5350",
  knight: "#e57373",
  miniboss: "#ab47bc",
  finalBoss: "#ffd54f",
  zombie: "#66bb6a",
  dragon: "#80cbc4",
  guard: "#f48fb1",
  cavalryHuman: "#42a5f5",
  cavalryDemon: "#ef5350",
};

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isInBounds(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

function carveRoom(map, x1, y1, x2, y2, tile = TILE_FLOOR) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (x > 0 && x < GRID_W - 1 && y > 0 && y < GRID_H - 1) {
        map[y][x] = tile;
      }
    }
  }
}

function getTile(map, x, y) {
  if (!isInBounds(x, y)) return TILE_WALL;
  return map[y][x];
}

function tileAllowsSpawn(tile, allowCastle = false) {
  if (tile === TILE_FLOOR || tile === TILE_FOREST || tile === TILE_BRIDGE) return true;
  if (allowCastle && tile === TILE_CASTLE) return true;
  return false;
}

function occupiedByEnemy(enemy, x, y) {
  const size = enemy.size ?? 1;
  return x >= enemy.x && x < enemy.x + size && y >= enemy.y && y < enemy.y + size;
}

function canPlaceEnemyRect(state, x, y, size, allowCastle = false, ignoreEnemy = null) {
  for (let yy = y; yy < y + size; yy++) {
    for (let xx = x; xx < x + size; xx++) {
      if (!isInBounds(xx, yy)) return false;
      const tile = getTile(state.map, xx, yy);
      if (!tileAllowsSpawn(tile, allowCastle)) return false;
      if (state.hero.x === xx && state.hero.y === yy) return false;
      if (state.excalibur && !state.excalibur.picked && state.excalibur.x === xx && state.excalibur.y === yy) return false;
      if (state.prisoners.some(p => p.x === xx && p.y === yy)) return false;
      if (state.enemies.some(e => e !== ignoreEnemy && occupiedByEnemy(e, xx, yy))) return false;
    }
  }
  return true;
}

function randomOpenTile(state, xMin = 1, xMax = GRID_W - 2, allowCastle = false) {
  for (let tries = 0; tries < 600; tries++) {
    const x = rand(xMin, xMax);
    const y = rand(2, GRID_H - 3);
    const tile = getTile(state.map, x, y);

    if (!tileAllowsSpawn(tile, allowCastle)) continue;
    if (state.hero.x === x && state.hero.y === y) continue;
    if (state.excalibur && !state.excalibur.picked && state.excalibur.x === x && state.excalibur.y === y) continue;
    if (state.prisoners.some(p => p.x === x && p.y === y)) continue;
    if (state.enemies.some(e => occupiedByEnemy(e, x, y))) continue;

    return { x, y };
  }
  return null;
}

function makeEnemy(type, x, y, stage) {
  const stageBoost = Math.max(0, stage - 1);

  const defs = {
    scout: {
      type: "scout",
      hp: 1,
      maxHp: 1,
      power: 2 + Math.floor(stageBoost / 3),
      cooldown: 0,
      speed: 0.18,
      size: 1,
      color: ENEMY_COLORS.scout,
    },
    soldier: {
      type: "soldier",
      hp: 1,
      maxHp: 1,
      power: 3 + Math.floor(stageBoost / 3),
      cooldown: 0,
      speed: 0.22,
      size: 1,
      color: ENEMY_COLORS.soldier,
    },
    knight: {
      type: "knight",
      hp: 2 + Math.floor(stageBoost / 4),
      maxHp: 2 + Math.floor(stageBoost / 4),
      power: 5 + Math.floor(stageBoost / 2),
      cooldown: 0,
      speed: 0.25,
      size: 1,
      color: ENEMY_COLORS.knight,
    },
    miniboss: {
      type: "miniboss",
      hp: 4 + stageBoost,
      maxHp: 4 + stageBoost,
      power: 7 + stageBoost,
      cooldown: 0,
      speed: 0.28,
      size: 2,
      color: ENEMY_COLORS.miniboss,
    },
    finalBoss: {
      type: "finalBoss",
      hp: 10 + stageBoost * 2,
      maxHp: 10 + stageBoost * 2,
      power: 10 + stageBoost,
      cooldown: 0,
      speed: 0.35,
      size: 4,
      color: ENEMY_COLORS.finalBoss,
      demonGuard: true,
    },
    zombie: {
      type: "zombie",
      hp: 1 + Math.floor(stageBoost / 5),
      maxHp: 1 + Math.floor(stageBoost / 5),
      power: 2 + Math.floor(stageBoost / 3),
      cooldown: 0,
      speed: 0.22,
      size: 1,
      color: ENEMY_COLORS.zombie,
    },
    dragon: {
      type: "dragon",
      hp: 8 + stageBoost * 2,
      maxHp: 8 + stageBoost * 2,
      power: 8 + stageBoost,
      cooldown: 0,
      speed: 0.30,
      size: 3,
      color: ENEMY_COLORS.dragon,
    },
    guard: {
      type: "guard",
      hp: 2 + Math.floor(stageBoost / 3),
      maxHp: 2 + Math.floor(stageBoost / 3),
      power: 4 + Math.floor(stageBoost / 2),
      cooldown: 0,
      speed: 0.24,
      size: 1,
      color: ENEMY_COLORS.guard,
    },
  };

  return { x, y, ...defs[type] };
}

export function createStageMap() {
  const map = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE_FLOOR));

  for (let x = 0; x < GRID_W; x++) {
    map[0][x] = TILE_WALL;
    map[GRID_H - 1][x] = TILE_WALL;
  }
  for (let y = 0; y < GRID_H; y++) {
    map[y][0] = TILE_WALL;
    map[y][GRID_W - 1] = TILE_WALL;
  }

  const roadY = rand(7, GRID_H - 8);
  for (let x = 1; x < GRID_W - 1; x++) {
    map[roadY][x] = TILE_FLOOR;
  }

  for (let x = 2; x < GRID_W - 6; x += rand(4, 7)) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const len = rand(2, 5);
    for (let i = 1; i <= len; i++) {
      const by = roadY + dir * i;
      if (by > 0 && by < GRID_H - 1) map[by][x] = TILE_FLOOR;
    }
  }

  const rivers = [rand(8, 12), rand(18, 24)].sort((a, b) => a - b);
  for (const riverX of rivers) {
    for (let y = 1; y < GRID_H - 1; y++) {
      if (Math.abs(y - roadY) <= 1 && Math.random() < 0.45) continue;
      map[y][riverX] = TILE_WATER;
      if (riverX + 1 < GRID_W - 1 && Math.random() < 0.2) map[y][riverX + 1] = TILE_WATER;
    }

    const bridgeYs = [
      roadY,
      clamp(roadY + (Math.random() < 0.5 ? -1 : 1) * rand(2, 4), 1, GRID_H - 2),
    ];

    for (const by of bridgeYs) {
      map[by][riverX] = TILE_BRIDGE;
      if (riverX + 1 < GRID_W - 1 && map[by][riverX + 1] === TILE_WATER) {
        map[by][riverX + 1] = TILE_BRIDGE;
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    const rx = rand(3, GRID_W - 8);
    const ry = rand(2, GRID_H - 6);
    const rw = rand(2, 4);
    const rh = rand(2, 4);
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (isInBounds(x, y) && (x + y) % 2 === 0 && map[y][x] === TILE_FLOOR) {
          map[y][x] = TILE_FOREST;
        }
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const mx = rand(10, GRID_W - 6);
    const my = rand(2, GRID_H - 5);
    const mw = rand(2, 4);
    const mh = rand(2, 3);
    carveRoom(map, mx, my, Math.min(GRID_W - 2, mx + mw), Math.min(GRID_H - 2, my + mh), TILE_MOUNTAIN);
  }

  carveRoom(map, 1, roadY - 1, 4, roadY + 1, TILE_FLOOR);
  carveRoom(map, GRID_W - 5, roadY - 2, GRID_W - 2, roadY + 2, TILE_CASTLE);

  return { map, roadY };
}

export function populateStage(state) {
  state.enemies = [];
  state.prisoners = [];
  state.excalibur = null;

  for (let i = 0; i < 8 + state.stage; i++) {
    const p = randomOpenTile(state, 5, GRID_W - 10);
    if (p) state.enemies.push(makeEnemy("scout", p.x, p.y, state.stage));
  }

  for (let i = 0; i < 10 + state.stage * 2; i++) {
    const p = randomOpenTile(state, 8, GRID_W - 8);
    if (p) state.enemies.push(makeEnemy("soldier", p.x, p.y, state.stage));
  }

  for (let i = 0; i < 6 + state.stage; i++) {
    const p = randomOpenTile(state, 12, GRID_W - 7);
    if (p) state.enemies.push(makeEnemy("knight", p.x, p.y, state.stage));
  }

  const miniCount = 2 + Math.floor(state.stage * 0.75);
  for (let i = 0; i < miniCount; i++) {
    for (let tries = 0; tries < 300; tries++) {
      const p = randomOpenTile(state, Math.max(10, GRID_W - 16), GRID_W - 10, true);
      if (p && canPlaceEnemyRect(state, p.x, p.y, 2, true)) {
        state.enemies.push(makeEnemy("miniboss", p.x, p.y, state.stage));
        break;
      }
    }
  }

  for (let tries = 0; tries < 300; tries++) {
    const p = randomOpenTile(state, GRID_W - 10, GRID_W - 6, true);
    if (p && canPlaceEnemyRect(state, p.x, p.y, 4, true)) {
      state.enemies.push(makeEnemy("finalBoss", p.x, p.y, state.stage));
      break;
    }
  }

  for (let i = 0; i < 12 + Math.floor(state.stage / 2); i++) {
    const p = randomOpenTile(state, 5, GRID_W - 8);
    if (p) state.prisoners.push({ x: p.x, y: p.y });
  }

  const ex = randomOpenTile(state, Math.floor(GRID_W * 0.45), Math.floor(GRID_W * 0.72));
  if (ex) {
    state.excalibur = { x: ex.x, y: ex.y, picked: false };
  }
}

export function buildStage(state) {
  const { map, roadY } = createStageMap();
  state.map = map;
  state.hero.x = 2;
  state.hero.y = roadY;
  populateStage(state);
}
