function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
    this.tileSize = 24;
    this.mapW = 32;
    this.mapH = 24;
  }

  create() {
    this.stage = 1;
    this.score = 0;
    this.kills = 0;
    this.lastMagicTime = 0;

    this.colors = {
      floor: 0x222222,
      wall: 0x555555,
      castle: 0x5e35b1,
      forest: 0x2e7d32,
      water: 0x1565c0,
      bridge: 0x8d6e63,
      mountain: 0x757575,
      hero: 0xffe082,
      soldier: 0x66bb6a,
      knight: 0xc5e1a5,
      scout: 0xff8a65,
      enemy: 0xef5350,
      enemyKnight: 0xe57373,
      prisoner: 0x4dd0e1,
      excalibur: 0xffd54f,
      text: "#ffffff",
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,F,R");

    this.infoText = this.add.text(8, 8, "", {
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 6, y: 4 },
    }).setDepth(1000).setScrollFactor(0);

    this.messageText = this.add.text(8, 34, "", {
      fontSize: "14px",
      color: "#dddddd",
      backgroundColor: "#000000",
      padding: { x: 6, y: 4 },
      wordWrap: { width: 780 }
    }).setDepth(1000).setScrollFactor(0);

    this.startStage();
  }

  startStage() {
    if (this.mapGraphics) this.mapGraphics.destroy();
    if (this.unitGraphics) this.unitGraphics.destroy();

    this.mapGraphics = this.add.graphics();
    this.unitGraphics = this.add.graphics();

    this.hero = {
      x: 2,
      y: 12,
      hp: 8,
      maxHp: 8,
      hasExcalibur: false,
    };

    this.formation = [
      { type: "soldier" },
      { type: "soldier" },
      { type: "soldier" },
    ];

    this.enemies = [];
    this.prisoners = [];
    this.excalibur = null;
    this.lastMoveTime = 0;
    this.lastMagicTime = 0;
    this.message = `STAGE ${this.stage} 開始`;

    this.generateMap();
    this.spawnEntities();
    this.renderAll();
    this.updateHud();
  }

  generateMap() {
    const F = 0, W = 1, C = 2, T = 3, A = 4, B = 5, M = 6;
    this.TILES = { FLOOR: F, WALL: W, CASTLE: C, FOREST: T, WATER: A, BRIDGE: B, MOUNTAIN: M };

    this.map = Array.from({ length: this.mapH }, () => Array(this.mapW).fill(F));

    for (let x = 0; x < this.mapW; x++) {
      this.map[0][x] = W;
      this.map[this.mapH - 1][x] = W;
    }
    for (let y = 0; y < this.mapH; y++) {
      this.map[y][0] = W;
      this.map[y][this.mapW - 1] = W;
    }

    const roadY = Phaser.Math.Between(7, this.mapH - 8);
    this.roadY = roadY;
    this.hero.y = roadY;

    for (let x = 1; x < this.mapW - 1; x++) {
      this.map[roadY][x] = F;
    }

    const rivers = [Phaser.Math.Between(8, 11), Phaser.Math.Between(18, 23)].sort((a, b) => a - b);
    for (const riverX of rivers) {
      for (let y = 1; y < this.mapH - 1; y++) {
        this.map[y][riverX] = A;
      }
      this.map[roadY][riverX] = B;
    }

    for (let i = 0; i < 4; i++) {
      const fx = Phaser.Math.Between(3, this.mapW - 7);
      const fy = Phaser.Math.Between(2, this.mapH - 6);
      const fw = Phaser.Math.Between(2, 4);
      const fh = Phaser.Math.Between(2, 4);
      for (let y = fy; y < fy + fh; y++) {
        for (let x = fx; x < fx + fw; x++) {
          if (this.inBounds(x, y) && this.map[y][x] === F) {
            this.map[y][x] = T;
          }
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const mx = Phaser.Math.Between(10, this.mapW - 6);
      const my = Phaser.Math.Between(2, this.mapH - 5);
      const mw = Phaser.Math.Between(2, 3);
      const mh = Phaser.Math.Between(2, 3);
      for (let y = my; y < my + mh; y++) {
        for (let x = mx; x < mx + mw; x++) {
          if (this.inBounds(x, y)) {
            this.map[y][x] = M;
          }
        }
      }
    }

    for (let y = roadY - 2; y <= roadY + 2; y++) {
      for (let x = this.mapW - 5; x <= this.mapW - 2; x++) {
        if (this.inBounds(x, y)) this.map[y][x] = C;
      }
    }

    for (let y = roadY - 1; y <= roadY + 1; y++) {
      for (let x = 1; x <= 4; x++) {
        if (this.inBounds(x, y)) this.map[y][x] = F;
      }
    }
  }

  spawnEntities() {
    const stageBoost = Math.max(0, this.stage - 1);

    for (let i = 0; i < 8 + this.stage; i++) {
      const p = this.findFreeTile(5, this.mapW - 10);
      if (p) this.enemies.push({ type: "scout", x: p.x, y: p.y, hp: 1, power: 2 + Math.floor(stageBoost / 3), color: this.colors.scout });
    }

    for (let i = 0; i < 10 + this.stage * 2; i++) {
      const p = this.findFreeTile(8, this.mapW - 8);
      if (p) this.enemies.push({ type: "soldier", x: p.x, y: p.y, hp: 1, power: 3 + Math.floor(stageBoost / 3), color: this.colors.enemy });
    }

    for (let i = 0; i < 5 + this.stage; i++) {
      const p = this.findFreeTile(12, this.mapW - 7);
      if (p) this.enemies.push({ type: "knight", x: p.x, y: p.y, hp: 2, power: 5 + Math.floor(stageBoost / 2), color: this.colors.enemyKnight });
    }

    const miniCount = 2 + Math.floor(this.stage / 2);
    for (let i = 0; i < miniCount; i++) {
      const p = this.findFreeTile(this.mapW - 14, this.mapW - 8, true);
      if (p) this.enemies.push({ type: "miniboss", x: p.x, y: p.y, hp: 4 + stageBoost, power: 7 + stageBoost, color: 0xab47bc });
    }

    const bossPos = this.findFreeTile(this.mapW - 8, this.mapW - 5, true);
    if (bossPos) {
      this.enemies.push({
        type: "finalBoss",
        x: bossPos.x,
        y: bossPos.y,
        hp: 10 + stageBoost * 2,
        power: 10 + stageBoost,
        color: 0xffd54f,
      });
    }

    for (let i = 0; i < 10 + Math.floor(this.stage / 2); i++) {
      const p = this.findFreeTile(5, this.mapW - 8);
      if (p) this.prisoners.push({ x: p.x, y: p.y });
    }

    const sword = this.findFreeTile(Math.floor(this.mapW * 0.45), Math.floor(this.mapW * 0.72));
    if (sword) {
      this.excalibur = { x: sword.x, y: sword.y, picked: false };
    }
  }

  inBounds(x, y) {
    return x >= 0 && x < this.mapW && y >= 0 && y < this.mapH;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return this.TILES.WALL;
    return this.map[y][x];
  }

  isPassable(x, y) {
    const t = this.getTile(x, y);
    return t !== this.TILES.WALL && t !== this.TILES.WATER && t !== this.TILES.MOUNTAIN;
  }

  findFreeTile(xMin = 1, xMax = this.mapW - 2, allowCastle = false) {
    for (let i = 0; i < 400; i++) {
      const x = Phaser.Math.Between(xMin, xMax);
      const y = Phaser.Math.Between(2, this.mapH - 3);
      const tile = this.getTile(x, y);

      const okTile =
        tile === this.TILES.FLOOR ||
        tile === this.TILES.FOREST ||
        tile === this.TILES.BRIDGE ||
        (allowCastle && tile === this.TILES.CASTLE);

      if (!okTile) continue;
      if (this.hero.x === x && this.hero.y === y) continue;
      if (this.enemies.some(e => e.x === x && e.y === y)) continue;
      if (this.prisoners.some(p => p.x === x && p.y === y)) continue;
      return { x, y };
    }
    return null;
  }

  update() {
    if (this.keys.R.isDown && this.time.now - this.lastMoveTime > 150) {
      this.startStage();
      this.lastMoveTime = this.time.now;
      return;
    }

    if (this.modeIsLocked()) return;

    if (this.time.now - this.lastMoveTime > 140) {
      let dx = 0;
      let dy = 0;

      if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
      else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
      else if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
      else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;

      if (dx !== 0 || dy !== 0) {
        this.tryMoveHero(dx, dy);
        this.moveEnemies();
        this.renderAll();
        this.updateHud();
        this.lastMoveTime = this.time.now;
      }
    }

    if (this.keys.F.isDown && this.time.now - this.lastMagicTime > 300) {
      this.castMagic();
      this.renderAll();
      this.updateHud();
      this.lastMagicTime = this.time.now || 0;
    }
  }

  modeIsLocked() {
    return this.message === "GAME OVER" || this.message === "STAGE CLEAR";
  }

  tryMoveHero(dx, dy) {
    const nx = this.hero.x + dx;
    const ny = this.hero.y + dy;

    if (!this.inBounds(nx, ny)) {
      this.message = "これ以上は進めません。";
      return;
    }

    if (!this.isPassable(nx, ny)) {
      this.message = this.getTile(nx, ny) === this.TILES.WATER
        ? "川は渡れません。橋を探してください。"
        : "その地形には進めません。";
      return;
    }

    const enemyIndex = this.enemies.findIndex(e => e.x === nx && e.y === ny);
    if (enemyIndex >= 0) {
      this.resolveBattle(enemyIndex);
      return;
    }

    this.hero.x = nx;
    this.hero.y = ny;

    this.pickupThings();

    const bossAlive = this.enemies.some(e => e.type === "finalBoss");
    if (this.getTile(nx, ny) === this.TILES.CASTLE) {
      if (bossAlive) {
        this.message = "まだラスボスが生きています。";
      } else {
        this.message = "STAGE CLEAR";
        this.score += 100 * this.stage;
        this.stage += 1;
      }
      return;
    }

    this.message = "進軍中...";
  }

  resolveBattle(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy) return;

    if (this.hero.hasExcalibur && ["miniboss", "finalBoss"].includes(enemy.type)) {
      this.hero.x = enemy.x;
      this.hero.y = enemy.y;
      this.removeEnemy(enemyIndex);
      this.message = enemy.type === "finalBoss"
        ? "エクスカリバーでラスボス撃破。"
        : "エクスカリバーで強敵撃破。";
      return;
    }

    const front = this.formation.length > 0 ? this.formation[0] : { type: "hero" };
    const player =
      (front.type === "knight" ? rand(3, 8) : front.type === "soldier" ? rand(1, 6) : rand(4, 9)) + 2;
    const foe = rand(1, 6) + enemy.power;

    if (player >= foe) {
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        this.hero.x = enemy.x;
        this.hero.y = enemy.y;
        this.removeEnemy(enemyIndex);
        this.message = `${enemy.type} を撃破しました。`;
      } else {
        this.message = `${enemy.type} にダメージ。`;
      }
      return;
    }

    if (this.formation.length > 0) {
      const lost = this.formation.shift();
      this.message = lost.type === "knight" ? "騎士が倒れました。" : "兵が倒れました。";
      return;
    }

    this.hero.hp -= enemy.type === "finalBoss" ? 2 : 1;
    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.message = "GAME OVER";
    } else {
      this.message = "王が傷つきました。";
    }
  }

  removeEnemy(index) {
    const enemy = this.enemies[index];
    if (!enemy) return;

    this.score += enemy.type === "finalBoss"
      ? 500
      : enemy.type === "miniboss"
        ? 180
        : enemy.type === "knight"
          ? 35
          : 10;

    this.kills += enemy.type === "finalBoss"
      ? 20
      : enemy.type === "miniboss"
        ? 5
        : enemy.type === "knight"
          ? 2
          : 1;

    this.enemies.splice(index, 1);
  }

  pickupThings() {
    const pIndex = this.prisoners.findIndex(p => p.x === this.hero.x && p.y === this.hero.y);
    if (pIndex >= 0) {
      this.prisoners.splice(pIndex, 1);
      const nextCount = this.formation.length + 1;
      this.formation.push(nextCount % 3 === 0 ? { type: "knight" } : { type: "soldier" });
      this.score += 20;
      this.message = nextCount % 3 === 0 ? "捕虜を救出。騎士が加入。" : "捕虜を救出。兵が加入。";
    }

    if (
      this.excalibur &&
      !this.excalibur.picked &&
      this.excalibur.x === this.hero.x &&
      this.excalibur.y === this.hero.y
    ) {
      this.excalibur.picked = true;
      this.hero.hasExcalibur = true;
      this.score += 150;
      this.message = "エクスカリバーを入手しました。";
    }
  }

  castMagic() {
    const targets = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.y === this.hero.y && e.x > this.hero.x && e.x <= this.hero.x + 6) {
        targets.push({ index: i, dist: e.x - this.hero.x });
      }
    }

    targets.sort((a, b) => a.dist - b.dist);
    if (targets.length === 0) {
      this.message = "前方に敵がいません。";
      return;
    }

    const target = this.enemies[targets[0].index];
    target.hp -= 2;
    if (target.hp <= 0) {
      this.removeEnemy(targets[0].index);
    }
    this.message = "大魔法使いが魔法を放ちました。";
  }

  moveEnemies() {
    if (this.message === "GAME OVER" || this.message === "STAGE CLEAR") return;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = Math.sign(this.hero.x - e.x);
      const dy = Math.sign(this.hero.y - e.y);

      const candidates = [
        { x: e.x + dx, y: e.y },
        { x: e.x, y: e.y + dy },
        { x: e.x + dx, y: e.y + dy },
      ];

      for (const c of candidates) {
        if (!this.inBounds(c.x, c.y)) continue;

        if (c.x === this.hero.x && c.y === this.hero.y) {
          this.resolveBattle(i);
          break;
        }

        if (!this.isPassable(c.x, c.y)) continue;
        if (this.enemies.some((other, idx) => idx !== i && other.x === c.x && other.y === c.y)) continue;

        e.x = c.x;
        e.y = c.y;
        break;
      }
    }
  }

  drawTile(x, y, tile) {
    const px = x * this.tileSize;
    const py = y * this.tileSize;

    let color = this.colors.floor;
    if (tile === this.TILES.WALL) color = this.colors.wall;
    else if (tile === this.TILES.CASTLE) color = this.colors.castle;
    else if (tile === this.TILES.FOREST) color = this.colors.forest;
    else if (tile === this.TILES.WATER) color = this.colors.water;
    else if (tile === this.TILES.BRIDGE) color = this.colors.bridge;
    else if (tile === this.TILES.MOUNTAIN) color = this.colors.mountain;

    this.mapGraphics.fillStyle(color, 1);
    this.mapGraphics.fillRect(px, py, this.tileSize, this.tileSize);

    if (tile === this.TILES.CASTLE) {
      this.mapGraphics.fillStyle(0xb39ddb, 1);
      this.mapGraphics.fillRect(px + 3, py + 4, 18, 12);
      this.mapGraphics.fillStyle(0x311b92, 1);
      this.mapGraphics.fillRect(px + 8, py + 10, 6, 8);
    }
  }

  drawUnit(x, y, color, size = 1) {
    const px = x * this.tileSize;
    const py = y * this.tileSize;
    const w = this.tileSize * size;
    const h = this.tileSize * size;

    this.unitGraphics.fillStyle(0x000000, 0.35);
    this.unitGraphics.fillRect(px + 3, py + 3, w - 6, h - 6);

    this.unitGraphics.fillStyle(color, 1);
    this.unitGraphics.fillRect(px + 5, py + 5, w - 10, h - 10);
  }

  drawBar(x, y, w, h, value, max, color) {
    this.unitGraphics.fillStyle(0x000000, 0.7);
    this.unitGraphics.fillRect(x, y, w, h);
    this.unitGraphics.fillStyle(color, 1);
    this.unitGraphics.fillRect(x, y, w * (max <= 0 ? 0 : value / max), h);
  }

  renderAll() {
    this.mapGraphics.clear();
    this.unitGraphics.clear();

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        this.drawTile(x, y, this.map[y][x]);
      }
    }

    if (this.excalibur && !this.excalibur.picked) {
      this.drawUnit(this.excalibur.x, this.excalibur.y, this.colors.excalibur);
    }

    for (const p of this.prisoners) {
      this.drawUnit(p.x, p.y, this.colors.prisoner);
    }

    for (const e of this.enemies) {
      const size = e.type === "miniboss" ? 2 : e.type === "finalBoss" ? 2 : 1;
      this.drawUnit(e.x, e.y, e.color, size);

      if (["miniboss", "finalBoss"].includes(e.type)) {
        this.drawBar(
          e.x * this.tileSize + 2,
          e.y * this.tileSize - 5,
          this.tileSize * size - 4,
          4,
          e.hp,
          e.type === "finalBoss" ? 10 + Math.max(0, this.stage - 1) * 2 : 4 + Math.max(0, this.stage - 1),
          e.type === "finalBoss" ? 0xffd54f : 0xce93d8
        );
      }
    }

    const priestX = Math.max(1, this.hero.x - this.formation.length - 2);
    const mageX = Math.max(1, this.hero.x - this.formation.length - 1);

    this.drawUnit(priestX, this.hero.y, 0xfff59d);
    this.drawUnit(mageX, this.hero.y, 0x90caf9);

    let fx = this.hero.x;
    for (let i = 0; i < this.formation.length; i++) {
      fx--;
      if (!this.inBounds(fx, this.hero.y)) break;
      this.drawUnit(fx, this.hero.y, this.formation[i].type === "knight" ? this.colors.knight : this.colors.soldier);
    }

    this.drawUnit(this.hero.x, this.hero.y, this.colors.hero);
    this.drawBar(
      this.hero.x * this.tileSize + 2,
      this.hero.y * this.tileSize - 5,
      this.tileSize - 4,
      4,
      this.hero.hp,
      this.hero.maxHp,
      0x81c784
    );
  }

  updateHud() {
    const soldiers = this.formation.filter(u => u.type === "soldier").length;
    const knights = this.formation.filter(u => u.type === "knight").length;

    this.infoText.setText(
      `STAGE ${this.stage}  SCORE ${this.score}  HP ${this.hero.hp}/${this.hero.maxHp}  兵 ${soldiers}  騎士 ${knights}  聖剣 ${this.hero.hasExcalibur ? "有" : "無"}`
    );

    this.messageText.setText(this.message);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 768,
  height: 576,
  backgroundColor: "#000000",
  parent: "game-container",
  scene: [MainScene],
};

new Phaser.Game(config);
