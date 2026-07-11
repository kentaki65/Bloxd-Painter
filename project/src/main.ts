// main.ts
import { draw } from "./features/render/index.js";
import { eventInit } from "./features/event/index.js";
import { initMaps, initChunks } from "./states/init.js";
import { mapState, mouseState, sizeState, brushState } from "./states/index.js";
import { applyBrush } from "./features/brush/index.js";
import { beginStroke, endStroke } from "./features/history/index.js";
import { initDB, loadFromDB, autoSave } from "./features/autosave/index.js";
import { redrawAllChunks, rebuildColumn, resizeMapEmpty, resizeHeightEmpty } from "./features/chunk/index.js";
import { getElement, toSharedFloat32 } from "./core/utils.js";
import { applyBrushViaWorker, initBrushWorker } from "./features/brush/workerBridge.js";
import { initRenderWorker } from "./features/render/renderBridge.js";
const canvas = getElement<HTMLCanvasElement>("canvas");

window.addEventListener("mousedown", beginStroke);
window.addEventListener("mouseup", endStroke);

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(time: number): void {
  const t0 = performance.now();

  if (mouseState.leftDown || mouseState.rightDown) {
    const mode = brushState.mode;
    if (mode === "sprayPaint" || mode === "layerPaint") {
      applyBrush();
    } else {
      applyBrushViaWorker();
    }
  }

  const t1 = performance.now();
  draw(canvas);
  const t2 = performance.now();

  if (t2 - t0 > 8) {
    console.log(`[loop] applyBrush=${(t1-t0).toFixed(1)}ms draw=${(t2-t1).toFixed(1)}ms`);
  }

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
    const chunkLenX = data.chunkLenX ?? 4;
    const chunkLenZ = data.chunkLenZ ?? 4;
    const maxHeight = data.maxHeight ?? sizeState.maxHeight;

    await resizeMapEmpty(chunkLenX, chunkLenZ);
    sizeState.maxHeight = maxHeight;
    await resizeHeightEmpty(maxHeight);

    mapState.map = toSharedFloat32(data.map!);
    mapState.topBlockMap = data.topBlockMap;
    mapState.layerMap = data.layerMap;

    redrawAllChunks();
  }

  eventInit();
  initRenderWorker();
  initBrushWorker(); 
  loop(0);
  autoSave();
}

main();