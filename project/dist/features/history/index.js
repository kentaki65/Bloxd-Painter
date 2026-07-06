import { stackState, mapState } from "../../states/index.js";
import { applyColumnChanges, markDirty } from "../chunk/index.js";
let currentStroke = null;
let strokeMap = null;
export function beginStroke() {
    currentStroke = [];
    strokeMap = new Map();
}
export function endStroke() {
    if (!strokeMap || strokeMap.size === 0)
        return;
    currentStroke = Array.from(strokeMap.values());
    stackState.undoStack.push(currentStroke);
    if (stackState.undoStack.length > stackState.MAX_HISTORY) {
        stackState.undoStack.shift();
    }
    stackState.redoStack.length = 0;
    currentStroke = null;
    strokeMap = null;
}
export function recordChange(x, y, before, after, type) {
    if (!strokeMap)
        return;
    const key = `${type}:${x},${y}`;
    const existing = strokeMap.get(key);
    if (!existing) {
        strokeMap.set(key, { x, y, before, after, type });
    }
    else {
        existing.after = after;
    }
}
export function undo() {
    const stroke = stackState.undoStack.pop();
    if (!stroke)
        return;
    const heightChanged = new Set();
    for (const c of stroke) {
        if (c.type === "height") {
            const row = mapState.map?.[c.y];
            if (row)
                row[c.x] = c.before;
            heightChanged.add(`${c.x},${c.y}`);
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
    const heightChanged = new Set();
    for (const c of stroke) {
        if (c.type === "height") {
            const row = mapState.map?.[c.y];
            if (row)
                row[c.x] = c.after;
            heightChanged.add(`${c.x},${c.y}`);
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