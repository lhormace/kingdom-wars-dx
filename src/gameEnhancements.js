const LIBRARIES = {
  babylon: "./vendor/babylon.js",
  pixi: "./vendor/pixi.min.js",
  phina: "./vendor/phina.min.js",
  enchant: "./vendor/enchant.js",
  kiwi: "./vendor/kiwi.min.js",
};

const scriptCache = new Map();
const versionToken = new URLSearchParams(window.location.search).get("v");

function withVersionParam(src) {
  if (!versionToken) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(versionToken)}`;
}

function loadScript(src) {
  const resolvedSrc = withVersionParam(src);
  if (scriptCache.has(resolvedSrc)) return scriptCache.get(resolvedSrc);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = resolvedSrc;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptCache.delete(resolvedSrc);
      reject(new Error(`Failed to load ${resolvedSrc}`));
    };
    document.head.appendChild(script);
  });

  scriptCache.set(resolvedSrc, promise);
  return promise;
}

function setFallback(holder, message) {
  holder.textContent = message;
  holder.style.display = "grid";
  holder.style.placeItems = "center";
  holder.style.minHeight = "108px";
  holder.style.padding = "12px";
  holder.style.color = "#d5c8a6";
  holder.style.fontSize = "0.88rem";
  holder.style.lineHeight = "1.6";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function defaultSnapshot() {
  return {
    phase: "title",
    stage: 1,
    score: 0,
    kills: 0,
    enemyCount: 0,
    prisonerCount: 0,
    soldierCount: 0,
    knightCount: 0,
    heroHp: 8,
    heroMaxHp: 8,
    mageMana: 0,
    mageMaxMana: 0,
    priestMana: 0,
    priestMaxMana: 0,
    hasExcalibur: false,
    message: "王国軍、出撃準備中",
  };
}

function createCanvasHolder(target, width = 260, height = 108) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = "100%";
  canvas.style.height = `${height}px`;
  target.appendChild(canvas);
  return canvas;
}

async function mountBabylon(target) {
  await loadScript(LIBRARIES.babylon);

  const canvas = createCanvasHolder(target);
  const engine = new window.BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new window.BABYLON.Scene(engine);
  scene.clearColor = new window.BABYLON.Color4(0.03, 0.07, 0.05, 1);

  const camera = new window.BABYLON.ArcRotateCamera("war-camera", Math.PI / 2, Math.PI / 2.4, 5.5, new window.BABYLON.Vector3(0, 0, 0), scene);
  camera.inputs.clear();
  const light = new window.BABYLON.HemisphericLight("war-light", new window.BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.9;
  const mesh = window.BABYLON.MeshBuilder.CreateTorusKnot("war-knot", {
    radius: 0.9,
    tube: 0.22,
    radialSegments: 64,
    tubularSegments: 12,
    p: 2,
    q: 3,
  }, scene);
  const material = new window.BABYLON.StandardMaterial("war-mat", scene);
  material.diffuseColor = new window.BABYLON.Color3(0.63, 0.48, 0.22);
  material.emissiveColor = new window.BABYLON.Color3(0.08, 0.16, 0.1);
  mesh.material = material;

  let snapshot = defaultSnapshot();
  scene.registerBeforeRender(() => {
    const enemyPulse = clamp(snapshot.enemyCount / 24, 0.2, 1.25);
    mesh.rotation.x += 0.004 + enemyPulse * 0.008;
    mesh.rotation.y += 0.01 + snapshot.stage * 0.0018;
    material.emissiveColor = snapshot.hasExcalibur
      ? new window.BABYLON.Color3(0.34, 0.24, 0.08)
      : new window.BABYLON.Color3(0.05 + enemyPulse * 0.08, 0.12, 0.08);
  });

  engine.runRenderLoop(() => scene.render());

  return {
    update(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    destroy() {
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}

async function mountPixi(target) {
  await loadScript(LIBRARIES.pixi);

  const pixi = window.PIXI ?? globalThis.PIXI ?? (typeof PIXI !== "undefined" ? PIXI : null);
  if (!pixi?.Application || !pixi?.Graphics) {
    throw new Error("PixiJS unavailable");
  }

  const app = new pixi.Application();
  if (typeof app.init === "function") {
    await app.init({
      width: 260,
      height: 108,
      backgroundColor: 0x08100c,
      antialias: true,
    });
  }

  const view = app.canvas ?? app.view;
  if (!view) throw new Error("PixiJS view unavailable");
  if (typeof app.init !== "function") {
    app.renderer.resize(260, 108);
    app.renderer.background.color = 0x08100c;
  }

  target.appendChild(view);
  const background = new pixi.Graphics();
  const pressureBar = new pixi.Graphics();
  const moraleBar = new pixi.Graphics();
  const crown = new pixi.Graphics();
  app.stage.addChild(background, pressureBar, moraleBar, crown);

  let snapshot = defaultSnapshot();
  let pressure = 0.25;
  let morale = 0.5;

  app.ticker.add(() => {
    const targetPressure = clamp(snapshot.enemyCount / 24, 0.08, 1);
    const targetMorale = clamp(((snapshot.heroHp / Math.max(1, snapshot.heroMaxHp)) * 0.55) + (((snapshot.soldierCount + snapshot.knightCount * 2) / 10) * 0.45), 0.08, 1);
    pressure += (targetPressure - pressure) * 0.08;
    morale += (targetMorale - morale) * 0.08;

    background.clear();
    background.beginFill(0x0b1510);
    background.drawRoundedRect(0, 0, 260, 108, 16);
    background.endFill();

    pressureBar.clear();
    pressureBar.beginFill(0x3b1f18);
    pressureBar.drawRoundedRect(16, 20, 228, 18, 9);
    pressureBar.endFill();
    pressureBar.beginFill(0xa84f33);
    pressureBar.drawRoundedRect(16, 20, 228 * pressure, 18, 9);
    pressureBar.endFill();

    moraleBar.clear();
    moraleBar.beginFill(0x153425);
    moraleBar.drawRoundedRect(16, 68, 228, 18, 9);
    moraleBar.endFill();
    moraleBar.beginFill(snapshot.hasExcalibur ? 0xe0c063 : 0x77a77d);
    moraleBar.drawRoundedRect(16, 68, 228 * morale, 18, 9);
    moraleBar.endFill();

    crown.clear();
    crown.beginFill(snapshot.hasExcalibur ? 0xf1d27d : 0xc7d5c2);
    crown.drawPolygon([0, 14, 8, 0, 16, 14, 24, 0, 32, 14, 32, 24, 0, 24]);
    crown.endFill();
    crown.x = 16 + 196 * morale;
    crown.y = 41 + Math.sin(app.ticker.lastTime * 0.008) * 2;
  });

  return {
    update(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    destroy() {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    },
  };
}

async function mountPhina(target) {
  await loadScript(LIBRARIES.phina);

  const canvasId = `war-phina-${Date.now()}`;
  const canvas = createCanvasHolder(target);
  canvas.id = canvasId;

  const app = window.phina.display.CanvasApp({
    query: `#${canvasId}`,
    width: 260,
    height: 108,
    append: false,
  });
  const scene = window.phina.display.DisplayScene({ width: 260, height: 108 });
  const core = window.phina.display.CircleShape({
    radius: 18,
    fill: "#d2b16f",
    stroke: "#eadfc4",
    strokeWidth: 3,
  }).addChildTo(scene);
  const aura = window.phina.display.CircleShape({
    radius: 36,
    fill: "transparent",
    stroke: "#6fa67d",
    strokeWidth: 2,
  }).addChildTo(scene);

  let snapshot = defaultSnapshot();
  scene.update = function update() {
    const hpRate = snapshot.heroHp / Math.max(1, snapshot.heroMaxHp);
    const armyWeight = clamp((snapshot.soldierCount + snapshot.knightCount * 1.7) / 8, 0.4, 1.6);
    core.x = 130 + Math.sin(scene.frame * 0.05) * 54;
    core.y = 54 + Math.cos(scene.frame * 0.07) * 16;
    core.scaleX = 0.7 + hpRate * 0.5;
    core.scaleY = core.scaleX;
    aura.x = core.x;
    aura.y = core.y;
    aura.scaleX = 0.85 + Math.sin(scene.frame * 0.04) * 0.1 + armyWeight * 0.25;
    aura.scaleY = aura.scaleX;
    core.fill = snapshot.hasExcalibur ? "#f2d07c" : hpRate < 0.4 ? "#c07256" : "#d2b16f";
    aura.stroke = snapshot.phase === "paused" ? "#9cc7b2" : "#6fa67d";
  };

  app.replaceScene(scene);
  app.run();

  return {
    update(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    destroy() {
      app.stop();
      target.textContent = "";
    },
  };
}

async function mountEnchant(target) {
  await loadScript(LIBRARIES.enchant);
  if (typeof window.enchant !== "function") throw new Error("enchant unavailable");

  window.enchant();
  const holder = document.createElement("div");
  target.appendChild(holder);

  const CoreClass = window.Core || window.enchant?.Core;
  const SpriteClass = window.Sprite || window.enchant?.Sprite;
  const SurfaceClass = window.Surface || window.enchant?.Surface;
  if (!CoreClass || !SpriteClass || !SurfaceClass) throw new Error("enchant classes unavailable");

  const game = new CoreClass(260, 108);
  game.fps = 24;

  let snapshot = defaultSnapshot();
  let runner = null;
  let escort = null;
  let sword = null;

  game.onload = () => {
    game.rootScene.backgroundColor = "#08100c";

    const createSprite = (color, width, height) => {
      const sprite = new SpriteClass(width, height);
      const surface = new SurfaceClass(width, height);
      surface.context.fillStyle = color;
      surface.context.fillRect(0, 0, width, height);
      sprite.image = surface;
      return sprite;
    };

    runner = createSprite("#d2b16f", 22, 22);
    escort = createSprite("#77a77d", 14, 14);
    sword = createSprite("#f2e6b1", 6, 24);
    game.rootScene.addChild(runner);
    game.rootScene.addChild(escort);
    game.rootScene.addChild(sword);

    game.rootScene.addEventListener("enterframe", () => {
      if (!runner || !escort || !sword) return;
      const rescueRate = clamp(snapshot.prisonerCount / 12, 0.05, 1);
      const armyRate = clamp((snapshot.soldierCount + snapshot.knightCount) / 10, 0.05, 1);
      runner.x = 18 + (game.frame * (1.2 + rescueRate * 1.8)) % 190;
      runner.y = 38 + Math.sin(game.frame * 0.18) * 16;
      escort.x = 28 + (game.frame * (0.9 + armyRate * 1.4)) % 180;
      escort.y = 70 + Math.cos(game.frame * 0.16) * 10;
      sword.visible = snapshot.hasExcalibur;
      sword.x = runner.x + 8;
      sword.y = runner.y - 12;
    });
  };

  game.start();
  if (game._element) holder.appendChild(game._element);

  return {
    update(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    destroy() {
      game.stop();
      if (game._element?.remove) game._element.remove();
    },
  };
}

async function mountKiwi(target) {
  await loadScript(LIBRARIES.kiwi);
  if (!window.Kiwi?.Game || !window.Kiwi?.State) throw new Error("Kiwi unavailable");

  const holder = document.createElement("div");
  holder.id = `war-kiwi-${Date.now()}`;
  holder.style.width = "100%";
  holder.style.height = "108px";
  target.appendChild(holder);

  let snapshot = defaultSnapshot();
  let headline = null;
  let detail = null;
  let ticker = 0;

  const state = new window.Kiwi.State("WarKiwi");
  state.create = function create() {
    headline = new window.Kiwi.GameObjects.TextField(this, "進軍準備中", 18, 28, "#d2b16f", 20, "normal", "serif");
    detail = new window.Kiwi.GameObjects.TextField(this, "Kiwi.js tactical relay", 18, 62, "#cfd9c8", 14, "normal", "sans-serif");
    this.addChild(headline);
    this.addChild(detail);
  };
  state.update = function update() {
    window.Kiwi.State.prototype.update.call(this);
    if (!headline || !detail) return;
    ticker += 0.04;
    headline.x = 18 + Math.sin(ticker) * 8;
    detail.alpha = 0.68 + (Math.sin(ticker * 2) + 1) * 0.16;
    headline.text = snapshot.phase === "title"
      ? "王国軍、出撃前"
      : snapshot.phase === "clear"
        ? `STAGE ${snapshot.stage - 1} 突破`
        : snapshot.phase === "gameover"
          ? "戦列崩壊"
          : `STAGE ${snapshot.stage} 進軍中`;
    detail.text = snapshot.message.slice(0, 34);
  };

  const game = new window.Kiwi.Game(`#${holder.id}`, "WarKiwi", state, {
    renderer: window.Kiwi.RENDERER_CANVAS,
    width: 540,
    height: 108,
    plugins: [],
    scaleType: window.Kiwi.Stage?.SCALE_NONE ?? 0,
    bootCallback: (instance) => {
      if (instance?.stage) instance.stage.color = "08100c";
      if (instance?.stage?.container?.style) {
        instance.stage.container.style.width = "100%";
        instance.stage.container.style.height = "108px";
        instance.stage.container.style.overflow = "hidden";
      }
      if (instance?.stage?.canvas?.style) {
        instance.stage.canvas.style.width = "100%";
        instance.stage.canvas.style.height = "108px";
        instance.stage.canvas.style.display = "block";
      }
    },
  });

  return {
    update(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    destroy() {
      if (game?.destroy) game.destroy();
    },
  };
}

export function createWarRoom() {
  const targets = {
    babylon: document.getElementById("war-babylon"),
    pixi: document.getElementById("war-pixi"),
    phina: document.getElementById("war-phina"),
    enchant: document.getElementById("war-enchant"),
    kiwi: document.getElementById("war-kiwi"),
  };

  const widgets = [];
  let snapshot = defaultSnapshot();

  const mountWidget = async (key, mountFn) => {
    const target = targets[key];
    if (!target) return;
    try {
      const widget = await mountFn(target);
      widget.update?.(snapshot);
      widgets.push(widget);
    } catch (error) {
      console.error(`${key} widget failed`, error);
      setFallback(target, `${key} relay unavailable`);
    }
  };

  return {
    async mount() {
      await mountWidget("babylon", mountBabylon);
      await mountWidget("pixi", mountPixi);
      await mountWidget("phina", mountPhina);
      await mountWidget("enchant", mountEnchant);
      await mountWidget("kiwi", mountKiwi);
    },
    update(nextSnapshot) {
      snapshot = { ...snapshot, ...nextSnapshot };
      for (const widget of widgets) widget.update?.(snapshot);
    },
    destroy() {
      for (const widget of widgets) widget.destroy?.();
    },
  };
}
