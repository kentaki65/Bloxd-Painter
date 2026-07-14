import { sizeState } from "../states/index.js";
export const heightClamp = (v) => {
    return Math.max(0, Math.min(sizeState.maxHeight, v));
};
export const lerp = (a, b, t) => {
    return a + (b - a) * t;
};
export function resize2D(oldArray, newRows, newCols, fallback) {
    return Array.from({ length: newRows }, (_, y) => Array.from({ length: newCols }, (_, x) => oldArray?.[y]?.[x] ?? fallback));
}
;
export function resize3D(oldArray, layers, newRows, newCols, fallback) {
    return Array.from({ length: layers }, (_, y) => Array.from({ length: newRows }, (_, z) => Array.from({ length: newCols }, (_, x) => oldArray?.[y]?.[z]?.[x] ?? fallback)));
}
export function create2D(rows, cols, value) {
    return Array.from({ length: rows }, () => new Array(cols).fill(value));
}
export function create3D(layer, rows, cols, value) {
    return Array.from({ length: layer }, () => Array.from({ length: rows }, () => new Array(cols).fill(value)));
}
export function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Element with id "${id}" not found`);
    }
    return el;
}
export function createSharedFloat2D(rows, cols, value) {
    const buffer = new SharedArrayBuffer(rows * cols * Float32Array.BYTES_PER_ELEMENT);
    const arr = new Float32Array(buffer);
    if (value !== 0)
        arr.fill(value);
    return arr;
}
export function resizeSharedFloat2D(oldArray, oldRows, oldCols, newRows, newCols, fallback) {
    const newArr = createSharedFloat2D(newRows, newCols, fallback);
    if (!oldArray)
        return newArr;
    const copyRows = Math.min(oldRows, newRows);
    const copyCols = Math.min(oldCols, newCols);
    for (let y = 0; y < copyRows; y++) {
        const oldOffset = y * oldCols;
        const newOffset = y * newCols;
        for (let x = 0; x < copyCols; x++) {
            newArr[newOffset + x] = oldArray[oldOffset + x] ?? fallback;
        }
    }
    return newArr;
}
export function toSharedFloat32(source) {
    const shared = new Float32Array(new SharedArrayBuffer(source.length * Float32Array.BYTES_PER_ELEMENT));
    shared.set(source);
    return shared;
}
export function parseJsonWithInfinity(text) {
    let result = "";
    let inString = false;
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (inString) {
            result += ch;
            if (ch === "\\") {
                result += text[i + 1] ?? "";
                i += 2;
                continue;
            }
            if (ch === '"')
                inString = false;
            i++;
            continue;
        }
        if (ch === '"') {
            inString = true;
            result += ch;
            i++;
            continue;
        }
        if (text.startsWith("-Infinity", i)) {
            result += "-1e400";
            i += "-Infinity".length;
            continue;
        }
        if (text.startsWith("Infinity", i)) {
            result += "1e400";
            i += "Infinity".length;
            continue;
        }
        result += ch;
        i++;
    }
    return JSON.parse(result);
}
export function validateBlockLayers(json) {
    const errorMessages = [];
    if (!Array.isArray(json)) {
        return ["Incorrect format: expected an array"];
    }
    if (json.length === 0) {
        return ["Incorrect format: array is empty"];
    }
    let prevDepth = -Infinity;
    json.forEach((data, i) => {
        const lineNo = i + 1;
        if (typeof data !== "object" || data === null) {
            errorMessages.push(`Line ${lineNo}: "depth" and "block" must be numbers`);
            return;
        }
        const { depth, block } = data;
        const depthOk = typeof depth === "number" &&
            !Number.isNaN(depth) &&
            (Number.isInteger(depth) || depth === Infinity) &&
            depth > 0;
        const blockOk = typeof block === "number" &&
            Number.isInteger(block) &&
            Number.isFinite(block);
        if (!depthOk || !blockOk) {
            errorMessages.push(`Line ${lineNo}: "depth" and "block" must be numbers`);
            return;
        }
        if (depth <= prevDepth) {
            errorMessages.push(`Line ${lineNo}: "depth" must be greater than the previous line`);
        }
        prevDepth = depth;
    });
    const last = json[json.length - 1];
    if (last && last.depth !== Infinity) {
        errorMessages.push(`The last layer's "depth" must be Infinity`);
    }
    return errorMessages;
}
export function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
}
//# sourceMappingURL=utils.js.map