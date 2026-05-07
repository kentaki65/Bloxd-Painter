const LEAF_BLOCKS = new Set([
  100,101,102,103,
  208,209,210,211,
  491,492,493,
  494,495,496,
  1259, 2019, 2020, 2021, 2022, 2023, 2024, 2025
]);
import { chunkState, sizeState, chunkSize, brushState, stackState, mapState } from "./state.js";


export async function resizeMap(newChunkX, newChunkZ) {
  await runLoading(async () => {

    const oldCols = chunkState.chunkCols;
    const oldRows = chunkState.chunkRows;

    const newWidth = newChunkX * chunkSize;
    const newHeight = newChunkZ * chunkSize;

    const oldMap = mapState.map;
    const oldBlockMap = mapState.blockMap;
    const oldLayerMap = mapState.layerMap;

    const newMap = Array.from({ length: newHeight }, (_, y) =>
      Array.from({ length: newWidth }, (_, x) =>
        oldMap[y]?.[x] ?? 0
      )
    );

    const newBlockMap = Array.from({ length: sizeState.maxHeight }, (_, y) =>
      Array.from({ length: newHeight }, (_, z) =>
        Array.from({ length: newWidth }, (_, x) =>
          oldBlockMap[y]?.[z]?.[x] ?? 0
        )
      )
    );

    const newLayerMap = Array.from({ length: newHeight }, (_, y) =>
      Array.from({ length: newWidth }, (_, x) =>
        oldLayerMap[y]?.[x] ?? null
      )
    );

    sizeState.chunkLenX = newChunkX;
    sizeState.chunkLenZ = newChunkZ;

    mapState.map = newMap;
    mapState.blockMap = newBlockMap;
    mapState.layerMap = newLayerMap;

    const newCols = Math.ceil(newWidth / chunkSize);
    const newRows = Math.ceil(newHeight / chunkSize);

    const newChunkCanvas = Array.from({ length: newRows }, (_, cy) =>
      Array.from({ length: newCols }, (_, cx) =>
        (cy < oldRows && cx < oldCols)
          ? chunkState.chunkCanvas[cy][cx]
          : null
      )
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

export async function resizeMapEmpty(newChunkX, newChunkZ) {
  await runLoading(async () => {

    const newWidth = newChunkX * chunkSize;
    const newHeight = newChunkZ * chunkSize;

    mapState.map = Array.from({ length: newHeight }, () =>
      new Array(newWidth).fill(0)
    );

    mapState.blockMap = Array.from({ length: sizeState.maxHeight }, () =>
      Array.from({ length: newHeight }, () =>
        new Array(newWidth).fill(0)
      )
    );

    mapState.topBlockMap = Array.from({ length: newHeight }, () =>
      new Array(newWidth).fill(null)
    );
    
    mapState.layerMap = Array.from({ length: newHeight }, () =>
      new Array(newWidth).fill(null)
    );

    sizeState.chunkLenX = newChunkX;
    sizeState.chunkLenZ = newChunkZ;

    chunkState.chunkCols = newChunkX;
    chunkState.chunkRows = newChunkZ;

    chunkState.chunkCanvas = Array.from({ length: newChunkZ }, () =>
      new Array(newChunkX).fill(null)
    );

    chunkState.dirtyChunks.clear();

    for (let cy = 0; cy < newChunkZ; cy++) {
      for (let cx = 0; cx < newChunkX; cx++) {
        chunkState.dirtyChunks.add(`${cx},${cy}`);
      }
    }

  });
}

export async function resizeHeight(newMaxHeight){
  await runLoading(async () => {

    const old = mapState.blockMap;
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;

    const newMap3D = Array.from({ length: newMaxHeight }, (_, y) =>
      Array.from({ length: height }, (_, z) =>
        Array.from({ length: width }, (_, x) =>
          old[y]?.[z]?.[x] ?? 0
        )
      )
    );

    // 高さクランプ
    for(let z = 0; z < height; z++){
      for(let x = 0; x < width; x++){
        if(mapState.map[z][x] >= newMaxHeight){
          mapState.map[z][x] = newMaxHeight - 1;
        }
      }
    }

    sizeState.maxHeight = newMaxHeight;
    mapState.blockMap = newMap3D;

    for(let cy = 0; cy < chunkState.chunkRows; cy++){
      for(let cx = 0; cx < chunkState.chunkCols; cx++){
        chunkState.dirtyChunks.add(`${cx},${cy}`);
      }
    }

  });
}

export async function resizeHeightEmpty(newMaxHeight){
  await runLoading(async () => {

    const width = sizeState.widthLength;
    const height = sizeState.heightLength;

    mapState.blockMap = Array.from({ length: newMaxHeight }, () =>
      Array.from({ length: height }, () =>
        new Array(width).fill(0)
      )
    );

    sizeState.maxHeight = newMaxHeight;

    for(let cy = 0; cy < chunkState.chunkRows; cy++){
      for(let cx = 0; cx < chunkState.chunkCols; cx++){
        chunkState.dirtyChunks.add(`${cx},${cy}`);
      }
    }

  });
}

export function rebuildColumn(x, y, height){
  const safeTop = Math.min(sizeState.maxHeight - 1, Math.floor(height));

  for (let yy = safeTop; yy >= 0; yy--) {
    const block = mapState.blockMap[yy]?.[y]?.[x];
    if (LEAF_BLOCKS.has(block)) {
      return;
    }
  }

  let layerIndex = 0;
  let remaining = brushState.blockLayers[0].depth;

  for(let yy = safeTop; yy >= 0; yy--){
    if(remaining <= 0){
      layerIndex++;
      remaining = brushState.blockLayers[layerIndex]?.depth ?? Infinity;
    }

    const layer = brushState.blockLayers[layerIndex];
    mapState.blockMap[yy][y][x] = layer.block;

    remaining--;
  }

  for(let yy = safeTop + 1; yy < sizeState.maxHeight; yy++){
    mapState.blockMap[yy][y][x] = 0;
  }

  const override = mapState.topBlockMap[y]?.[x];
  if (override !== null && override !== undefined) {
    mapState.blockMap[safeTop][y][x] = override;
  }
}

export function applyColumnChanges(changed){
  for (const key of changed) {
    const [x, y] = key.split(",").map(Number);

    rebuildColumn(x, y, mapState.map[y][x]);

    const ccx = (x / chunkSize)|0;
    const ccy = (y / chunkSize)|0;
    chunkState.dirtyChunks.add(`${ccx},${ccy}`);
  }
}

export function markDirty(x, y) {
  const cx = (x / chunkSize) | 0;
  const cy = (y / chunkSize) | 0;
  chunkState.dirtyChunks.add(`${cx},${cy}`);
}

export function redrawAllChunks(){
  for(let cy = 0; cy < chunkState.chunkRows; cy++){
    for(let cx = 0; cx < chunkState.chunkCols; cx++){
      chunkState.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

export function getBlock(x, y, z){

}

export function setBlock(x, y, z, id){

}