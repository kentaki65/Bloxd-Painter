// main.ts
import { draw } from "./features/render/index.js";
import { eventInit } from "./features/event/index.js";
import { initMaps, initChunks } from "./states/init.js";
import { mapState, mouseState, sizeState } from "./states/index.js";
import { applyBrush } from "./features/brush/index.js";
import { beginStroke, endStroke } from "./features/history/index.js";
import { initDB, loadFromDB, autoSave } from "./features/autosave/index.js";
import { redrawAllChunks, rebuildColumn } from "./features/chunk/index.js";
import { getElement } from "./core/utils.js";

const canvas = getElement<HTMLCanvasElement>("canvas");

window.addEventListener("mousedown", beginStroke);
window.addEventListener("mouseup", endStroke);

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(time: number): void {
  if (mouseState.leftDown || mouseState.rightDown) {
    applyBrush();
  }
  draw(canvas);
  requestAnimationFrame(loop);
}

async function main(): Promise<void> {
  await initDB();
  const data = await loadFromDB();

  initChunks();
  initMaps();

  for (let z = 0; z < sizeState.heightLength; z++) {
    for (let x = 0; x < sizeState.widthLength; x++) {
      rebuildColumn(x, z, 1);
    }
  }
  
  redrawAllChunks();

  if (data) {
    mapState.map = data.map;
    mapState.topBlockMap = data.topBlockMap;
    mapState.layerMap = data.layerMap;
    redrawAllChunks();
  }

  eventInit();
  loop(0);
  autoSave();
}

main();