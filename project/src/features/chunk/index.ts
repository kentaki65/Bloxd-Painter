import { chunkState, sizeState, brushState, mapState, getHeight, setHeight, tryGetTopBlock } from "../../states/index.js";
import { chunkSize, LEAF_BLOCKS } from "../../core/constants.js";
import { resize2D, resize3D, create2D, create3D, createSharedFloat2D, resizeSharedFloat2D } from "../../core/utils.js";
import { runLoading } from "../UI/loading.js";
import { setBlock, getBlock, getTopBlock } from "../../states/index.js";
import { syncRenderWorkerState } from "../render/renderBridge.js";

export async function resizeMap(newChunkX: number, newChunkZ: number) {
  await runLoading(async () => {
    const oldChunkCanvas = chunkState.chunkCanvas;
    if (!oldChunkCanvas) return;

    const oldCols = chunkState.chunkCols;
    const oldRows = chunkState.chunkRows;

    const oldWidth = sizeState.widthLength;
    const oldHeight = sizeState.heightLength;

    const newWidth = newChunkX * chunkSize;
    const newHeight = newChunkZ * chunkSize;

    const oldMap = mapState.map;
    const oldBlockMap = mapState.blockMap;
    const oldLayerMap = mapState.layerMap;
    const oldTopBlockMap = mapState.topBlockMap;

    if (!oldMap || !oldBlockMap || !oldLayerMap || !oldTopBlockMap) return;

    const newMap = resizeSharedFloat2D(oldMap, oldHeight, oldWidth, newHeight, newWidth, 0);
    const newBlockMap = resize3D(oldBlockMap, sizeState.maxHeight, newHeight, newWidth, 0);
    const newTopBlockMap = resize2D(oldTopBlockMap, newHeight, newWidth, 4);
    const newLayerMap = resize2D(oldLayerMap, newHeight, newWidth, null);

    sizeState.chunkLenX = newChunkX;
    sizeState.chunkLenZ = newChunkZ;

    mapState.map = newMap;
    mapState.blockMap = newBlockMap;
    mapState.layerMap = newLayerMap;
    mapState.topBlockMap = newTopBlockMap;

    const newCols = Math.ceil(newWidth / chunkSize);
    const newRows = Math.ceil(newHeight / chunkSize);

    const newChunkCanvas = Array.from({ length: newRows }, (_, cy) =>
      Array.from({ length: newCols }, (_, cx) => {
        const chunkRows = oldChunkCanvas[cy];

        return (cy < oldRows && cx < oldCols)
          ? chunkRows?.[cx] ?? null
          : null;
      })
    );

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

export async function resizeMapEmpty(newChunkX: number, newChunkZ: number) {
  await runLoading(async () => {

    const newWidth = newChunkX * chunkSize;
    const newHeight = newChunkZ * chunkSize;

    mapState.map = createSharedFloat2D(newHeight, newWidth, 0);
    mapState.blockMap = create3D(sizeState.maxHeight, newHeight, newWidth, 1);
    mapState.topBlockMap = create2D(newHeight, newWidth, 4);
    mapState.layerMap = create2D(newHeight, newWidth, null)

    sizeState.chunkLenX = newChunkX;
    sizeState.chunkLenZ = newChunkZ;

    chunkState.chunkCols = newChunkX;
    chunkState.chunkRows = newChunkZ;

    chunkState.chunkCanvas = create2D(newChunkZ, newChunkX, null);

    chunkState.dirtyChunks.clear();

    redrawAllChunks(newChunkZ, newChunkX);
  });
}

export async function resizeHeight(newMaxHeight: number){
  await runLoading(async () => {
    const old = mapState.blockMap;
    const map = mapState.map;
    if(!old || !map) return;

    const width = sizeState.widthLength;
    const height = sizeState.heightLength;

    const newMap3D = resize3D(old, newMaxHeight, height, width, 0);

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const value = getHeight(z, x);
        if (value !== undefined && value >= newMaxHeight) {
          setHeight(z, x, newMaxHeight - 1);
        }
      }
    }

    sizeState.maxHeight = newMaxHeight;
    mapState.blockMap = newMap3D;

    redrawAllChunks();
  });
}

export async function resizeHeightEmpty(newMaxHeight: number){
  await runLoading(async () => {

    const width = sizeState.widthLength;
    const height = sizeState.heightLength;

    mapState.blockMap = create3D(newMaxHeight, height, width, 0);

    sizeState.maxHeight = newMaxHeight;

    redrawAllChunks();
  });
}

export function rebuildColumn(x: number, y: number, height: number, oldHeight?: number) {
  if (!mapState.blockMap || !mapState.topBlockMap) return;

  const maxH = sizeState.maxHeight;
  const safeTop = Math.min(maxH - 1, Math.floor(height));

  if (oldHeight !== undefined && Math.floor(oldHeight) === safeTop) return;

  const topLayer = brushState.blockLayers[0];
  if (!topLayer) return;

  let layerIndex = 0;
  let remaining = topLayer.depth;

  for (let yy = safeTop; yy >= 0; yy--) {
    if (remaining <= 0) {
      layerIndex++;
      remaining = brushState.blockLayers[layerIndex]?.depth ?? Infinity;
    }

    const layer = brushState.blockLayers[layerIndex];
    if (!layer) break;

    if (!setBlock(yy, y, x, layer.block)) continue;
    remaining--;
  }

  for (let yy = safeTop + 1; yy < maxH; yy++) {
    setBlock(yy, y, x, 0);
  }

  const override = tryGetTopBlock(y, x);
  if (override !== undefined && override !== null) {
    setBlock(safeTop, y, x, override);
  }
}

export function applyColumnChanges(changed: Map<string, number>): void {
  if (!mapState.map) return;

  for (const [key, oldH] of changed) {
    const [x, y] = key.split(",").map(Number);
    if (x === undefined || y === undefined) continue;

    const height = getHeight(y, x);
    if (height === undefined) continue;

    rebuildColumn(x, y, height, oldH);
    const ccx = (x / chunkSize) | 0;
    const ccy = (y / chunkSize) | 0;
    
    chunkState.dirtyChunks.add(`${ccx},${ccy}`);
  }
  syncRenderWorkerState();
}

export function markDirty(x: number, y: number) {
  const cx = (x / chunkSize) | 0;
  const cy = (y / chunkSize) | 0;
  chunkState.dirtyChunks.add(`${cx},${cy}`);
}

export function redrawAllChunks(rows = chunkState.chunkRows, cols = chunkState.chunkCols): void{
  for(let cy = 0; cy < rows; cy++){
    for(let cx = 0; cx < cols; cx++){
      chunkState.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

export function applyWaterLevel(): void {
  if (!mapState.blockMap) return;

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
        if (y >= maxH) break;

        const layer = mapState.blockMap[y];
        const row = layer?.[z];
        if (row?.[x] === 0) {
          row[x] = waterId;
        }
      }
    }
  }
  redrawAllChunks();
  syncRenderWorkerState();
}