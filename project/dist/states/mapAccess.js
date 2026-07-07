import { mapState } from "./mapState.js";
const test = true;
const LOGOFF = true;
function warnMissing(label, z, x, reason) {
    if (LOGOFF)
        return;
    if (test)
        console.trace(`[${label}] missing at z=${z}, x=${x} (${reason})`);
    else
        console.warn(`[${label}] missing at z=${z}, x=${x} (${reason})`);
}
export function tryGetHeight(z, x) {
    return mapState.map?.[z]?.[x];
}
export function tryGetTopBlock(z, x) {
    return mapState.topBlockMap?.[z]?.[x];
}
export function getHeight(z, x) {
    if (!mapState.map) {
        warnMissing("getHeight", z, x, "map is null");
        return undefined;
    }
    const row = mapState.map[z];
    if (row === undefined) {
        warnMissing("getHeight", z, x, "row out of range");
        return undefined;
    }
    const h = row[x];
    if (h === undefined) {
        warnMissing("getHeight", z, x, "cell out of range");
        return undefined;
    }
    return h;
}
export function getTopBlock(z, x) {
    if (!mapState.topBlockMap) {
        warnMissing("getTopBlock", z, x, "topBlockMap is null");
        return undefined;
    }
    const row = mapState.topBlockMap[z];
    if (row === undefined) {
        warnMissing("getTopBlock", z, x, "row out of range");
        return undefined;
    }
    const block = row[x];
    if (block === null || block === undefined) {
        warnMissing("getTopBlock", z, x, "cell is null/undefined");
        return undefined;
    }
    return block;
}
export function getLayer(z, x) {
    if (!mapState.layerMap) {
        warnMissing("getLayer", z, x, "layerMap is null");
        return undefined;
    }
    const row = mapState.layerMap[z];
    if (row === undefined) {
        warnMissing("getLayer", z, x, "row out of range");
        return undefined;
    }
    return row[x];
}
export function getBlock(y, z, x) {
    if (!mapState.blockMap) {
        warnMissing("getBlock", z, x, `blockMap is null (y=${y})`);
        return undefined;
    }
    const layer = mapState.blockMap[y];
    if (layer === undefined) {
        warnMissing("getBlock", z, x, `y layer out of range (y=${y})`);
        return undefined;
    }
    const row = layer[z];
    if (row === undefined) {
        warnMissing("getBlock", z, x, "row out of range");
        return undefined;
    }
    const block = row[x];
    if (block === undefined) {
        warnMissing("getBlock", z, x, "cell out of range");
        return undefined;
    }
    return block;
}
export function setBlock(yy, z, x, value) {
    if (!mapState.blockMap) {
        warnMissing("setBlock", z, x, `blockMap is null (y=${yy})`);
        return false;
    }
    const layer = mapState.blockMap[yy];
    if (layer === undefined) {
        warnMissing("setBlock", z, x, `y layer out of range (y=${yy})`);
        return false;
    }
    const row = layer[z];
    if (row === undefined) {
        warnMissing("setBlock", z, x, "row out of range");
        return false;
    }
    row[x] = value;
    return true;
}
export function setHeight(z, x, value) {
    if (!mapState.map) {
        warnMissing("setHeight", z, x, "map is null");
        return false;
    }
    const row = mapState.map[z];
    if (row === undefined) {
        warnMissing("setHeight", z, x, "row out of range");
        return false;
    }
    row[x] = value;
    return true;
}
export function setTopBlock(z, x, value) {
    if (!mapState.topBlockMap) {
        warnMissing("setTopBlock", z, x, "topBlockMap is null");
        return false;
    }
    const row = mapState.topBlockMap[z];
    if (row === undefined) {
        warnMissing("setTopBlock", z, x, "row out of range");
        return false;
    }
    row[x] = value;
    return true;
}
export function setLayer(z, x, value) {
    if (!mapState.layerMap) {
        warnMissing("setLayer", z, x, "layerMap is null");
        return false;
    }
    const row = mapState.layerMap[z];
    if (row === undefined) {
        warnMissing("setLayer", z, x, "row out of range");
        return false;
    }
    row[x] = value;
    return true;
}
//# sourceMappingURL=mapAccess.js.map