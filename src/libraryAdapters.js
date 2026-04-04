const CDN = {
  phaser: "https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.js",
  phina: "https://cdn.jsdelivr.net/npm/phina.js@0.2.3/build/phina.min.js",
  babylon: "https://cdn.babylonjs.com/babylon.js",
  pixi: "https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js",
  enchant: "./vendor/enchant.js?v=20260404a",
  kiwi: "https://cdn.jsdelivr.net/npm/kiwi.js@1.4.0/dist/kiwi.min.js",
};

const scriptCache = new Map();

function loadScript(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptCache.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });

  scriptCache.set(src, promise);
  return promise;
}

function createTitle(el, text) {
  const title = document.createElement("p");
  title.className = "library-demo-title";
  title.textContent = text;
  el.appendChild(title);
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createCanvas(container, width = 420, height = 220) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.className = "library-demo-canvas";
  container.appendChild(canvas);
  return canvas;
}

export async function mountLibraryDemo(name, container) {
  clearNode(container);

  const mountMap = {
    phaser: mountPhaser,
    phina: mountPhina,
    babylon: mountBabylon,
    pixi: mountPixi,
    enchant: mountEnchant,
    kiwi: mountKiwi,
  };

  if (!mountMap[name]) {
    throw new Error(`Unsupported library: ${name}`);
  }

  return mountMap[name](container);
}

async function mountPhaser(container) {
  await loadScript(CDN.phaser);
  createTitle(container, "Phaser.js: moving square demo");
  const holder = document.createElement("div");
  container.appendChild(holder);

  const scene = new window.Phaser.Scene("demo");
  scene.create = function create() {
    const box = this.add.rectangle(20, 110, 44, 44, 0xe0c063);
    this.tweens.add({ targets: box, x: 400, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  };

  const game = new window.Phaser.Game({
    type: window.Phaser.CANVAS,
    width: 420,
    height: 220,
    backgroundColor: "#08100c",
    parent: holder,
    scene: [scene],
  });

  return () => game.destroy(true);
}

async function mountPhina(container) {
  await loadScript(CDN.phina);
  createTitle(container, "phina.js: bouncing circle demo");

  const holder = document.createElement("div");
  holder.id = `phina-demo-${Date.now()}`;
  container.appendChild(holder);
  const app = window.phina.display.CanvasApp({
    width: 420,
    height: 220,
    fit: false,
    append: false,
  });

  const scene = window.phina.display.DisplayScene({
    width: 420,
    height: 220,
  });
  const circle = window.phina.display.CircleShape({ radius: 20, fill: "#d2b16f", stroke: "#eadfc4" }).addChildTo(scene);
  circle.setPosition(20, 110);
  circle.tweener.clear().to({ x: 400 }, 900).to({ x: 20 }, 900).setLoop(true);

  holder.appendChild(app.domElement);
  app.replaceScene(scene);
  app.run();

  return () => {
    app.stop();
    holder.textContent = "";
  };
}


async function mountBabylon(container) {
  await loadScript(CDN.babylon);
  createTitle(container, "Babylon.js: rotating box demo");
  const canvas = createCanvas(container);
  const engine = new window.BABYLON.Engine(canvas, true);

  const scene = new window.BABYLON.Scene(engine);
  scene.clearColor = new window.BABYLON.Color4(0.03, 0.07, 0.05, 1);

  const camera = new window.BABYLON.ArcRotateCamera("camera", Math.PI / 3, Math.PI / 3, 4, window.BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, false);
  const light = new window.BABYLON.HemisphericLight("light", new window.BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.9;

  const box = window.BABYLON.MeshBuilder.CreateBox("box", { size: 1.2 }, scene);
  const mat = new window.BABYLON.StandardMaterial("mat", scene);
  mat.diffuseColor = new window.BABYLON.Color3(0.82, 0.69, 0.44);
  box.material = mat;

  engine.runRenderLoop(() => {
    box.rotation.y += 0.02;
    scene.render();
  });

  return () => {
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };
}

async function mountPixi(container) {
  await loadScript(CDN.pixi);
  createTitle(container, "PixiJS: moving bar demo");

  const app = new window.PIXI.Application({
    width: 420,
    height: 220,
    backgroundColor: 0x08100c,
    antialias: true,
  });
  container.appendChild(app.view);
  app.view.classList.add("library-demo-canvas");

  const bar = new window.PIXI.Graphics();
  if (typeof bar.roundRect === "function" && typeof bar.fill === "function") {
    // PixiJS v8 style API
    bar.roundRect(0, 0, 80, 24, 8).fill(0xd2b16f);
  } else {
    // PixiJS v7 style API
    bar.beginFill(0xd2b16f);
    bar.drawRoundedRect(0, 0, 80, 24, 8);
    bar.endFill();
  }
  bar.x = 0;
  bar.y = 98;
  app.stage.addChild(bar);

  let dir = 1;
  app.ticker.add(() => {
    bar.x += dir * 1.6;
    if (bar.x >= 340) dir = -1;
    if (bar.x <= 0) dir = 1;
  });

  return () => app.destroy(true, { children: true, texture: true, baseTexture: true });
}

async function mountEnchant(container) {
  await loadScript(CDN.enchant);
  createTitle(container, "enchant.js: moving sprite demo");

  if (typeof window.enchant !== "function") {
    throw new Error("enchant.js の初期化関数が見つかりません");
  }

  window.enchant();
  const holder = document.createElement("div");
  container.appendChild(holder);

  const CoreClass = window.Core || (window.enchant && window.enchant.Core);
  if (!CoreClass) {
    throw new Error("enchant.Core が見つかりません");
  }

  const game = new CoreClass(420, 220);
  game.fps = 30;
  game.onload = () => {
    const SpriteClass = window.Sprite || (window.enchant && window.enchant.Sprite);
    const SurfaceClass = window.Surface || (window.enchant && window.enchant.Surface);
    if (!SpriteClass || !SurfaceClass) return;

    const square = new SpriteClass(28, 28);
    const surface = new SurfaceClass(28, 28);
    surface.context.fillStyle = "#d2b16f";
    surface.context.fillRect(0, 0, 28, 28);
    square.image = surface;
    square.x = 0;
    square.y = 96;
    square.addEventListener("enterframe", function onFrame() {
      this.x = (this.x + 2) % 420;
    });
    game.rootScene.backgroundColor = "#08100c";
    game.rootScene.addChild(square);
  };

  game.start();
  if (game._element) holder.appendChild(game._element);

  return () => {
    game.stop();
    if (game._element?.remove) game._element.remove();
  };
}

async function mountKiwi(container) {
  await loadScript(CDN.kiwi);
  createTitle(container, "Kiwi.js: text demo（Canvas fallback）");

  const holder = document.createElement("div");
  holder.id = `kiwi-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  container.appendChild(holder);

  if (!window.Kiwi?.Game || !window.Kiwi?.State) {
    throw new Error("Kiwi.js の初期化に失敗しました");
  }

  const state = new window.Kiwi.State("DemoState");
  state.create = function create() {
    const text = new window.Kiwi.GameObjects.Textfield(this, "Kiwi.js loaded", 120, 100, "22px serif", "#d2b16f", "left");
    this.addChild(text);
  };

  const gameOptions = {
    renderer: window.Kiwi.RENDERER_CANVAS,
    width: 420,
    height: 220,
    plugins: [],
  };

  let game = null;
  try {
    game = new window.Kiwi.Game(holder, "KiwiDemo", null, gameOptions);
    game.states.addState(state);
    game.states.switchState("DemoState");
  } catch (error) {
    const fallback = createCanvas(holder);
    const ctx = fallback.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#08100c";
      ctx.fillRect(0, 0, fallback.width, fallback.height);
      ctx.fillStyle = "#d2b16f";
      ctx.font = "22px serif";
      ctx.fillText("Kiwi.js init failed", 100, 100);
      ctx.fillText("Fallback demo active", 100, 130);
    }
  }

  return () => {
    if (game?.destroy) game.destroy();
    holder.textContent = "";
  };
}
