import { mountLibraryDemo } from "./libraryAdapters.js?v=20260404b";

const select = document.getElementById("library-select");
const runButton = document.getElementById("library-run-button");
const container = document.getElementById("library-demo-container");
const status = document.getElementById("library-demo-status");

let unmount = null;

async function runDemo() {
  if (!select || !container || !status) return;

  status.textContent = "ライブラリを読み込み中...";

  if (unmount) {
    unmount();
    unmount = null;
  }

  try {
    unmount = await mountLibraryDemo(select.value, container);
    status.textContent = `${select.options[select.selectedIndex].text} のデモを表示中`;
  } catch (error) {
    console.error(error);
    status.textContent = `読み込み失敗: ${error.message}`;
  }
}

runButton?.addEventListener("click", runDemo);
select?.addEventListener("change", runDemo);

runDemo();
