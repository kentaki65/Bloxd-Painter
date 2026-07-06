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
//# sourceMappingURL=utils.js.map