import { chunkState, sizeState, brushState, mapState } from "../../states/index.js";
import { chunkSize, LEAF_BLOCKS } from "../../core/constants.js";
import { resize2D, resize3D, create2D, create3D } from "../../core/utils.js";
import { runLoading } from "../UI/loading.js";
export async function resizeMap(newChunkX, newChunkZ) {
    await runLoading(async () => {
        const oldChunkCanvas = chunkState.chunkCanvas;
        if (!oldChunkCanvas)
            return;
        const oldCols = chunkState.chunkCols;
        const oldRows = chunkState.chunkRows;
        const newWidth = newChunkX * chunkSize;
        const newHeight = newChunkZ * chunkSize;
        const oldMap = mapState.map;
        const oldBlockMap = mapState.blockMap;
        const oldLayerMap = mapState.layerMap;
        const oldTopBlockMap = mapState.topBlockMap;
        if (!oldMap || !oldBlockMap || !oldLayerMap || !oldTopBlockMap)
            return;
        const newMap = resize2D(oldMap, newHeight, newWidth, 0);
        const newBlockMap = resize3D(oldBlockMap, sizeState.maxHeight, newHeight, newWidth, 0);
        const newTopBlockMap = resize2D(oldTopBlockMap, newHeight, newWidth, 0);
        const newLayerMap = resize2D(oldLayerMap, newHeight, newWidth, null);
        sizeState.chunkLenX = newChunkX;
        sizeState.chunkLenZ = newChunkZ;
        mapState.map = newMap;
        mapState.blockMap = newBlockMap;
        mapState.layerMap = newLayerMap;
        mapState.topBlockMap = newTopBlockMap;
        const newCols = Math.ceil(newWidth / chunkSize);
        const newRows = Math.ceil(newHeight / chunkSize);
        const newChunkCanvas = Array.from({ length: newRows }, (_, cy) => Array.from({ length: newCols }, (_, cx) => {
            const chunkRows = oldChunkCanvas[cy]; // ← ローカル変数を使う
            return (cy < oldRows && cx < oldCols)
                ? chunkRows?.[cx] ?? null
                : null;
        }));
        chunkState.chunkCanvas = newChunkCanvas;
        chunkState.chunkCols = newCols;
        chunkState.chunkRows = newRows;
        chunkState.dirtyChunks.clear();
        for (let cy = 0; cy < newRows; cy++) {
            for (let cx = 0; cx < newCols; cx++) {
                if (cy >= oldRows || cx >= oldCols) {
                    chunkState.dirtyChunks.add(`${cx},${cy}`);
                }
            }
        }
    });
}
export async function resizeMapEmpty(newChunkX, newChunkZ) {
    await runLoading(async () => {
        const newWidth = newChunkX * chunkSize;
        const newHeight = newChunkZ * chunkSize;
        mapState.map = create2D(newHeight, newWidth, 0);
        mapState.blockMap = create3D(sizeState.maxHeight, newHeight, newWidth, 0);
        mapState.topBlockMap = create2D(newHeight, newWidth, null);
        mapState.layerMap = create2D(newHeight, newWidth, null);
        sizeState.chunkLenX = newChunkX;
        sizeState.chunkLenZ = newChunkZ;
        chunkState.chunkCols = newChunkX;
        chunkState.chunkRows = newChunkZ;
        chunkState.chunkCanvas = create2D(newChunkZ, newChunkZ, null);
        chunkState.dirtyChunks.clear();
        for (let cy = 0; cy < newChunkZ; cy++) {
            for (let cx = 0; cx < newChunkX; cx++) {
                chunkState.dirtyChunks.add(`${cx},${cy}`);
            }
        }
    });
}
export async function resizeHeight(newMaxHeight) {
    await runLoading(async () => {
        const old = mapState.blockMap;
        const map = mapState.map;
        if (!old || !map)
            return;
        const width = sizeState.widthLength;
        const height = sizeState.heightLength;
        const newMap3D = resize3D(old, newMaxHeight, height, width, 0);
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                const mapRow = map[z];
                if (!mapRow)
                    continue;
                const value = mapRow[x];
                if (value !== undefined && value >= newMaxHeight) {
                    mapRow[x] = newMaxHeight - 1;
                }
            }
        }
        sizeState.maxHeight = newMaxHeight;
        mapState.blockMap = newMap3D;
        redrawAllChunks();
    });
}
export async function resizeHeightEmpty(newMaxHeight) {
    await runLoading(async () => {
        const width = sizeState.widthLength;
        const height = sizeState.heightLength;
        mapState.blockMap = create3D(newMaxHeight, height, width, 0);
        sizeState.maxHeight = newMaxHeight;
        redrawAllChunks();
    });
}
export function rebuildColumn(x, y, height) {
    if (!mapState.blockMap || !mapState.topBlockMap)
        return;
    const safeTop = Math.min(sizeState.maxHeight - 1, Math.floor(height));
    for (let yy = safeTop; yy >= 0; yy--) {
        const block = mapState.blockMap[yy]?.[y]?.[x];
        if (block !== undefined && LEAF_BLOCKS.has(block)) {
            return;
        }
    }
    const topLayer = brushState.blockLayers[0];
    if (!topLayer)
        return;
    let layerIndex = 0;
    let remaining = topLayer.depth;
    for (let yy = safeTop; yy >= 0; yy--) {
        if (remaining <= 0) {
            layerIndex++;
            remaining = brushState.blockLayers[layerIndex]?.depth ?? Infinity;
        }
        const layer = brushState.blockLayers[layerIndex];
        if (!layer)
            return;
        const height = mapState.blockMap[yy];
        if (!height)
            continue;
        const rows = height[y];
        if (!rows)
            return;
        rows[x] = layer.block;
        remaining--;
    }
    for (let yy = safeTop + 1; yy < sizeState.maxHeight; yy++) {
        const height = mapState.blockMap[yy];
        if (!height)
            continue;
        const rows = height[y];
        if (!rows)
            return;
        rows[x] = 0;
    }
    const override = mapState.topBlockMap[y]?.[x];
    const topRow = mapState.blockMap[safeTop]?.[y];
    if (override !== null && override !== undefined && topRow) {
        topRow[x] = override;
    }
}
export function applyColumnChanges(changed) {
    if (!mapState.map)
        return;
    for (const key of changed) {
        const [x, y] = key.split(",").map(Number);
        if (x === undefined || y === undefined)
            continue;
        const mapRow = mapState.map[y];
        if (mapRow === undefined)
            continue;
        const height = mapRow[x];
        if (height === undefined)
            continue;
        rebuildColumn(x, y, height);
        const ccx = (x / chunkSize) | 0;
        const ccy = (y / chunkSize) | 0;
        chunkState.dirtyChunks.add(`${ccx},${ccy}`);
    }
}
export function markDirty(x, y) {
    const cx = (x / chunkSize) | 0;
    const cy = (y / chunkSize) | 0;
    chunkState.dirtyChunks.add(`${cx},${cy}`);
}
export function redrawAllChunks() {
    for (let cy = 0; cy < chunkState.chunkRows; cy++) {
        for (let cx = 0; cx < chunkState.chunkCols; cx++) {
            chunkState.dirtyChunks.add(`${cx},${cy}`);
        }
    }
}
export function applyWaterLevel() {
    if (!mapState.blockMap)
        return;
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    const maxH = sizeState.maxHeight;
    const waterId = 126;
    const waterLevel = mapState.waterLevel;
    for (let z = 0; z < height; z++) {
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < maxH; y++) {
                const layer = mapState.blockMap[y];
                const row = layer?.[z];
                if (row?.[x] === waterId) {
                    row[x] = 0;
                }
            }
            for (let y = 0; y <= waterLevel; y++) {
                if (y >= maxH)
                    break;
                const layer = mapState.blockMap[y];
                const row = layer?.[z];
                if (row?.[x] === 0) {
                    row[x] = waterId;
                }
            }
        }
    }
    for (let cy = 0; cy < chunkState.chunkRows; cy++) {
        for (let cx = 0; cx < chunkState.chunkCols; cx++) {
            chunkState.dirtyChunks.add(`${cx},${cy}`);
        }
    }
}
//# sourceMappingURL=index.js.map