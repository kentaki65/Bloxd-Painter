// features/brush/loader.ts
import { showLoading, hideLoading } from "../UI/loading.js";
import { brushState } from "../../states/index.js";
import { BRUSH_IMAGE_PATH } from "../../core/constants.js";
async function loadBrush(filename) {
    return new Promise((resolve) => {
        const brushImg = new Image();
        brushImg.src = `${BRUSH_IMAGE_PATH}${filename}`;
        brushImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = brushImg.width;
            canvas.height = brushImg.height;
            const ctx = canvas.getContext("2d");
            if (!ctx)
                return;
            ctx.drawImage(brushImg, 0, 0);
            const data = ctx.getImageData(0, 0, brushImg.width, brushImg.height).data;
            const normalized = [];
            for (let y = 0; y < brushImg.height; y++) {
                normalized[y] = [];
                for (let x = 0; x < brushImg.width; x++) {
                    const idx = (y * brushImg.width + x) * 4;
                    const r = data[idx] ?? 0;
                    const normalizedRows = normalized[y];
                    if (!normalizedRows)
                        continue;
                    normalizedRows[x] = 1 - r / 255;
                }
            }
            resolve({ filename, normalized });
        };
    });
}
export async function loadAllBrushes(brushImages, container, brushBar) {
    showLoading();
    try {
        await new Promise(r => setTimeout(r, 0));
        const results = await Promise.all(brushImages.map(filename => loadBrush(filename)));
        const loadedBrushes = {};
        for (const { filename: name, normalized } of results) {
            loadedBrushes[name] = normalized;
            const brushTitle = name.replace(/\.[^/.]+$/, "");
            const brushId = brushTitle.replace(/\s+/g, "_");
            const button = document.createElement("button");
            button.className = "BlockButton";
            button.title = brushTitle;
            button.id = brushId;
            const img = document.createElement("img");
            img.src = `${BRUSH_IMAGE_PATH}${name}`;
            img.width = 24;
            button.appendChild(img);
            container.appendChild(button);
            button.addEventListener("click", () => {
                brushBar.textContent = `Brush: ${brushTitle}`;
                brushState.brushType = name;
            });
        }
        brushState.loadedBrushes = loadedBrushes;
    }
    catch (e) {
        console.error("Brush load failed:", e);
    }
    finally {
        hideLoading();
    }
}
//# sourceMappingURL=loader.js.map