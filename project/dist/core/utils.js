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
//# sourceMappingURL=utils.js.map