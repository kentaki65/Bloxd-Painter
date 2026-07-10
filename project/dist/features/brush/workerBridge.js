// src/features/brush/workerBridge.ts
import { sizeState, mapState, mouseState, brushState, cameraState } from "../../states/index.js";
import { cellSize } from "../../core/constants.js";
import { applyColumnChanges } from "../chunk/index.js";
import { recordChange } from "../history/index.js";
let worker = null;
let brushBusy = false;
export function initBrushWorker() {
    if (!mapState.map) {
        console.warn("initBrushWorker: mapState.map is not ready yet");
        return;
    }
    worker = new Worker(new URL("./brush.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "brushResult") {
            if (msg.changed.length > 0) {
                const c = msg.changed[0];
                const idx = c.y * sizeState.widthLength + c.x;
                console.log("[bridge] verify shared memory", { expectedNewH: c.newH, actualInMainThreadMap: mapState.map?.[idx] });
            }
            applyBrushResult(msg.changed);
            brushBusy = false;
        }
    };
    sendMapToWorker();
}
export function reinitBrushWorkerMap() {
    if (!worker || !mapState.map)
        return;
    sendMapToWorker();
}
function sendMapToWorker() {
    if (!worker || !mapState.map)
        return;
    worker.postMessage({
        type: "init",
        width: sizeState.widthLength,
        height: sizeState.heightLength,
        buffer: mapState.map.buffer,
    });
}
function applyBrushResult(changed) {
    if (changed.length === 0)
        return;
    const t0 = performance.now();
    const heightChanged = new Map();
    for (const c of changed) {
        recordChange(c.x, c.y, c.oldH, c.newH, "height");
        heightChanged.set(`${c.x},${c.y}`, c.oldH);
    }
    const t1 = performance.now();
    applyColumnChanges(heightChanged);
    const t2 = performance.now();
    console.log(`[perf] changed=${changed.length} recordChange=${(t1 - t0).toFixed(1)}ms applyColumnChanges=${(t2 - t1).toFixed(1)}ms`);
}
export function applyBrushViaWorker() {
    if (!worker || brushBusy)
        return;
    if (!mouseState.leftDown && !mouseState.rightDown)
        return;
    const mode = brushState.mode;
    if (mode === "sprayPaint" || mode === "layerPaint") {
        return;
    }
    const size = cellSize * cameraState.zoom;
    const cellX = Math.floor((mouseState.mouseX - cameraState.camX) / size);
    const cellY = Math.floor((mouseState.mouseY - cameraState.camY) / size);
    if (cellX < 0 || cellY < 0 || cellX >= sizeState.widthLength || cellY >= sizeState.heightLength)
        return;
    brushBusy = true;
    const brushMode = mode === "smooth" ? "smooth" : "normal";
    console.log("[bridge] sending brush", { cellX, cellY, radius: brushState.brushRadius, brushMode, mapBufferByteLength: mapState.map?.buffer.byteLength });
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
        },
    });
}
export function isBrushWorkerBusy() {
    return brushBusy;
}
//# sourceMappingURL=workerBridge.js.map