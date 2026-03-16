import { createGame } from "./engine.js";

const game = createGame({
  canvas: document.getElementById("game"),
  hud: {
    status: document.getElementById("status"),
    stage: document.getElementById("stage"),
    score: document.getElementById("score"),
    hp: document.getElementById("hp"),
    soldier: document.getElementById("soldier"),
    knight: document.getElementById("knight"),
    message: document.getElementById("message"),
  },
  controls: {
    startBtn: document.getElementById("startBtn"),
    restartBtn: document.getElementById("restartBtn"),
  },
});

game.mount();
