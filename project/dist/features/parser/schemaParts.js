import { sizeState, mapState, getLayer, inBounds, getHeight } from "../../states/index.js";
function cloneBlockMap(blockMap) {
    return blockMap.map(layer => layer.map(row => [...row]));
}
function getRootAnchor(blocks) {
    let minY = Infinity;
    let anchorDx = 0;
    let anchorDz = 0;
    for (const b of blocks) {
        if (b.y < minY) {
            minY = b.y;
            anchorDx = b.x;
            anchorDz = b.z;
        }
    }
    return { dx: anchorDx, dz: anchorDz, minY };
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
export function exportWithStamps(targetLayer, options) {
    if (!mapState.blockMap)
        throw new Error("blockMap is not initialized");
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
        const layer = getLayer(z, x);
        if (!inBounds(z, x))
            return false;
        if (layer !== targetLayer)
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
function stampAt(originX, originZ, schem, anchor) {
    const anchorWorldX = originX + anchor.dx;
    const anchorWorldZ = originZ + anchor.dz;
    const groundY = getHeight(anchorWorldZ, anchorWorldX);
    if (groundY === undefined)
        return [];
    const groundYInt = Math.round(groundY);
    return schem.blocks.map(b => ({
        x: originX + b.x,
        y: groundYInt + (b.y - anchor.minY),
        z: originZ + b.z,
        id: b.id,
    }));
}
export function stampSchemOnLayer(options) {
    const { schem, targetLayer } = options;
    const anchor = getRootAnchor(schem.blocks);
    const footprint = getFootprint(schem.blocks);
    const origins = pickStampOrigins(options);
    const result = [];
    for (const { x, z } of origins) {
        if (!fitsWithinLayer(x, z, footprint, targetLayer))
            continue;
        result.push(...stampAt(x, z, schem, anchor));
    }
    return result;
}
//# sourceMappingURL=schemaParts.js.map