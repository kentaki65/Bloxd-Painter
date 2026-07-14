import { getBounds } from "./decode.js";
import { resizeHeightEmpty, resizeMapEmpty } from "../chunk/index.js";
import { chunkSize } from "../../core/constants.js";
import { sizeState, mapState, getHeight, setBlock } from "../../states/index.js";
import { create3D } from "../../core/utils.js";
import { Bounds, ParsedResult, RawSchemInput, RawChunkData } from "../../core/types.js";
import { getBlock } from "../../states/index.js";
import { reinitBrushWorkerMap } from "../brush/workerBridge.js";
import { reinitRenderWorkerMap } from "../render/renderBridge.js";

function getMaxUsedHeight(): number {
  if(!mapState.map) return 0;

  let max = 0;
  for (let z = 0; z < sizeState.heightLength; z++) {
    for (let x = 0; x < sizeState.widthLength; x++) {
      const h = getHeight(z, x);
      if(h !== undefined && h > max) max = h;
    }
  }
  return max;
}

function applyParsed(result: ParsedResult, bounds: Bounds): void {
  if(!mapState.blockMap) return;

  for (const b of result.blocks) {
    if (b.id === 0) continue;

    const x = b.x - bounds.minX;
    const y = b.y - bounds.minY;
    const z = b.z - bounds.minZ;

    if (
      x < 0 || z < 0 ||
      x >= sizeState.widthLength ||
      z >= sizeState.heightLength ||
      y >= sizeState.maxHeight
    ) continue;

    setBlock(y, z, x, b.id);
  }

  rebuildHeight();
}

function rebuildHeight(): void {
  if (!mapState.blockMap || !mapState.map || !mapState.topBlockMap) return;

  const blockMap = mapState.blockMap;
  const map = mapState.map;
  const topBlockMap = mapState.topBlockMap;
  const width = sizeState.widthLength;

  for (let z = 0; z < sizeState.heightLength; z++) {
    const topRow = topBlockMap[z];
    if (!topRow) continue;

    const rowOffset = z * width;

    for (let x = 0; x < width; x++) {
      let found = false;

      for (let y = sizeState.maxHeight - 1; y >= 0; y--) {
        const layer = blockMap[y];
        const layerRow = layer?.[z];
        const blockId = layerRow?.[x];

        if (blockId !== undefined && blockId !== 0) {
          map[rowOffset + x] = y;
          topRow[x] = blockId;
          found = true;
          break;
        }
      }

      if (!found) {
        map[rowOffset + x] = 0;
        topRow[x] = null;
      }
    }
  }
}

export async function loadSchemAsWorld(result: ParsedResult): Promise<void> {
  const bounds = getBounds(result.blocks);

  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const depth = bounds.maxZ - bounds.minZ + 1;

  await resizeMapEmpty(Math.ceil(width / chunkSize), Math.ceil(depth / chunkSize));
  await resizeHeightEmpty(height);

  mapState.blockMap = create3D(sizeState.maxHeight, sizeState.heightLength, sizeState.widthLength, 0);

  applyParsed(result, bounds);

  reinitBrushWorkerMap();
  reinitRenderWorkerMap();
}

export function convertChunks(): RawSchemInput | undefined {
  const chunks: RawChunkData[] = [];
  const chunkCountX = sizeState.chunkLenX;
  const chunkCountZ = sizeState.chunkLenZ;
  const maxUsedHeight = getMaxUsedHeight();
  const chunkCountY = Math.ceil(maxUsedHeight / chunkSize);

  for (let cx = 0; cx < chunkCountX; cx++) {
    for (let cz = 0; cz < chunkCountZ; cz++) {
      for (let cy = 0; cy < chunkCountY; cy++) {
        const blocks: number[] = [];

        for (let x = 0; x < chunkSize; x++) {
          for (let y = 0; y < chunkSize; y++) {
            for (let z = 0; z < chunkSize; z++) {
              const wx = cx * chunkSize + x;
              const wz = cz * chunkSize + z;
              const wy = cy * chunkSize + y;
              let id = 0;

              if (wx < sizeState.widthLength && wz < sizeState.heightLength && wy < sizeState.maxHeight) {
                const surfaceBlock = getBlock(wy, wz, wx);
                if (surfaceBlock !== undefined && surfaceBlock !== 0) {
                  id = surfaceBlock;
                }
              }

              blocks.push(id);
            }
          }
        }

        chunks.push({ x: cx, y: cy, z: cz, blocks });
      }
    }
  }

  let minCX = Infinity, minCY = Infinity, minCZ = Infinity;
  let maxCX = -Infinity, maxCY = -Infinity, maxCZ = -Infinity;

  for (const c of chunks) {
    if (c.x < minCX) minCX = c.x;
    if (c.y < minCY) minCY = c.y;
    if (c.z < minCZ) minCZ = c.z;
    if (c.x > maxCX) maxCX = c.x;
    if (c.y > maxCY) maxCY = c.y;
    if (c.z > maxCZ) maxCZ = c.z;
  }

  for (const c of chunks) {
    c.x -= minCX;
    c.y -= minCY;
    c.z -= minCZ;
  }

  const sizeX = (maxCX - minCX + 1) * chunkSize;
  const sizeY = (maxCY - minCY + 1) * chunkSize;
  const sizeZ = (maxCZ - minCZ + 1) * chunkSize;

  const pos: [number, number, number] = [0, 0, 0];
  const size: [number, number, number] = [sizeX, sizeY, sizeZ];

  return {
    name: mapState.fileName || "schem",
    pos,
    size,
    chunks,
  };
}