import { mouseState, cameraState, brushState, mapState, sizeState } from "../../states/index.js";
import { undo, redo } from "../history/index.js";
import { quickSave } from "../autosave/index.js";
import { cellSize } from "../../core/constants.js";
export function initCanvasInput(canvas, el) {
    canvas.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
            mouseState.leftDown = true;
            if (brushState.mode === "flatten") {
                const size = cellSize * cameraState.zoom;
                const cellX = Math.floor((e.offsetX - cameraState.camX) / size);
                const cellY = Math.floor((e.offsetY - cameraState.camY) / size);
                const row = mapState.map?.[cellY];
                brushState.targetHeight = row?.[cellX] ?? null;
            }
        }
        if (e.button === 1) {
            cameraState.panning = true;
            cameraState.panStartX = e.clientX;
            cameraState.panStartY = e.clientY;
        }
        if (e.button === 2)
            mouseState.rightDown = true;
    });
    window.addEventListener("mouseup", (e) => {
        if (e.button === 0) {
            if (brushState.mode === "flatten")
                brushState.targetHeight = null;
            mouseState.leftDown = false;
        }
        if (e.button === 1)
            cameraState.panning = false;
        if (e.button === 2)
            mouseState.rightDown = false;
    });
    window.addEventListener("wheel", (e) => {
        if (e.shiftKey) {
            cameraState.zoom += e.deltaY > 0 ? -0.1 : 0.1;
            cameraState.zoom = Math.max(0.05, Math.min(4, cameraState.zoom));
            el.zoomSizeBar.textContent = `Zoom: ${cameraState.zoom.toFixed(2)}`;
            return;
        }
        brushState.brushRadius += e.deltaY > 0 ? -2 : 2;
        brushState.brushRadius = Math.max(1, Math.min(300, brushState.brushRadius));
        el.brushSizeBar.textContent = `Size: ${brushState.brushRadius}`;
    });
    canvas.addEventListener("mousemove", (e) => {
        mouseState.mouseX = e.offsetX;
        mouseState.mouseY = e.offsetY;
        const size = cellSize * cameraState.zoom;
        const cellX = Math.floor((mouseState.mouseX - cameraState.camX) / size);
        const cellY = Math.floor((mouseState.mouseY - cameraState.camY) / size);
        if (cellX >= 0 &&
            cellY >= 0 &&
            cellX < sizeState.widthLength &&
            cellY < sizeState.heightLength) {
            el.locationBar.textContent = `Location: ${cellX}, ${cellY}`;
            el.heightBar.textContent = `Height: ${Math.floor(mapState.map?.[cellY]?.[cellX] ?? 0)}/${sizeState.maxHeight}`;
        }
        // パン処理
        if (!cameraState.panning)
            return;
        const dx = e.clientX - cameraState.panStartX;
        const dy = e.clientY - cameraState.panStartY;
        cameraState.camX += dx;
        cameraState.camY += dy;
        cameraState.panStartX = e.clientX;
        cameraState.panStartY = e.clientY;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}
export function initKeyboardShortcuts() {
    document.addEventListener("keydown", async (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA")
            return;
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl)
            return;
        if (e.key === "z" || e.key === "Z") {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            }
            else {
                undo();
            }
        }
        if (e.key === "y" || e.key === "Y") {
            e.preventDefault();
            redo();
        }
        if (e.key === "s") {
            e.preventDefault();
            await quickSave();
        }
    });
}
//# sourceMappingURL=input.js.map