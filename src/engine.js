export function createGame({ canvas, hud, controls }) {
  const ctx = canvas.getContext("2d");

  const state = {
    running: false,
    stage: 1,
    score: 0,
    hero: { hp: 8, maxHp: 8 },
    soldiers: 3,
    knights: 0,
  };

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.font = "28px monospace";
    ctx.fillText("Kingdom Wars DX", 240, 160);

    ctx.font = "16px monospace";
    ctx.fillText(state.running ? "RUNNING" : "TITLE", 330, 220);

    ctx.fillStyle = "#ffe082";
    ctx.fillRect(360, 300, 24, 24);
  }

  function syncHud(message = "待機中...") {
    hud.status.textContent = state.running ? "進軍中" : "タイトル";
    hud.stage.textContent = String(state.stage);
    hud.score.textContent = String(state.score);
    hud.hp.textContent = `${state.hero.hp}/${state.hero.maxHp}`;
    hud.soldier.textContent = String(state.soldiers);
    hud.knight.textContent = String(state.knights);
    hud.message.textContent = message;
  }

  function start() {
    state.running = true;
    syncHud("ゲームを開始しました。次のステップでエンジン本体を実装します。");
    render();
  }

  function restart() {
    state.running = false;
    state.stage = 1;
    state.score = 0;
    state.hero.hp = 8;
    state.soldiers = 3;
    state.knights = 0;
    syncHud("リセットしました。");
    render();
  }

  function bind() {
    controls.startBtn.addEventListener("click", start);
    controls.restartBtn.addEventListener("click", restart);
    window.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") restart();
    });
  }

  function mount() {
    bind();
    syncHud("初期化完了。");
    render();
  }

  return { mount };
}
