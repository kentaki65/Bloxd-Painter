// src/features/brush/workerBridge.ts
import { sizeState, mapState, mouseState, brushState, cameraState } from "../../states/index.js";
import { cellSize } from "../../core/constants.js";
import { applyColumnChanges } from "../chunk/index.js";
import { recordChange } from "../history/index.js";

let worker: Worker | null = null;
let brushBusy = false;

interface ChangedCell {
  x: number;
  y: number;
  oldH: number;
  newH: number;
}

export function initBrushWorker(): void {
  if (!mapState.map) {
    console.warn("initBrushWorker: mapState.map is not ready yet");
    return;
  }

  worker = new Worker(new URL("./brush.worker.js", import.meta.url), { type: "module" });

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "brushResult") {
      if (msg.changed.length > 0) {
        const c = msg.changed[0];
        const idx = c.y * sizeState.widthLength + c.x;
      }
      applyBrushResult(msg.changed as ChangedCell[]);
      brushBusy = false;
    }
  };

  sendMapToWorker();
  syncBrushImagesToWorker();
}

export function reinitBrushWorkerMap(): void {
  if (!worker || !mapState.map) return;
  sendMapToWorker();
}

function sendMapToWorker(): void {
  if (!worker || !mapState.map) return;

  worker.postMessage({
    type: "init",
    width: sizeState.widthLength,
    height: sizeState.heightLength,
    buffer: mapState.map.buffer,
  });
}

function applyBrushResult(changed: ChangedCell[]): void {
  if (changed.length === 0) return;

  const t0 = performance.now();

  const heightChanged = new Map<string, number>();
  for (const c of changed) {
    recordChange(c.x, c.y, c.oldH, c.newH, "height");
    heightChanged.set(`${c.x},${c.y}`, c.oldH);
  }

  const t1 = performance.now();
  applyColumnChanges(heightChanged);
  const t2 = performance.now();

  console.log(`[perf] changed=${changed.length} recordChange=${(t1-t0).toFixed(1)}ms applyColumnChanges=${(t2-t1).toFixed(1)}ms total=${(t2-t0).toFixed(1)}ms`);
}

export function applyBrushViaWorker(): void {
  if (!worker || brushBusy) return;
  if (!brushState) return;
  if (!mouseState.leftDown && !mouseState.rightDown) return;

  const mode = brushState.mode;
  if (mode === "sprayPaint" || mode === "layerPaint") {
    return;
  }

  const size = cellSize * cameraState.zoom;
  const cellX = Math.floor((mouseState.mouseX - cameraState.camX) / size);
  const cellY = Math.floor((mouseState.mouseY - cameraState.camY) / size);

  if (cellX < 0 || cellY < 0 || cellX >= sizeState.widthLength || cellY >= sizeState.heightLength) return;

  brushBusy = true;

  const brushMode: "normal" | "smooth" = mode === "smooth" ? "smooth" : "normal";
  
  worker.postMessage({
    type: "applyBrush",
    brushMode,
    params: {
      cellX,
      cellY,
      radius: brushState.brushRadius,
      mode: brushState.mode,
      targetHeight: brushState.targetHeight,
      leftDown: mouseState.leftDown,
      rightDown: mouseState.rightDown,
      rangeFilter: brushState.rangeFilter,
      maxHeight: sizeState.maxHeight,
      intensity: brushState.intensity,
      threshold: brushState.threshold,
      brushType: brushState.brushType,
    },
  });
}

export function isBrushWorkerBusy(): boolean {
  return brushBusy;
}

export function syncBrushImagesToWorker(): void {
  if (!worker) return;

  worker.postMessage({
    type: "syncBrushImages",
    loadedBrushes: brushState.loadedBrushes,
  });
}