// src/features/render/renderBridge.ts
import { sizeState, mapState, brushState, } from "../../states/index.js";
import { cellSize, chunkSize, contour, blockColors, layerColors, idToName } from "../../core/constants.js";
let worker = null;
let requestIdCounter = 0;
const pending = new Map();
export const chunkBitmaps = new Map();
export function initRenderWorker() {
    if (!mapState.map || !mapState.blockMap || !mapState.topBlockMap || !mapState.layerMap) {
        console.warn("initRenderWorker: map data is not ready yet");
        return;
    }
    worker = new Worker(new URL("./render.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "chunkResult") {
            const key = `${msg.cx},${msg.cy}`;
            if (msg.bitmap) {
                const old = chunkBitmaps.get(key);
                old?.close();
                chunkBitmaps.set(key, msg.bitmap);
            }
            const resolver = pending.get(msg.requestId);
            if (resolver) {
                resolver(msg.bitmap ?? null);
                pending.delete(msg.requestId);
            }
        }
    };
    worker.postMessage({
        type: "init",
        width: sizeState.widthLength,
        height: sizeState.heightLength,
        maxHeight: sizeState.maxHeight,
        waterLevel: mapState.waterLevel,
        mapBuffer: mapState.map.buffer,
        topBlockMap: mapState.topBlockMap,
        layerMap: mapState.layerMap,
        blockMap: mapState.blockMap,
        blockColors,
        layerColors,
        idToName,
        selectedLayer: brushState.selectedLayer,
        chunkSize,
        contour,
    });
}
export function syncRenderWorkerState() {
    if (!worker)
        return;
    if (!mapState.blockMap || !mapState.topBlockMap || !mapState.layerMap)
        return;
    worker.postMessage({
        type: "syncState",
        topBlockMap: mapState.topBlockMap,
        layerMap: mapState.layerMap,
        blockMap: mapState.blockMap,
        waterLevel: mapState.waterLevel,
        selectedLayer: brushState.selectedLayer,
        layerColors
    });
}
export function reinitRenderWorkerMap() {
    if (!worker)
        return;
    initRenderWorker();
}
export function requestChunkRender(cx, cy, zoom) {
    return new Promise((resolve) => {
        if (!worker) {
            resolve(null);
            return;
        }
        const requestId = requestIdCounter++;
        pending.set(requestId, resolve);
        worker.postMessage({
            type: "renderChunk",
            requestId,
            cx,
            cy,
            cellSize,
            zoom,
        });
    });
}
//# sourceMappingURL=renderBridge.js.map