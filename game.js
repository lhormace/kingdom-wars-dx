function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.musicEnabled = false;
    this.nextMusicTime = 0;
    this.musicStep = 0;
    this.theme = [
      { freq: 220.0, beats: 1.5, type: "triangle", gain: 0.045 },
      { freq: 261.63, beats: 0.5, type: "triangle", gain: 0.038 },
      { freq: 329.63, beats: 1.0, type: "triangle", gain: 0.05 },
      { freq: 392.0, beats: 1.0, type: "triangle", gain: 0.05 },
      { freq: 329.63, beats: 1.0, type: "triangle", gain: 0.045 },
      { freq: 293.66, beats: 1.0, type: "triangle", gain: 0.04 },
      { freq: 261.63, beats: 1.0, type: "triangle", gain: 0.04 },
      { freq: 196.0, beats: 1.0, type: "triangle", gain: 0.038 },
      { freq: 220.0, beats: 1.0, type: "square", gain: 0.032 },
      { freq: 293.66, beats: 1.0, type: "triangle", gain: 0.045 },
      { freq: 349.23, beats: 1.0, type: "triangle", gain: 0.048 },
      { freq: 440.0, beats: 2.0, type: "triangle", gain: 0.055 },
      { freq: 392.0, beats: 1.0, type: "triangle", gain: 0.042 },
      { freq: 329.63, beats: 1.0, type: "triangle", gain: 0.04 },
      { freq: 293.66, beats: 1.0, type: "triangle", gain: 0.04 },
      { freq: 261.63, beats: 2.0, type: "triangle", gain: 0.04 },
    ];
    this.bass = [110, 146.83, 164.81, 174.61, 130.81, 146.83, 110, 98.0];
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") this.ctx.resume();
    this.unlocked = true;
  }

  setMusicEnabled(enabled) {
    if (!this.unlocked || !this.ctx) return;
    this.musicEnabled = enabled;
    if (enabled) {
      this.nextMusicTime = Math.max(this.ctx.currentTime + 0.04, this.nextMusicTime || 0);
    }
  }

  update() {
    if (!this.musicEnabled || !this.unlocked || !this.ctx) return;
    while (this.nextMusicTime < this.ctx.currentTime + 0.35) {
      const step = this.theme[this.musicStep % this.theme.length];
      const bassFreq = this.bass[this.musicStep % this.bass.length];
      const duration = 0.22 * step.beats;
      this.scheduleTone(this.nextMusicTime, duration, step.freq, step.type, step.gain, this.musicGain);
      this.scheduleTone(this.nextMusicTime, duration * 0.95, bassFreq, "sine", 0.028, this.musicGain);
      this.nextMusicTime += duration;
      this.musicStep += 1;
    }
  }

  playSfx(kind) {
    if (!this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;
    const map = {
      attack: [
        { freq: 180, dur: 0.05, type: "square", gain: 0.08 },
        { freq: 120, dur: 0.08, type: "triangle", gain: 0.06, delay: 0.03 },
      ],
      hit: [
        { freq: 240, dur: 0.06, type: "square", gain: 0.08 },
        { freq: 180, dur: 0.08, type: "square", gain: 0.06, delay: 0.04 },
      ],
      damage: [
        { freq: 140, dur: 0.07, type: "sawtooth", gain: 0.085 },
        { freq: 90, dur: 0.12, type: "triangle", gain: 0.07, delay: 0.02 },
      ],
      magic: [
        { freq: 440, dur: 0.08, type: "triangle", gain: 0.08 },
        { freq: 660, dur: 0.12, type: "sine", gain: 0.06, delay: 0.05 },
      ],
      heal: [
        { freq: 392, dur: 0.07, type: "sine", gain: 0.07 },
        { freq: 523.25, dur: 0.14, type: "triangle", gain: 0.06, delay: 0.05 },
      ],
      pickup: [
        { freq: 523.25, dur: 0.08, type: "triangle", gain: 0.07 },
        { freq: 659.25, dur: 0.08, type: "triangle", gain: 0.07, delay: 0.07 },
        { freq: 783.99, dur: 0.16, type: "sine", gain: 0.06, delay: 0.14 },
      ],
      clear: [
        { freq: 392, dur: 0.08, type: "triangle", gain: 0.07 },
        { freq: 523.25, dur: 0.1, type: "triangle", gain: 0.07, delay: 0.08 },
        { freq: 659.25, dur: 0.14, type: "triangle", gain: 0.07, delay: 0.18 },
      ],
      boss: [
        { freq: 110, dur: 0.14, type: "sawtooth", gain: 0.09 },
        { freq: 146.83, dur: 0.18, type: "triangle", gain: 0.06, delay: 0.08 },
      ],
    };
    for (const note of map[kind] || []) {
      this.scheduleTone(now + (note.delay || 0), note.dur, note.freq, note.type, note.gain, this.sfxGain);
    }
  }

  scheduleTone(start, duration, frequency, type, gainAmount, output) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainAmount, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(output);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
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
    this.lastMoveTime = 0;
    this.phase = "title";
    this.message = "Enter または開始ボタンで出撃します。";
    this.magicEffects = [];
    this.worldEffects = [];
    this.isPaused = false;
    this.audio = new RetroAudio();
    this.damageRegenDelay = 0;
    this.passiveHealTick = 0;
    this.companionTexts = [];
    this.setupCompanions();
    this.resetWorldState();

    this.colors = {
      floor: 0x1b241d,
      wall: 0x425046,
      castle: 0x6b5634,
      forest: 0x2f5a3f,
      water: 0x2e5f63,
      bridge: 0x8a6a3a,
      mountain: 0x6d6f58,
      hero: 0xf2d07c,
      soldier: 0x7faa78,
      knight: 0xc9ddb5,
      scout: 0xc96b4b,
      enemy: 0xa84634,
      enemyKnight: 0xc07256,
      prisoner: 0x8fc8bb,
      excalibur: 0xe0c063,
      mage: 0x7db7af,
      priest: 0xf3e7b0,
      uiInk: 0x120d08,
      uiPanel: 0x1a241c,
      uiRune: 0xd2b16f,
      uiMist: 0xeedfb9,
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,F,R,ENTER,SPACE");

    this.mapGraphics = this.add.graphics();
    this.unitGraphics = this.add.graphics();
    this.overlayGraphics = this.add.graphics().setDepth(100);

    this.infoText = this.add.text(8, 8, "", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#f4ead2",
      backgroundColor: "#1a120b",
      padding: { x: 8, y: 5 },
    }).setDepth(1000).setScrollFactor(0);

    this.messageText = this.add.text(8, 38, "", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#eadfc4",
      backgroundColor: "#1a120b",
      padding: { x: 8, y: 5 },
      wordWrap: { width: 760 },
    }).setDepth(1000).setScrollFactor(0);

    this.mageMpText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "12px",
      color: "#eff4e7",
      backgroundColor: "rgba(20, 26, 18, 0.82)",
      padding: { x: 4, y: 2 },
    }).setDepth(1001);

    this.setupOverlayText();
    this.bindDomButtons();
    this.showTitleOverlay();
    this.syncDomButtons();
    this.updateHud();
  }

  setupOverlayText() {
    this.overlayTitle = this.add.text(this.scale.width / 2, 140, "Kingdom Wars DX", {
      fontFamily: "Georgia, serif",
      fontSize: "40px",
      fontStyle: "bold",
      color: "#f4e0ae",
      stroke: "#120d08",
      strokeThickness: 5,
      align: "center",
    }).setOrigin(0.5).setDepth(101);

    this.overlaySubtitle = this.add.text(this.scale.width / 2, 186, "王国軍を率いて敵城を攻略せよ", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#c8d8b8",
      align: "center",
    }).setOrigin(0.5).setDepth(101);

    this.overlayBody = this.add.text(this.scale.width / 2, 300, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f6efdf",
      align: "center",
      lineSpacing: 10,
      wordWrap: { width: 560 },
    }).setOrigin(0.5).setDepth(101);

    this.overlayHint = this.add.text(this.scale.width / 2, 430, "", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d7bf78",
      align: "center",
    }).setOrigin(0.5).setDepth(101);
  }

  bindDomButtons() {
    this.startButton = document.getElementById("start-button");
    this.restartButton = document.getElementById("restart-button");

    this.startButton?.addEventListener("click", () => {
      this.audio.unlock();
      if (this.phase === "title") this.startNewRun();
      else if (this.phase === "playing") this.togglePause();
      else if (this.phase === "paused") this.togglePause();
      else if (this.phase === "clear") this.beginNextStage();
      else if (this.phase === "gameover") this.restartCurrentStage();
    });

    this.restartButton?.addEventListener("click", () => {
      this.audio.unlock();
      if (this.phase === "title") this.startNewRun();
      else this.restartCurrentStage();
    });
  }

  syncDomButtons() {
    if (this.startButton) {
      const labels = {
        title: "ゲーム開始",
        playing: this.isPaused ? "再開" : "一時停止",
        paused: "再開",
        clear: "次のステージ",
        gameover: "再挑戦",
      };
      this.startButton.textContent = labels[this.phase] ?? "ゲーム開始";
    }

    if (this.restartButton) {
      this.restartButton.textContent = this.phase === "title" ? "ステージやり直し" : "ステージ再挑戦";
    }
  }

  startNewRun() {
    this.stage = 1;
    this.score = 0;
    this.kills = 0;
    this.startStage();
  }

  restartCurrentStage() {
    this.startStage();
  }

  beginNextStage() {
    this.phase = "playing";
    this.startStage();
  }

  startStage() {
    this.phase = "playing";
    this.isPaused = false;
    this.setupCompanions();
    this.resetWorldState();
    this.hero = {
      x: 2,
      y: 12,
      hp: 8,
      maxHp: 8,
      hasExcalibur: false,
    };
    this.damageRegenDelay = 0;
    this.passiveHealTick = 0;

    this.formation = [
      { type: "soldier" },
      { type: "soldier" },
      { type: "knight" },
    ];

    this.enemies = [];
    this.prisoners = [];
    this.excalibur = null;
    this.lastMoveTime = 0;
    this.lastMagicTime = 0;
    this.magicEffects = [];
    this.message = `STAGE ${this.stage} 開始。王・騎士・大魔法使い・僧侶の隊列で進軍してください。`;

    this.generateMap();
    this.spawnEntities();
    this.renderAll();
    this.hideOverlay();
    this.syncDomButtons();
    this.audio.unlock();
    this.audio.setMusicEnabled(true);
    this.updateHud();
  }

  showTitleOverlay() {
    this.phase = "title";
    this.audio?.setMusicEnabled(false);
    this.generateMap();
    this.hero = { x: 4, y: this.roadY, hp: 8, maxHp: 8, hasExcalibur: false };
    this.formation = [{ type: "soldier" }, { type: "knight" }];
    this.enemies = [
      { type: "scout", x: 13, y: this.roadY - 1, hp: 1, maxHp: 1, power: 2, color: this.colors.scout },
      { type: "soldier", x: 18, y: this.roadY, hp: 1, maxHp: 1, power: 3, color: this.colors.enemy },
      { type: "finalBoss", x: 25, y: this.roadY - 1, hp: 10, maxHp: 10, power: 10, color: 0xffd54f },
    ];
    this.prisoners = [{ x: 10, y: this.roadY + 1 }];
    this.excalibur = { x: 21, y: this.roadY + 1, picked: false };
    this.renderAll();

    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x120d08, 0.82);
    this.overlayGraphics.fillRoundedRect(72, 92, 624, 384, 24);
    this.overlayGraphics.lineStyle(2, 0xd2b16f, 0.45);
    this.overlayGraphics.strokeRoundedRect(72, 92, 624, 384, 24);
    this.drawOverlayRunes(72, 92, 624, 384);

    this.overlayTitle.setText("Kingdom Wars DX").setVisible(true);
    this.overlaySubtitle.setText("王国軍を率いて敵城を攻略せよ").setVisible(true);
    this.overlayBody.setText([
      "・矢印キー / WASD で前進・後退・上下移動",
      "・F で前方の敵へ魔法攻撃",
      "・王の後方には騎士・大魔法使い・僧侶が最初から同行します",
      "・時間経過で王のHPが少しずつ自動回復します",
      "・聖剣を拾うと強敵と4x4 の龍ラスボスに有利になります",
      "・翡翠色の平原と金の紋様は、古きケルトの戦場を映しています",
    ]).setVisible(true);
    this.overlayHint.setText("Enter / Space / 開始ボタンで出撃").setVisible(true);
    this.syncDomButtons();
  }

  showStageClearOverlay() {
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x102116, 0.84);
    this.overlayGraphics.fillRoundedRect(120, 160, 528, 220, 22);
    this.overlayGraphics.lineStyle(2, 0x9cc78a, 0.45);
    this.overlayGraphics.strokeRoundedRect(120, 160, 528, 220, 22);
    this.drawOverlayRunes(120, 160, 528, 220);
    this.audio?.setMusicEnabled(false);
    this.audio?.playSfx("clear");
    this.overlayTitle.setText("STAGE CLEAR").setVisible(true);
    this.overlaySubtitle.setText(`ステージ ${this.stage - 1} を突破しました`).setVisible(true);
    this.overlayBody.setText("開始ボタンで次ステージへ、やり直しボタンで同じステージを再挑戦できます。\n敵の配置は毎回変化します。").setVisible(true);
    this.overlayHint.setText("Enter / 開始ボタンで次のステージへ").setVisible(true);
    this.syncDomButtons();
  }

  showGameOverOverlay() {
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x24110c, 0.84);
    this.overlayGraphics.fillRoundedRect(120, 160, 528, 220, 22);
    this.overlayGraphics.lineStyle(2, 0xc47857, 0.45);
    this.overlayGraphics.strokeRoundedRect(120, 160, 528, 220, 22);
    this.drawOverlayRunes(120, 160, 528, 220);
    this.audio?.setMusicEnabled(false);
    this.audio?.playSfx("damage");
    this.overlayTitle.setText("GAME OVER").setVisible(true);
    this.overlaySubtitle.setText("王国軍が壊滅しました").setVisible(true);
    this.overlayBody.setText("やり直しボタンまたは R キーでステージを再挑戦できます。\n味方を救いながら隊列を維持して進軍しましょう。").setVisible(true);
    this.overlayHint.setText("R / やり直しボタンで再挑戦").setVisible(true);
    this.syncDomButtons();
  }

  hideOverlay() {
    this.overlayGraphics.clear();
    this.overlayTitle.setVisible(false);
    this.overlaySubtitle.setVisible(false);
    this.overlayBody.setVisible(false);
    this.overlayHint.setVisible(false);
  }

  togglePause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.isPaused = true;
      this.message = "進軍を一時停止しています。";
      this.audio?.setMusicEnabled(false);
      this.showPauseOverlay();
      this.renderAll();
      this.updateHud();
      return;
    }

    if (this.phase === "paused") {
      this.phase = "playing";
      this.isPaused = false;
      this.message = "進軍を再開しました。";
      this.hideOverlay();
      this.audio?.setMusicEnabled(true);
      this.renderAll();
      this.updateHud();
    }
  }

  drawOverlayRunes(x, y, width, height) {
    const g = this.overlayGraphics;
    g.lineStyle(1, 0xd2b16f, 0.24);
    const margin = 18;
    for (const cx of [x + margin, x + width - margin]) {
      for (const cy of [y + margin, y + height - margin]) {
        g.strokeCircle(cx, cy, 10);
        g.strokeCircle(cx, cy, 18);
        g.beginPath();
        g.moveTo(cx - 18, cy);
        g.lineTo(cx + 18, cy);
        g.moveTo(cx, cy - 18);
        g.lineTo(cx, cy + 18);
        g.strokePath();
      }
    }

    g.lineStyle(1, 0xd2b16f, 0.18);
    g.strokeRoundedRect(x + 10, y + 10, width - 20, height - 20, 18);
  }

  showPauseOverlay() {
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x101a15, 0.82);
    this.overlayGraphics.fillRoundedRect(150, 170, 468, 204, 22);
    this.overlayGraphics.lineStyle(2, 0xb39a61, 0.42);
    this.overlayGraphics.strokeRoundedRect(150, 170, 468, 204, 22);
    this.drawOverlayRunes(150, 170, 468, 204);
    this.overlayTitle.setText("PAUSE").setVisible(true);
    this.overlaySubtitle.setText("進軍を中断中").setVisible(true);
    this.overlayBody.setText("開始ボタンまたは Enter / Space で戦線へ復帰します。\nやり直しボタンならこのステージを最初から再挑戦できます。").setVisible(true);
    this.overlayHint.setText("開始ボタンで再開 / R で再挑戦").setVisible(true);
    this.syncDomButtons();
  }

  generateMap() {
    const F = 0, W = 1, C = 2, T = 3, A = 4, B = 5, M = 6;
    this.TILES = { FLOOR: F, WALL: W, CASTLE: C, FOREST: T, WATER: A, BRIDGE: B, MOUNTAIN: M };
    this.WORLD_TILES = { NONE: 0, LIGHT: 1, DARK: 2 };

    this.map = Array.from({ length: this.mapH }, () => Array(this.mapW).fill(F));
    this.worldMap = Array.from({ length: this.mapH }, () => Array(this.mapW).fill(this.WORLD_TILES.NONE));
    this.bridgePoints = [];

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
    if (this.hero) this.hero.y = roadY;

    for (let x = 1; x < this.mapW - 1; x++) this.map[roadY][x] = F;

    const rivers = [Phaser.Math.Between(8, 11), Phaser.Math.Between(18, 23)].sort((a, b) => a - b);
    for (const riverX of rivers) {
      for (let y = 1; y < this.mapH - 1; y++) this.map[y][riverX] = A;
      this.map[roadY][riverX] = B;
      this.bridgePoints.push({ x: riverX, y: roadY });
      const altBridgeY = Phaser.Math.Clamp(roadY + Phaser.Math.Between(-3, 3), 1, this.mapH - 2);
      this.map[altBridgeY][riverX] = B;
      this.bridgePoints.push({ x: riverX, y: altBridgeY });
    }

    for (let i = 0; i < 4; i++) {
      const fx = Phaser.Math.Between(3, this.mapW - 7);
      const fy = Phaser.Math.Between(2, this.mapH - 6);
      const fw = Phaser.Math.Between(2, 4);
      const fh = Phaser.Math.Between(2, 4);
      for (let y = fy; y < fy + fh; y++) {
        for (let x = fx; x < fx + fw; x++) {
          if (this.inBounds(x, y) && this.map[y][x] === F) this.map[y][x] = T;
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
          if (this.inBounds(x, y)) this.map[y][x] = M;
        }
      }
    }

    for (let y = roadY - 2; y <= roadY + 2; y++) {
      for (let x = this.mapW - 5; x <= this.mapW - 2; x++) {
        if (this.inBounds(x, y)) this.map[y][x] = C;
      }
    }

    for (const bridge of this.bridgePoints) {
      this.ensureBridgeAccess(bridge.x, bridge.y, roadY);
    }
  }

  setupCompanions() {
    this.mage = {
      mana: 8,
      maxMana: 8,
      regen: 0.22,
      cooldown: 0,
      recoveryDelay: 0,
      beamCost: 1,
      beamRecoveryDelay: 2.8,
    };

    this.priest = {
      mana: 8,
      maxMana: 8,
      regen: 0.18,
      cooldown: 0,
      recoveryDelay: 0,
      healCost: 2,
      healAmount: 2,
      healThreshold: 6,
      healRecoveryDelay: 3.8,
    };
  }

  resetWorldState() {
    this.worldEffects = [];
    this.worldMap = [];
    this.angelEventTimer = Phaser.Math.FloatBetween(8, 13);
    this.devilEventTimer = Phaser.Math.FloatBetween(10, 16);
  }

  ensureBridgeAccess(bridgeX, bridgeY, roadY) {
    const minY = Math.max(1, Math.min(bridgeY, roadY) - 1);
    const maxY = Math.min(this.mapH - 2, Math.max(bridgeY, roadY) + 1);

    for (let y = minY; y <= maxY; y++) {
      if (this.inBounds(bridgeX - 1, y) && this.map[y][bridgeX - 1] !== this.TILES.CASTLE) this.map[y][bridgeX - 1] = this.TILES.FLOOR;
      if (this.inBounds(bridgeX + 1, y) && this.map[y][bridgeX + 1] !== this.TILES.CASTLE) this.map[y][bridgeX + 1] = this.TILES.FLOOR;
    }

    for (let y = bridgeY - 1; y <= bridgeY + 1; y++) {
      for (let x = bridgeX - 1; x <= bridgeX + 1; x++) {
        if (!this.inBounds(x, y) || this.map[y][x] === this.TILES.CASTLE) continue;
        this.map[y][x] = x === bridgeX ? this.TILES.BRIDGE : this.TILES.FLOOR;
      }
    }
  }

  spawnEntities() {
    const stageBoost = Math.max(0, this.stage - 1);

    for (let i = 0; i < 8 + this.stage; i++) {
      const p = this.findFreeTile(5, this.mapW - 10);
      if (p) this.enemies.push({ type: "scout", x: p.x, y: p.y, hp: 1, maxHp: 1, power: 2 + Math.floor(stageBoost / 3), color: this.colors.scout });
    }

    for (let i = 0; i < 10 + this.stage * 2; i++) {
      const p = this.findFreeTile(8, this.mapW - 8);
      if (p) this.enemies.push({ type: "soldier", x: p.x, y: p.y, hp: 1, maxHp: 1, power: 3 + Math.floor(stageBoost / 3), color: this.colors.enemy });
    }

    for (let i = 0; i < 5 + this.stage; i++) {
      const p = this.findFreeTile(12, this.mapW - 7);
      if (p) this.enemies.push({ type: "knight", x: p.x, y: p.y, hp: 2, maxHp: 2, power: 5 + Math.floor(stageBoost / 2), color: this.colors.enemyKnight });
    }

    const miniCount = 2 + Math.floor(this.stage / 2);
    for (let i = 0; i < miniCount; i++) {
      const p = this.findFreeTile(this.mapW - 14, this.mapW - 8, true);
      if (p) this.enemies.push({ type: "miniboss", x: p.x, y: p.y, hp: 4 + stageBoost, maxHp: 4 + stageBoost, power: 7 + stageBoost, color: 0xab47bc, size: 2 });
    }

    const bossPos = this.findFreeRect(this.mapW - 5, this.roadY - 2, 4, 4, true) || { x: this.mapW - 5, y: this.roadY - 2 };
    this.enemies.push({
      type: "finalBoss",
      x: bossPos.x,
      y: bossPos.y,
      hp: 18 + stageBoost * 3,
      maxHp: 18 + stageBoost * 3,
      power: 11 + stageBoost,
      color: 0xffd54f,
      size: 4,
    });

    for (let i = 0; i < 10 + Math.floor(this.stage / 2); i++) {
      const p = this.findFreeTile(5, this.mapW - 8);
      if (p) this.prisoners.push({ x: p.x, y: p.y });
    }

    const sword = this.findFreeTile(Math.floor(this.mapW * 0.45), Math.floor(this.mapW * 0.72));
    if (sword) this.excalibur = { x: sword.x, y: sword.y, picked: false };
  }

  inBounds(x, y) {
    return x >= 0 && x < this.mapW && y >= 0 && y < this.mapH;
  }

  getEnemySize(enemy) {
    return enemy?.size ?? (enemy?.type === "finalBoss" ? 4 : enemy?.type === "miniboss" ? 2 : 1);
  }

  enemyOccupies(enemy, x, y) {
    const size = this.getEnemySize(enemy);
    return x >= enemy.x && x < enemy.x + size && y >= enemy.y && y < enemy.y + size;
  }

  findEnemyAt(x, y) {
    return this.enemies.findIndex(enemy => this.enemyOccupies(enemy, x, y));
  }

  canPlaceRect(x, y, width, height, allowCastle = false, ignoreEnemy = null) {
    for (let yy = y; yy < y + height; yy++) {
      for (let xx = x; xx < x + width; xx++) {
        if (!this.inBounds(xx, yy)) return false;
        const tile = this.getTile(xx, yy);
        const okTile = tile === this.TILES.FLOOR || tile === this.TILES.FOREST || tile === this.TILES.BRIDGE || (allowCastle && tile === this.TILES.CASTLE);
        if (!okTile) return false;
        if (this.hero.x === xx && this.hero.y === yy) return false;
        if (this.prisoners.some(p => p.x === xx && p.y === yy)) return false;
        if (this.excalibur && !this.excalibur.picked && this.excalibur.x === xx && this.excalibur.y === yy) return false;
        if (this.enemies.some(enemy => enemy !== ignoreEnemy && this.enemyOccupies(enemy, xx, yy))) return false;
      }
    }
    return true;
  }

  findFreeRect(xMin, yMin, width, height, allowCastle = false) {
    const maxX = Math.min(this.mapW - width - 1, Math.max(xMin, this.mapW - width - 1));
    const maxY = Math.min(this.mapH - height - 1, Math.max(yMin, this.mapH - height - 1));
    for (let i = 0; i < 240; i++) {
      const x = Phaser.Math.Between(xMin, maxX);
      const y = Phaser.Math.Between(Math.max(1, yMin - 1), maxY);
      if (this.canPlaceRect(x, y, width, height, allowCastle)) return { x, y };
    }
    return null;
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
      if (this.canPlaceRect(x, y, 1, 1, allowCastle)) return { x, y };
    }
    return null;
  }

  update(_time, delta) {
    const dt = Math.min(0.05, (delta || 0) / 1000);
    this.audio.update();

    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.audio.unlock();
      if (this.phase === "title") {
        this.startNewRun();
        return;
      }
      if (this.phase === "playing" || this.phase === "paused") {
        this.togglePause();
        return;
      }
      if (this.phase === "clear") {
        this.beginNextStage();
        return;
      }
      if (this.phase === "gameover") {
        this.restartCurrentStage();
        return;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.audio.unlock();
      if (this.phase === "title") this.startNewRun();
      else this.restartCurrentStage();
      return;
    }

    this.updateMagicEffects();
    this.updateCompanionRecovery(dt);

    if (this.phase !== "playing") return;

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

    this.tryPriestHeal();
    this.updateWorldEvents(dt);
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

    const enemyIndex = this.findEnemyAt(nx, ny);
    if (enemyIndex >= 0) {
      this.resolveBattle(enemyIndex, nx, ny);
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
        this.phase = "clear";
        this.stage += 1;
        this.showStageClearOverlay();
      }
      return;
    }

    this.message = "進軍中...";
  }

  resolveBattle(enemyIndex, targetX = null, targetY = null) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy) return;

    if (this.hero.hasExcalibur && ["miniboss", "finalBoss"].includes(enemy.type)) {
      this.hero.x = targetX ?? enemy.x;
      this.hero.y = targetY ?? enemy.y;
      this.removeEnemy(enemyIndex);
      this.audio?.playSfx("boss");
      this.message = enemy.type === "finalBoss" ? "エクスカリバーで龍ラスボスを撃破。" : "エクスカリバーで強敵撃破。";
      return;
    }

    const front = this.formation.length > 0 ? this.formation[0] : { type: "hero" };
    const player = (front.type === "knight" ? rand(3, 8) : front.type === "soldier" ? rand(1, 6) : rand(4, 9)) + 2;
    const foe = rand(1, 6) + enemy.power;
    this.audio?.playSfx("attack");

    if (player >= foe) {
      enemy.hp -= enemy.type === "finalBoss" ? 2 : 1;
      this.audio?.playSfx(enemy.type === "finalBoss" ? "boss" : "hit");
      if (enemy.hp <= 0) {
        this.hero.x = targetX ?? enemy.x;
        this.hero.y = targetY ?? enemy.y;
        this.removeEnemy(enemyIndex);
        this.message = enemy.type === "finalBoss" ? "龍ラスボスを撃破しました。" : `${enemy.type} を撃破しました。`;
      } else {
        this.message = enemy.type === "finalBoss" ? "龍ラスボスに傷を負わせました。" : `${enemy.type} にダメージ。`;
      }
      return;
    }

    if (this.formation.length > 0) {
      const lost = this.formation.shift();
      this.audio?.playSfx("damage");
      this.damageRegenDelay = 6;
      this.message = lost.type === "knight" ? "騎士が倒れました。" : "兵が倒れました。";
      return;
    }

    this.hero.hp -= enemy.type === "finalBoss" ? 2 : 1;
    this.damageRegenDelay = 8;
    this.audio?.playSfx("damage");
    if (this.hero.hp <= 0) {
      this.hero.hp = 0;
      this.message = "GAME OVER";
      this.phase = "gameover";
      this.showGameOverOverlay();
    } else {
      this.message = enemy.type === "finalBoss" ? "龍の一撃で王が傷つきました。" : "王が傷つきました。";
    }
  }

  removeEnemy(index) {
    const enemy = this.enemies[index];
    if (!enemy) return;

    this.score += enemy.type === "finalBoss" ? 500 : enemy.type === "miniboss" ? 180 : enemy.type === "knight" ? 35 : 10;
    this.kills += enemy.type === "finalBoss" ? 20 : enemy.type === "miniboss" ? 5 : enemy.type === "knight" ? 2 : 1;
    this.enemies.splice(index, 1);
  }

  pickupThings() {
    const pIndex = this.prisoners.findIndex(p => p.x === this.hero.x && p.y === this.hero.y);
    if (pIndex >= 0) {
      this.prisoners.splice(pIndex, 1);
      const nextCount = this.formation.length + 1;
      this.formation.push(nextCount % 3 === 0 ? { type: "knight" } : { type: "soldier" });
      this.score += 20;
      this.audio?.playSfx("pickup");
      this.message = nextCount % 3 === 0 ? "捕虜を救出。騎士が加入。" : "捕虜を救出。兵が加入。";
    }

    if (this.excalibur && !this.excalibur.picked && this.excalibur.x === this.hero.x && this.excalibur.y === this.hero.y) {
      this.excalibur.picked = true;
      this.hero.hasExcalibur = true;
      this.score += 150;
      this.audio?.playSfx("pickup");
      this.worldEffects.push({ type: "excalibur", x: this.hero.x - 1, y: this.hero.y - 1, size: 3, expiresAt: this.time.now + 1400 });
      this.message = "エクスカリバーを入手しました。聖剣がまばゆく輝いています。";
    }
  }

  castMagic() {
    if (this.mage.cooldown > 0) {
      this.message = "大魔法使いは再詠唱中です。";
      return;
    }
    if (this.mage.mana < this.mage.beamCost) {
      this.message = "大魔法使いは魔力の回復待ちです。";
      return;
    }

    const targets = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.x > this.hero.x && e.x <= this.hero.x + 8 && Math.abs(e.y - this.hero.y) <= 2) {
        targets.push({ index: i, dist: (e.x - this.hero.x) + Math.abs(e.y - this.hero.y) * 0.35 });
      }
    }

    targets.sort((a, b) => a.dist - b.dist);
    if (targets.length === 0) {
      this.message = "前方に敵がいません。";
      return;
    }

    const mageX = Math.max(1, this.hero.x - this.formation.length - 1);
    const mageY = this.hero.y;
    const target = this.enemies[targets[0].index];
    const targetPoint = { x: target.x + Math.floor(this.getEnemySize(target) / 2), y: target.y + Math.floor(this.getEnemySize(target) / 2) };

    this.spawnMagicEffect(mageX, mageY, targetPoint.x, targetPoint.y, target.type === "finalBoss" ? 0xfff59d : 0x90caf9);
    this.mage.mana = Math.max(0, this.mage.mana - this.mage.beamCost);
    this.mage.cooldown = 0.9;
    this.mage.recoveryDelay = this.mage.beamRecoveryDelay;

    target.hp -= target.type === "finalBoss" ? 3 : 2;
    this.audio?.playSfx("magic");
    if (target.hp <= 0) this.removeEnemy(targets[0].index);
    this.message = "大魔法使いが光線を放ちました。";
  }

  spawnMagicEffect(fromX, fromY, toX, toY, color) {
    this.magicEffects.push({
      fromX,
      fromY,
      toX,
      toY,
      color,
      expiresAt: this.time.now + 420,
    });
  }

  updateCompanionRecovery(dt) {
    if (!dt) return;

    this.mage.cooldown = Math.max(0, this.mage.cooldown - dt);
    this.priest.cooldown = Math.max(0, this.priest.cooldown - dt);
    this.mage.recoveryDelay = Math.max(0, this.mage.recoveryDelay - dt);
    this.priest.recoveryDelay = Math.max(0, this.priest.recoveryDelay - dt);
    this.damageRegenDelay = Math.max(0, this.damageRegenDelay - dt);

    if (this.phase !== "playing") return;

    if (this.mage.recoveryDelay <= 0) {
      this.mage.mana = Math.min(this.mage.maxMana, this.mage.mana + dt * this.mage.regen);
    }
    if (this.priest.recoveryDelay <= 0) {
      this.priest.mana = Math.min(this.priest.maxMana, this.priest.mana + dt * this.priest.regen);
    }

    if (this.hero.hp < this.hero.maxHp && this.damageRegenDelay <= 0) {
      this.passiveHealTick += dt;
      if (this.passiveHealTick >= 4) {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 1);
        this.passiveHealTick = 0;
        this.message = this.message === "進軍中..." ? "王のHPが時間経過で回復しました。" : this.message;
        this.renderAll();
        this.updateHud();
      }
    } else {
      this.passiveHealTick = 0;
    }
  }

  tryPriestHeal() {
    if (this.phase !== "playing") return;
    if (this.priest.cooldown > 0 || this.priest.mana < this.priest.healCost) return;
    if (this.hero.hp >= this.hero.maxHp) return;
    if (this.hero.hp > this.priest.healThreshold && this.hero.maxHp - this.hero.hp < this.priest.healAmount) return;

    const priestX = Math.max(1, this.hero.x - this.formation.length - 2);
    this.priest.mana = Math.max(0, this.priest.mana - this.priest.healCost);
    this.priest.cooldown = 4.5;
    this.priest.recoveryDelay = this.priest.healRecoveryDelay;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.priest.healAmount);
    this.spawnMagicEffect(priestX, this.hero.y, this.hero.x, this.hero.y, 0xfff59d);
    this.audio?.playSfx("heal");
    this.message = "僧侶が自動回復の祈りを捧げました。";
    this.renderAll();
    this.updateHud();
  }

  updateWorldEvents(dt) {
    if (this.phase !== "playing" || !dt) return;

    this.angelEventTimer -= dt;
    this.devilEventTimer -= dt;

    if (this.angelEventTimer <= 0) {
      this.triggerAngelEvent();
      this.angelEventTimer = Phaser.Math.FloatBetween(12, 20);
    }

    if (this.devilEventTimer <= 0) {
      this.triggerDevilEvent();
      this.devilEventTimer = Phaser.Math.FloatBetween(14, 22);
    }
  }

  triggerAngelEvent() {
    const area = this.findWorldEventArea(1, Math.max(2, Math.floor(this.mapW * 0.45)));
    if (!area) return;

    let purified = 0;
    for (let y = area.y; y < area.y + 4; y++) {
      for (let x = area.x; x < area.x + 4; x++) {
        if (!this.inBounds(x, y) || this.map[y][x] === this.TILES.WALL || this.map[y][x] === this.TILES.CASTLE) continue;
        this.worldMap[y][x] = this.WORLD_TILES.LIGHT;
        if (this.map[y][x] === this.TILES.MOUNTAIN || this.map[y][x] === this.TILES.FOREST) this.map[y][x] = this.TILES.FLOOR;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (["miniboss", "finalBoss"].includes(enemy.type)) continue;
      if (enemy.x >= area.x && enemy.x < area.x + 4 && enemy.y >= area.y && enemy.y < area.y + 4) {
        this.removeEnemy(i);
        purified += 1;
      }
    }

    this.worldEffects.push({ type: "angel", ...area, size: 4, expiresAt: this.time.now + 3200 });
    this.message = purified > 0
      ? `天使が降臨し、${purified}体の敵を浄化しました。`
      : "天使が降臨し、4x4 の地を光の世界へ浄化しました。";
    this.renderAll();
    this.updateHud();
  }

  triggerDevilEvent() {
    const area = this.findWorldEventArea(Math.max(2, Math.floor(this.mapW * 0.55)), this.mapW - 5);
    if (!area) return;

    let spawnCount = 0;
    for (let y = area.y; y < area.y + 4; y++) {
      for (let x = area.x; x < area.x + 4; x++) {
        if (!this.inBounds(x, y) || this.map[y][x] === this.TILES.WALL || this.map[y][x] === this.TILES.CASTLE) continue;
        this.worldMap[y][x] = this.WORLD_TILES.DARK;
        if (this.map[y][x] === this.TILES.FOREST) this.map[y][x] = this.TILES.FLOOR;

        if (
          spawnCount < 2 &&
          this.getTile(x, y) !== this.TILES.WATER &&
          !(this.hero.x === x && this.hero.y === y) &&
          !this.prisoners.some(p => p.x === x && p.y === y) &&
          !this.enemies.some(e => this.enemyOccupies(e, x, y)) &&
          Math.random() < 0.2
        ) {
          const type = Math.random() < 0.5 ? "scout" : "soldier";
          this.enemies.push({
            type,
            x,
            y,
            hp: 1,
            maxHp: 1,
            power: 3 + Math.floor(this.stage / 3),
            color: type === "scout" ? this.colors.scout : this.colors.enemy,
          });
          spawnCount += 1;
        }
      }
    }

    this.worldEffects.push({ type: "devil", ...area, size: 4, expiresAt: this.time.now + 3200 });
    this.message = spawnCount > 0
      ? `悪魔が降臨し、4x4 の地を闇へ堕としました。闇の軍勢が ${spawnCount} 体出現。`
      : "悪魔が降臨し、4x4 の地を闇の世界へ堕落させました。";
    this.renderAll();
    this.updateHud();
  }

  findWorldEventArea(xMin, xMax) {
    for (let tries = 0; tries < 100; tries++) {
      const x = Phaser.Math.Between(xMin, Math.max(xMin, xMax));
      const y = Phaser.Math.Between(1, this.mapH - 5);
      let blocked = false;

      for (let yy = y; yy < y + 4 && !blocked; yy++) {
        for (let xx = x; xx < x + 4; xx++) {
          if (!this.inBounds(xx, yy)) {
            blocked = true;
            break;
          }
          if (this.map[yy][xx] === this.TILES.WALL || this.map[yy][xx] === this.TILES.CASTLE) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) return { x, y };
    }
    return null;
  }

  updateMagicEffects() {
    if (!this.magicEffects.length) return;

    const before = this.magicEffects.length;
    this.magicEffects = this.magicEffects.filter(effect => effect.expiresAt > this.time.now);

    if (this.magicEffects.length !== before) {
      this.renderAll();
      this.updateHud();
    }
  }

  moveEnemies() {
    if (this.phase !== "playing") return;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const size = this.getEnemySize(e);

      if (e.type === "finalBoss") {
        const heroNearX = this.hero.x >= e.x - 1 && this.hero.x <= e.x + size;
        const heroNearY = this.hero.y >= e.y - 1 && this.hero.y <= e.y + size;
        if (heroNearX && heroNearY) {
          this.hero.hp = Math.max(0, this.hero.hp - 2);
          this.damageRegenDelay = 8;
          this.audio?.playSfx("boss");
          if (this.hero.hp <= 0) {
            this.message = "龍ラスボスのブレスでGAME OVER";
            this.phase = "gameover";
            this.showGameOverOverlay();
          } else {
            this.message = "龍ラスボスのブレスを受けました。";
          }
        }
        continue;
      }

      if (size > 1) continue;

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
          this.resolveBattle(i, c.x, c.y);
          break;
        }

        if (!this.canPlaceRect(c.x, c.y, 1, 1, false, e)) continue;
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

    if (tile === this.TILES.FOREST) {
      this.mapGraphics.fillStyle(0x244d34, 0.9);
      this.mapGraphics.fillTriangle(px + 4, py + 18, px + 12, py + 4, px + 20, py + 18);
      this.mapGraphics.fillStyle(0x4a7d53, 0.95);
      this.mapGraphics.fillTriangle(px + 2, py + 22, px + 8, py + 10, px + 14, py + 22);
    }

    if (tile === this.TILES.WATER) {
      this.mapGraphics.lineStyle(2, 0x9cc7b2, 0.4);
      this.mapGraphics.beginPath();
      this.mapGraphics.moveTo(px + 2, py + 8);
      this.mapGraphics.lineTo(px + 9, py + 6);
      this.mapGraphics.lineTo(px + 15, py + 8);
      this.mapGraphics.lineTo(px + 22, py + 6);
      this.mapGraphics.strokePath();
    }

    if (tile === this.TILES.MOUNTAIN) {
      this.mapGraphics.fillStyle(0x74755c, 0.9);
      this.mapGraphics.fillTriangle(px + 2, py + 22, px + 10, py + 6, px + 18, py + 22);
      this.mapGraphics.fillStyle(0xa4a58a, 0.72);
      this.mapGraphics.fillTriangle(px + 8, py + 22, px + 16, py + 8, px + 22, py + 22);
    }

    if (tile === this.TILES.CASTLE) {
      this.mapGraphics.fillStyle(0x8f7446, 1);
      this.mapGraphics.fillRect(px + 3, py + 7, 18, 10);
      this.mapGraphics.fillStyle(0x47351d, 1);
      this.mapGraphics.fillRect(px + 4, py + 5, 4, 4);
      this.mapGraphics.fillRect(px + 10, py + 3, 4, 6);
      this.mapGraphics.fillRect(px + 16, py + 5, 4, 4);
      this.mapGraphics.fillRect(px + 9, py + 12, 6, 7);
    }

    const worldTile = this.worldMap?.[y]?.[x] ?? this.WORLD_TILES.NONE;
    if (worldTile === this.WORLD_TILES.LIGHT) {
      this.mapGraphics.fillStyle(0xf2deb0, 0.22);
      this.mapGraphics.fillRect(px, py, this.tileSize, this.tileSize);
      this.mapGraphics.fillStyle(0xfaf3df, 0.68);
      this.mapGraphics.fillCircle(px + 7, py + 7, 2);
      this.mapGraphics.fillCircle(px + 16, py + 11, 1.5);
    } else if (worldTile === this.WORLD_TILES.DARK) {
      this.mapGraphics.fillStyle(0x2d2316, 0.36);
      this.mapGraphics.fillRect(px, py, this.tileSize, this.tileSize);
      this.mapGraphics.fillStyle(0x87683d, 0.5);
      this.mapGraphics.fillCircle(px + 8, py + 16, 2);
      this.mapGraphics.fillCircle(px + 17, py + 8, 1.5);
    }
  }

  drawSword(px, py, scale = 1, color = 0xffd54f) {
    this.unitGraphics.fillStyle(0xd7ddd8, 1);
    this.unitGraphics.fillRect(px + 10 * scale, py + 3 * scale, 2 * scale, 10 * scale);
    this.unitGraphics.fillStyle(color, 1);
    this.unitGraphics.fillTriangle(px + 8 * scale, py + 5 * scale, px + 14 * scale, py + 5 * scale, px + 11 * scale, py + 1 * scale);
    this.unitGraphics.fillRect(px + 7 * scale, py + 11 * scale, 8 * scale, 2 * scale);
  }

  drawCharacter(x, y, kind, size = 1, extras = {}) {
    const px = x * this.tileSize;
    const py = y * this.tileSize;
    const unit = this.tileSize * size;

    this.unitGraphics.fillStyle(0x000000, 0.3);
    this.unitGraphics.fillEllipse(px + unit / 2, py + unit - 2, unit - 6, 6);

    if (kind === "finalBoss") {
      this.unitGraphics.fillStyle(0x244737, 0.95);
      this.unitGraphics.fillEllipse(px + unit / 2, py + unit - 10, unit - 8, 18);
      this.unitGraphics.fillStyle(0x5c947c, 0.98);
      this.unitGraphics.fillRoundedRect(px + 14, py + 18, unit - 28, unit - 34, 18);
      this.unitGraphics.fillTriangle(px + 18, py + unit - 26, px + 2, py + unit - 8, px + 22, py + unit - 10);
      this.unitGraphics.fillTriangle(px + unit - 18, py + unit - 26, px + unit - 2, py + unit - 8, px + unit - 22, py + unit - 10);
      this.unitGraphics.fillStyle(0xa5c989, 1);
      this.unitGraphics.fillTriangle(px + 14, py + 32, px + unit / 2, py + 6, px + unit - 14, py + 32);
      this.unitGraphics.fillTriangle(px + 8, py + 44, px + unit / 2 - 10, py + 18, px + unit / 2 - 2, py + 50);
      this.unitGraphics.fillTriangle(px + unit - 8, py + 44, px + unit / 2 + 10, py + 18, px + unit / 2 + 2, py + 50);
      this.unitGraphics.fillStyle(0xe6f0dc, 1);
      this.unitGraphics.fillCircle(px + unit / 2, py + 28, 13);
      this.unitGraphics.fillStyle(0xffcf6e, 1);
      this.unitGraphics.fillCircle(px + unit / 2 - 8, py + 26, 3.5);
      this.unitGraphics.fillCircle(px + unit / 2 + 8, py + 26, 3.5);
      this.unitGraphics.fillStyle(0xdba84f, 0.95);
      this.unitGraphics.fillTriangle(px + unit / 2 - 8, py + 37, px + unit / 2 + 8, py + 37, px + unit / 2, py + 52);
      this.unitGraphics.fillStyle(0xf6deb0, 0.8);
      this.unitGraphics.fillTriangle(px + unit / 2 - 6, py + 40, px + unit / 2 + 6, py + 40, px + unit / 2, py + 58);
      return;
    }

    if (kind === "miniboss") {
      this.unitGraphics.fillStyle(0x5a3b2a, 0.94);
      this.unitGraphics.fillRoundedRect(px + 4, py + 7, unit - 8, unit - 11, 8);
      this.unitGraphics.fillStyle(0xc9b07b, 1);
      this.unitGraphics.fillCircle(px + unit / 2, py + 14, 7);
      this.unitGraphics.fillStyle(0x24140d, 1);
      this.unitGraphics.fillTriangle(px + 8, py + 10, px + 14, py + 1, px + 17, py + 12);
      this.unitGraphics.fillTriangle(px + unit - 8, py + 10, px + unit - 14, py + 1, px + unit - 17, py + 12);
      return;
    }

    const base = {
      hero: { body: 0xd7b15b, cape: 0x7d4121, accent: 0xf2d27e },
      soldier: { body: 0x527b4f, cape: 0x274431, accent: 0xc8d8b8 },
      knight: { body: 0x718853, cape: 0x354b28, accent: 0xdeebbc },
      mage: { body: 0x45646b, cape: 0x243c41, accent: 0xb7d7d5 },
      priest: { body: 0xcabda5, cape: 0x6f5a41, accent: 0xf3e7b0 },
      scout: { body: 0xc96b4b, cape: 0x733321, accent: 0x2c1e15 },
      enemySoldier: { body: 0xa84634, cape: 0x6a2319, accent: 0x425046 },
      enemyKnight: { body: 0xbd6a4d, cape: 0x5b2a1c, accent: 0x2c1e15 },
      prisoner: { body: 0x6aaea4, cape: 0x2c5f57, accent: 0xe1f3ec },
      excalibur: { body: 0xe0c063, cape: 0xf6edd2, accent: 0x8fc8bb },
    }[kind];

    const headX = px + 12;
    const headY = py + 8;
    const bodyX = px + 7;
    const bodyY = py + 13;

    if (kind === "excalibur") {
      this.drawSword(px, py + 2, 1, 0xe0c063);
      this.unitGraphics.fillStyle(0xf3e7b0, 0.8);
      this.unitGraphics.fillCircle(px + 11, py + 6, 4);
      return;
    }

    this.unitGraphics.fillStyle(base.cape, 0.95);
    this.unitGraphics.fillTriangle(px + 6, py + 23, px + 12, py + 10, px + 18, py + 23);

    this.unitGraphics.fillStyle(base.body, 1);
    this.unitGraphics.fillCircle(headX, headY, 5);
    this.unitGraphics.fillRoundedRect(bodyX, bodyY, 10, 8, 3);
    this.unitGraphics.fillRect(px + 8, py + 21, 3, 3);
    this.unitGraphics.fillRect(px + 13, py + 21, 3, 3);

    if (kind === "hero") {
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillTriangle(px + 7, py + 6, px + 11, py + 1, px + 13, py + 6);
      this.unitGraphics.fillTriangle(px + 11, py + 6, px + 15, py + 1, px + 17, py + 6);
      this.unitGraphics.fillStyle(0x8f6a45, 1);
      this.unitGraphics.fillRect(px + 16, py + 13, 2, 9);
      if (extras.hasExcalibur) this.drawSword(px + 7, py + 1, 0.9, 0xe0c063);
    }

    if (kind === "soldier") {
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillRect(px + 7, py + 3, 10, 4);
      this.unitGraphics.fillStyle(0xb6b4a1, 1);
      this.unitGraphics.fillRect(px + 4, py + 15, 3, 6);
      this.unitGraphics.fillRoundedRect(px + 16, py + 14, 4, 6, 2);
    }

    if (kind === "knight") {
      this.unitGraphics.fillStyle(0xcdd6c7, 1);
      this.unitGraphics.fillRect(px + 6, py + 3, 12, 5);
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillTriangle(px + 14, py + 3, px + 20, py + 8, px + 14, py + 10);
      this.unitGraphics.fillStyle(0x8f6a45, 1);
      this.unitGraphics.fillRect(px + 17, py + 12, 2, 10);
    }

    if (kind === "mage") {
      this.unitGraphics.fillStyle(base.cape, 1);
      this.unitGraphics.fillTriangle(px + 5, py + 13, px + 12, py + 2, px + 19, py + 13);
      this.unitGraphics.fillStyle(0x6f5a41, 1);
      this.unitGraphics.fillRect(px + 17, py + 10, 2, 11);
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillCircle(px + 18, py + 9, 3);
    }

    if (kind === "priest") {
      this.unitGraphics.fillStyle(0xfaf3df, 1);
      this.unitGraphics.fillRect(px + 10, py + 14, 2, 8);
      this.unitGraphics.fillRect(px + 7, py + 17, 8, 2);
      this.unitGraphics.fillStyle(base.cape, 1);
      this.unitGraphics.fillRect(px + 4, py + 13, 2, 9);
    }

    if (kind === "scout") {
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillRect(px + 6, py + 5, 11, 2);
      this.unitGraphics.fillStyle(0x8f6a45, 1);
      this.unitGraphics.fillRect(px + 16, py + 15, 2, 7);
      this.unitGraphics.fillStyle(0xe2e0d1, 1);
      this.unitGraphics.fillTriangle(px + 18, py + 14, px + 22, py + 17, px + 18, py + 19);
    }

    if (kind === "enemySoldier") {
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillRect(px + 6, py + 4, 12, 4);
      this.unitGraphics.fillTriangle(px + 6, py + 5, px + 3, py + 10, px + 8, py + 9);
      this.unitGraphics.fillTriangle(px + 18, py + 5, px + 21, py + 10, px + 16, py + 9);
      this.unitGraphics.fillStyle(0x425046, 1);
      this.unitGraphics.fillRoundedRect(px + 4, py + 15, 4, 6, 2);
    }

    if (kind === "enemyKnight") {
      this.unitGraphics.fillStyle(0xcdd6c7, 1);
      this.unitGraphics.fillRect(px + 6, py + 3, 12, 5);
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillTriangle(px + 9, py + 2, px + 12, py - 1, px + 15, py + 2);
      this.unitGraphics.fillTriangle(px + 13, py + 2, px + 16, py - 1, px + 19, py + 2);
      this.unitGraphics.fillStyle(0x5c4632, 1);
      this.unitGraphics.fillRect(px + 17, py + 11, 2, 11);
    }

    if (kind === "prisoner") {
      this.unitGraphics.fillStyle(base.accent, 1);
      this.unitGraphics.fillRect(px + 8, py + 14, 2, 8);
      this.unitGraphics.fillRect(px + 14, py + 14, 2, 8);
      this.unitGraphics.fillStyle(0xfaf3df, 0.6);
      this.unitGraphics.fillRect(px + 6, py + 15, 12, 2);
      this.unitGraphics.fillRect(px + 6, py + 19, 12, 2);
    }
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
      for (let x = 0; x < this.mapW; x++) this.drawTile(x, y, this.map[y][x]);
    }

    if (this.excalibur && !this.excalibur.picked) this.drawCharacter(this.excalibur.x, this.excalibur.y, "excalibur");
    for (const p of this.prisoners) this.drawCharacter(p.x, p.y, "prisoner");

    for (const e of this.enemies) {
      if (e.type === "miniboss") this.drawCharacter(e.x, e.y, "miniboss", 2);
      else if (e.type === "finalBoss") this.drawCharacter(e.x, e.y, "finalBoss", 4);
      else if (e.type === "scout") this.drawCharacter(e.x, e.y, "scout");
      else if (e.type === "soldier") this.drawCharacter(e.x, e.y, "enemySoldier");
      else if (e.type === "knight") this.drawCharacter(e.x, e.y, "enemyKnight");

      if (["miniboss", "finalBoss"].includes(e.type)) {
        const size = this.getEnemySize(e);
        this.drawBar(
          e.x * this.tileSize + 2,
          e.y * this.tileSize - 5,
          this.tileSize * size - 4,
          4,
          e.hp,
          e.maxHp ?? e.hp,
          e.type === "finalBoss" ? 0xe0c063 : 0xc9b07b
        );
      }
    }

    const priestX = Math.max(1, this.hero.x - this.formation.length - 2);
    const mageX = Math.max(1, this.hero.x - this.formation.length - 1);
    this.drawCharacter(priestX, this.hero.y, "priest");
    this.drawCharacter(mageX, this.hero.y, "mage");

    const beforeEffects = this.worldEffects.length;
    this.worldEffects = this.worldEffects.filter(effect => effect.expiresAt > this.time.now);
    if (beforeEffects !== this.worldEffects.length) {
      this.updateHud();
    }

    for (const effect of this.worldEffects) {
      const life = effect.type === "excalibur" ? 1400 : 3200;
      const age = Phaser.Math.Clamp((effect.expiresAt - this.time.now) / life, 0, 1);
      const color = effect.type === "angel" ? 0xf3e7b0 : effect.type === "excalibur" ? 0xe0c063 : 0xc9b07b;
      const px = effect.x * this.tileSize;
      const py = effect.y * this.tileSize;
      const size = effect.size * this.tileSize;

      this.unitGraphics.lineStyle(2 + age * 2, color, 0.35 + age * 0.35);
      this.unitGraphics.strokeRect(px, py, size, size);
      this.unitGraphics.fillStyle(color, 0.08 + age * 0.08);
      this.unitGraphics.fillRect(px, py, size, size);
      this.unitGraphics.fillStyle(0xfaf3df, 0.7);
      if (effect.type === "angel") {
        this.unitGraphics.fillCircle(px + 12, py + 10, 5);
        this.unitGraphics.fillTriangle(px + 4, py + 18, px + 12, py + 7, px + 20, py + 18);
      } else if (effect.type === "excalibur") {
        this.drawSword(px + size / 2 - 12, py + size / 2 - 20, 1.2 + age * 0.5, 0xe0c063);
        this.unitGraphics.fillStyle(0xf6edd2, 0.45 + age * 0.3);
        this.unitGraphics.fillCircle(px + size / 2, py + size / 2, 16 + age * 18);
      } else {
        this.unitGraphics.fillCircle(px + 12, py + 10, 5);
        this.unitGraphics.fillTriangle(px + 6, py + 6, px + 10, py + 0, px + 12, py + 8);
        this.unitGraphics.fillTriangle(px + 18, py + 6, px + 14, py + 0, px + 12, py + 8);
      }
    }

    for (const effect of this.magicEffects) {
      const age = Phaser.Math.Clamp((effect.expiresAt - this.time.now) / 420, 0, 1);
      const sx = effect.fromX * this.tileSize + this.tileSize * 0.75;
      const sy = effect.fromY * this.tileSize + this.tileSize * 0.38;
      const tx = effect.toX * this.tileSize + this.tileSize * 0.5;
      const ty = effect.toY * this.tileSize + this.tileSize * 0.5;
      const width = 4 + age * 6;

      this.unitGraphics.lineStyle(width + 2, 0xfaf3df, 0.2 + age * 0.2);
      this.unitGraphics.beginPath();
      this.unitGraphics.moveTo(sx, sy);
      this.unitGraphics.lineTo(tx, ty);
      this.unitGraphics.strokePath();

      this.unitGraphics.lineStyle(width, effect.color, 0.65 + age * 0.3);
      this.unitGraphics.beginPath();
      this.unitGraphics.moveTo(sx, sy);
      this.unitGraphics.lineTo((sx + tx) / 2, ((sy + ty) / 2) - 5);
      this.unitGraphics.lineTo(tx, ty);
      this.unitGraphics.strokePath();

      this.unitGraphics.fillStyle(effect.color, 0.25 + age * 0.5);
      this.unitGraphics.fillCircle(tx, ty, 8 + age * 8);
      this.unitGraphics.fillStyle(0xffffff, 0.35 + age * 0.45);
      this.unitGraphics.fillCircle((sx + tx) / 2, (sy + ty) / 2, 3 + age * 3);
    }

    let fx = this.hero.x;
    for (let i = 0; i < this.formation.length; i++) {
      fx--;
      if (!this.inBounds(fx, this.hero.y)) break;
      this.drawCharacter(fx, this.hero.y, this.formation[i].type === "knight" ? "knight" : "soldier");
    }

    this.drawCharacter(this.hero.x, this.hero.y, "hero", 1, { hasExcalibur: this.hero.hasExcalibur });
    this.drawBar(this.hero.x * this.tileSize + 2, this.hero.y * this.tileSize - 5, this.tileSize - 4, 4, this.hero.hp, this.hero.maxHp, 0x81c784);

    this.mageMpText.setPosition(mageX * this.tileSize - 4, this.hero.y * this.tileSize - 18);
    this.mageMpText.setText(`大魔法使い MP ${Math.floor(this.mage?.mana ?? 0)}/${this.mage?.maxMana ?? 0}`);
  }

  updateHud() {
    const soldiers = this.formation?.filter(u => u.type === "soldier").length ?? 0;
    const knights = this.formation?.filter(u => u.type === "knight").length ?? 0;
    const phaseLabel = this.phase === "title"
      ? "出撃前"
      : this.phase === "clear"
        ? "ステージクリア"
        : this.phase === "gameover"
          ? "敗北"
          : this.phase === "paused"
            ? "一時停止"
            : "進軍中";

    this.syncDomButtons();
    this.infoText.setText(`状態 ${phaseLabel}  STAGE ${this.stage}  SCORE ${this.score}  HP ${this.hero?.hp ?? 8}/${this.hero?.maxHp ?? 8}  兵 ${soldiers}  騎士 ${knights}  魔 ${Math.floor(this.mage?.mana ?? 0)}/${this.mage?.maxMana ?? 0}  僧 ${Math.floor(this.priest?.mana ?? 0)}/${this.priest?.maxMana ?? 0}  聖剣 ${this.hero?.hasExcalibur ? "有" : "無"}  自然回復 ${this.damageRegenDelay > 0 ? "待機中" : "有効"}`);
    this.messageText.setText(this.message);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 768,
  height: 576,
  backgroundColor: "#08100c",
  parent: "game-container",
  scene: [MainScene],
};

new Phaser.Game(config);
