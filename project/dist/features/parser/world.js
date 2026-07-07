import { getBounds } from "./decode.js";
import { resizeHeightEmpty, resizeMapEmpty } from "../chunk/index.js";
import { chunkSize } from "../../core/constants.js";
import { sizeState, mapState, getHeight, setBlock } from "../../states/index.js";
import { create3D } from "../../core/utils.js";
function getMaxUsedHeight() {
    if (!mapState.map)
        return 0;
    let max = 0;
    for (let z = 0; z < sizeState.heightLength; z++) {
        for (let x = 0; x < sizeState.widthLength; x++) {
            const h = getHeight(z, x);
            if (h !== undefined && h > max)
                max = h;
        }
    }
    return max;
}
function applyParsed(result, bounds) {
    if (!mapState.blockMap)
        return;
    for (const b of result.blocks) {
        if (b.id === 0)
            continue;
        const x = b.x - bounds.minX;
        const y = b.y - bounds.minY;
        const z = b.z - bounds.minZ;
        if (x < 0 || z < 0 ||
            x >= sizeState.widthLength ||
            z >= sizeState.heightLength ||
            y >= sizeState.maxHeight)
            continue;
        setBlock(y, z, x, b.id);
    }
    rebuildHeight();
}
function rebuildHeight() {
    if (!mapState.blockMap || !mapState.map || !mapState.topBlockMap)
        return;
    const blockMap = mapState.blockMap;
    const map = mapState.map;
    const topBlockMap = mapState.topBlockMap;
    for (let z = 0; z < sizeState.heightLength; z++) {
        const mapRow = map[z];
        const topRow = topBlockMap[z];
        if (!mapRow || !topRow)
            continue;
        for (let x = 0; x < sizeState.widthLength; x++) {
            let found = false;
            for (let y = sizeState.maxHeight - 1; y >= 0; y--) {
                const layer = blockMap[y];
                const layerRow = layer?.[z];
                const blockId = layerRow?.[x];
                if (blockId !== undefined && blockId !== 0) {
                    mapRow[x] = y;
                    topRow[x] = blockId;
                    found = true;
                    break;
                }
            }
            if (!found) {
                mapRow[x] = 0;
                topRow[x] = null;
            }
        }
    }
}
export async function loadSchemAsWorld(result) {
    const bounds = getBounds(result.blocks);
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const depth = bounds.maxZ - bounds.minZ + 1;
    await resizeMapEmpty(Math.ceil(width / chunkSize), Math.ceil(depth / chunkSize));
    await resizeHeightEmpty(height);
    mapState.blockMap = create3D(sizeState.maxHeight, sizeState.heightLength, sizeState.widthLength, 0);
    applyParsed(result, bounds);
}
export function convertChunks() {
    if (!mapState.blockMap)
        return undefined;
    const blockMap = mapState.blockMap;
    const chunks = [];
    const chunkCountX = sizeState.chunkLenX;
    const chunkCountZ = sizeState.chunkLenZ;
    const maxUsedHeight = getMaxUsedHeight();
    const chunkCountY = Math.ceil(maxUsedHeight / chunkSize);
    for (let cx = 0; cx < chunkCountX; cx++) {
        for (let cz = 0; cz < chunkCountZ; cz++) {
            for (let cy = 0; cy < chunkCountY; cy++) {
                const blocks = [];
                for (let x = 0; x < chunkSize; x++) {
                    for (let y = 0; y < chunkSize; y++) {
                        for (let z = 0; z < chunkSize; z++) {
                            const wx = cx * chunkSize + x;
                            const wz = cz * chunkSize + z;
                            const wy = cy * chunkSize + y;
                            let id = 0;
                            if (wx < sizeState.widthLength && wz < sizeState.heightLength && wy < sizeState.maxHeight) {
                                const surfaceBlock = blockMap[wy]?.[wz]?.[wx];
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
        if (c.x < minCX)
            minCX = c.x;
        if (c.y < minCY)
            minCY = c.y;
        if (c.z < minCZ)
            minCZ = c.z;
        if (c.x > maxCX)
            maxCX = c.x;
        if (c.y > maxCY)
            maxCY = c.y;
        if (c.z > maxCZ)
            maxCZ = c.z;
    }
    for (const c of chunks) {
        c.x -= minCX;
        c.y -= minCY;
        c.z -= minCZ;
    }
    const sizeX = (maxCX - minCX + 1) * chunkSize;
    const sizeY = (maxCY - minCY + 1) * chunkSize;
    const sizeZ = (maxCZ - minCZ + 1) * chunkSize;
    const pos = [0, 0, 0];
    const size = [sizeX, sizeY, sizeZ];
    return {
        name: mapState.fileName || "schem",
        pos,
        size,
        chunks,
    };
}
//# sourceMappingURL=world.js.map