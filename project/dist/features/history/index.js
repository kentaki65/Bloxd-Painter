import { stackState, mapState, sizeState } from "../../states/index.js";
import { applyColumnChanges, markDirty } from "../chunk/index.js";
import { setHeight } from "../../states/index.js";
let heightMap = null;
let blockMap = null;
let layerMap = null;
export function beginStroke() {
    heightMap = new Map();
    blockMap = new Map();
    layerMap = new Map();
}
export function endStroke() {
    const size = (heightMap?.size ?? 0) + (blockMap?.size ?? 0) + (layerMap?.size ?? 0);
    if (size === 0)
        return;
    const currentStroke = [
        ...(heightMap?.values() ?? []),
        ...(blockMap?.values() ?? []),
        ...(layerMap?.values() ?? []),
    ];
    stackState.undoStack.push(currentStroke);
    if (stackState.undoStack.length > stackState.MAX_HISTORY) {
        stackState.undoStack.shift();
    }
    stackState.redoStack.length = 0;
    heightMap = null;
    blockMap = null;
    layerMap = null;
}
export function recordChange(x, y, before, after, type) {
    const width = sizeState.widthLength;
    const key = y * width + x;
    const targetMap = type === "height" ? heightMap : type === "block" ? blockMap : layerMap;
    if (!targetMap)
        return;
    const existing = targetMap.get(key);
    if (!existing) {
        targetMap.set(key, { x, y, before, after, type });
    }
    else {
        existing.after = after;
    }
}
export function undo() {
    const stroke = stackState.undoStack.pop();
    if (!stroke)
        return;
    const heightChanged = new Map();
    for (const c of stroke) {
        if (c.type === "height") {
            setHeight(c.y, c.x, c.before);
            heightChanged.set(`${c.x},${c.y}`, c.after);
        }
        else if (c.type === "block") {
            const row = mapState.topBlockMap?.[c.y];
            if (row)
                row[c.x] = c.before;
            markDirty(c.x, c.y);
        }
        else if (c.type === "layer") {
            const row = mapState.layerMap?.[c.y];
            if (row)
                row[c.x] = c.before;
            markDirty(c.x, c.y);
        }
    }
    stackState.redoStack.push(stroke);
    if (heightChanged.size > 0) {
        applyColumnChanges(heightChanged);
    }
}
export function redo() {
    if (!mapState.map || !mapState.topBlockMap || !mapState.layerMap)
        return;
    const stroke = stackState.redoStack.pop();
    if (!stroke)
        return;
    const heightChanged = new Map();
    for (const c of stroke) {
        if (c.type === "height") {
            setHeight(c.y, c.x, c.after);
            heightChanged.set(`${c.x},${c.y}`, c.before);
        }
        else if (c.type === "block") {
            const row = mapState.topBlockMap?.[c.y];
            if (row)
                row[c.x] = c.after;
            markDirty(c.x, c.y);
        }
        else if (c.type === "layer") {
            const row = mapState.layerMap?.[c.y];
            if (row)
                row[c.x] = c.after;
            markDirty(c.x, c.y);
        }
    }
    stackState.undoStack.push(stroke);
    if (heightChanged.size > 0) {
        applyColumnChanges(heightChanged);
    }
}
//# sourceMappingURL=index.js.map