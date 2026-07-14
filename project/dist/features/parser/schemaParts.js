import { sizeState, mapState, getLayer, inBounds, getHeight } from "../../states/index.js";
import { getBounds } from "./decode.js";
function collectPaintedCells(targetLayer) {
    const cells = [];
    for (let z = 0; z < sizeState.heightLength; z++) {
        for (let x = 0; x < sizeState.widthLength; x++) {
            if (getLayer(z, x) === targetLayer) {
                cells.push({ x, z });
            }
        }
    }
    return cells;
}
function cloneBlockMap(blockMap) {
    return blockMap.map(layer => layer.map(row => [...row]));
}
function setBlockOn(blockMapClone, y, z, x, value) {
    const layer = blockMapClone[y];
    if (!layer)
        return;
    const row = layer[z];
    if (!row)
        return;
    row[x] = value;
}
function exportWithStamps(targetLayer, options) {
    const clonedBlockMap = cloneBlockMap(mapState.blockMap);
    const stampedBlocks = stampSchemOnLayer(options);
    for (const b of stampedBlocks) {
        setBlockOn(clonedBlockMap, b.y, b.z, b.x, b.id);
    }
    return clonedBlockMap;
}
function pickStampOrigins(options) {
    const { minSpacing, density } = options;
    const origins = [];
    for (let z = 0; z < sizeState.heightLength; z += minSpacing) {
        for (let x = 0; x < sizeState.widthLength; x += minSpacing) {
            if (Math.random() > density)
                continue;
            const jitterX = Math.floor((Math.random() - 0.5) * minSpacing);
            const jitterZ = Math.floor((Math.random() - 0.5) * minSpacing);
            const px = x + jitterX;
            const pz = z + jitterZ;
            if (!inBounds(pz, px))
                continue;
            origins.push({ x: px, z: pz });
        }
    }
    return origins;
}
function fitsWithinLayer(originX, originZ, footprintCells, targetLayer) {
    for (const { dx, dz } of footprintCells) {
        const x = originX + dx;
        const z = originZ + dz;
        if (!inBounds(z, x))
            return false;
        if (getLayer(z, x) !== targetLayer)
            return false;
    }
    return true;
}
function getFootprint(blocks) {
    const seen = new Set();
    const footprint = [];
    for (const b of blocks) {
        const key = `${b.x},${b.z}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        footprint.push({ dx: b.x, dz: b.z });
    }
    return footprint;
}
function stampAt(originX, originZ, schem, minY) {
    const groundY = getHeight(originZ, originX);
    if (groundY === undefined)
        return [];
    return schem.blocks.map(b => ({
        x: originX + b.x,
        y: groundY + (b.y - minY),
        z: originZ + b.z,
        id: b.id,
    }));
}
export function stampSchemOnLayer(options) {
    const { schem, targetLayer } = options;
    const { minY } = getBounds(schem.blocks);
    const footprint = getFootprint(schem.blocks);
    const origins = pickStampOrigins(options);
    const result = [];
    for (const { x, z } of origins) {
        if (!fitsWithinLayer(x, z, footprint, targetLayer))
            continue;
        result.push(...stampAt(x, z, schem, minY));
    }
    return result;
}
//# sourceMappingURL=schemaParts.js.map