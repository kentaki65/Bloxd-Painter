// main.ts
import { draw } from "./features/render/index.js";
import { eventInit } from "./features/event/index.js";
import { initMaps, initChunks } from "./states/init.js";
import { mapState, mouseState } from "./states/index.js";
import { applyBrush } from "./features/brush/index.js";
import { beginStroke, endStroke } from "./features/history/index.js";
import { initDB, loadFromDB, autoSave } from "./features/autosave/index.js";
import { redrawAllChunks } from "./features/chunk/index.js";
import { getElement } from "./core/utils.js";
const canvas = getElement("canvas");
window.addEventListener("mousedown", beginStroke);
window.addEventListener("mouseup", endStroke);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
function loop(time) {
    if (mouseState.leftDown || mouseState.rightDown) {
        applyBrush();
    }
    draw(canvas);
    requestAnimationFrame(loop);
}
async function main() {
    await initDB();
    const data = await loadFromDB();
    initChunks();
    initMaps();
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
//# sourceMappingURL=main.js.map