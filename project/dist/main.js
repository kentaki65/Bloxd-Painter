// main.ts
import { draw } from "./features/render/index.js";
import { eventInit } from "./features/event/index.js";
import { initMaps, initChunks } from "./states/init.js";
import { mapState, mouseState, sizeState, brushState } from "./states/index.js";
import { applyBrush } from "./features/brush/index.js";
import { beginStroke, endStroke } from "./features/history/index.js";
import { initDB, loadFromDB, autoSave } from "./features/autosave/index.js";
import { rebuildColumn, resizeMapEmpty, resizeHeightEmpty } from "./features/chunk/index.js";
import { getElement, toSharedFloat32 } from "./core/utils.js";
import { applyBrushViaWorker, initBrushWorker } from "./features/brush/workerBridge.js";
import { initTerrainCanvas, renderFullTerrain, updateTerrainCanvasTransform } from "./features/render/render.js";
import { initDropdowns } from "./features/UI/dropdown.js";
const canvas = getElement("canvas");
window.addEventListener("mousedown", beginStroke);
window.addEventListener("mouseup", endStroke);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
function loop(time) {
    if (mouseState.leftDown || mouseState.rightDown) {
        const mode = brushState.mode;
        if (mode === "sprayPaint" || mode === "layerPaint") {
            applyBrush();
        }
        else {
            applyBrushViaWorker();
        }
    }
    draw(canvas);
    updateTerrainCanvasTransform();
    requestAnimationFrame(loop);
}
async function main() {
    await initDB();
    const data = await loadFromDB();
    initChunks();
    initMaps();
    for (let z = 0; z < sizeState.heightLength; z++) {
        for (let x = 0; x < sizeState.widthLength; x++) {
            rebuildColumn(x, z, 1);
        }
    }
    if (data) {
        const chunkLenX = data.chunkLenX ?? 4;
        const chunkLenZ = data.chunkLenZ ?? 4;
        const maxHeight = data.maxHeight ?? sizeState.maxHeight;
        await resizeMapEmpty(chunkLenX, chunkLenZ);
        sizeState.maxHeight = maxHeight;
        await resizeHeightEmpty(maxHeight);
        mapState.map = toSharedFloat32(data.map);
        mapState.topBlockMap = data.topBlockMap;
        mapState.layerMap = data.layerMap;
    }
    eventInit();
    initDropdowns();
    initBrushWorker();
    initTerrainCanvas(canvas);
    renderFullTerrain();
    loop(0);
    autoSave();
}
main();
//# sourceMappingURL=main.js.map