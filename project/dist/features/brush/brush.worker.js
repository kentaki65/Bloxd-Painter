const state = {
    map: null,
    width: 0,
    height: 0,
};
function idx(x, y) {
    return y * state.width + x;
}
function getHeightAt(x, y) {
    if (!state.map)
        return undefined;
    if (x < 0 || y < 0 || x >= state.width || y >= state.height)
        return undefined;
    return state.map[idx(x, y)];
}
function heightClamp(v, maxHeight) {
    return Math.max(0, Math.min(maxHeight, v));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function computeNormalBrush(params) {
    const { cellX, cellY, radius: r, leftDown, rightDown, mode, targetHeight, rangeFilter, maxHeight, } = params;
    const changed = [];
    if (!state.map)
        return changed;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
        const y = cellY + dy;
        if (y < 0 || y >= state.height)
            continue;
        const dxMax = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
        for (let dx = -dxMax; dx <= dxMax; dx++) {
            const x = cellX + dx;
            if (x < 0 || x >= state.width)
                continue;
            const distSq = dx * dx + dy * dy;
            const distance = Math.sqrt(distSq);
            const oldH = getHeightAt(x, y);
            if (oldH === undefined)
                continue;
            const normalized = Math.pow(1 - distance / r, 2);
            let newH = oldH;
            if (leftDown) {
                if (mode === "flatten" && targetHeight !== null) {
                    newH = heightClamp(lerp(oldH, targetHeight, 0.08 * normalized), maxHeight);
                }
                else {
                    newH = heightClamp(oldH + (r - distance) * 0.03 * normalized, maxHeight);
                }
            }
            else if (rightDown) {
                if (mode !== "flatten") {
                    newH = heightClamp(oldH - (r - distance) * 0.03 * normalized, maxHeight);
                }
            }
            if (rangeFilter.above.enabled && newH < rangeFilter.above.input)
                continue;
            if (rangeFilter.below.enabled && newH > rangeFilter.below.input)
                continue;
            if (newH === oldH)
                continue;
            state.map[idx(x, y)] = newH;
            changed.push({ x, y, oldH, newH });
        }
    }
    return changed;
}
function computeSmoothBrush(params) {
    const { cellX, cellY, radius: r, rangeFilter, maxHeight } = params;
    const changed = [];
    if (!state.map)
        return changed;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
        const y = cellY + dy;
        if (y < 1 || y >= state.height - 1)
            continue;
        const dxMax = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
        for (let dx = -dxMax; dx <= dxMax; dx++) {
            const x = cellX + dx;
            if (x < 1 || x >= state.width - 1)
                continue;
            const oldH = getHeightAt(x, y);
            if (oldH === undefined)
                continue;
            const left = getHeightAt(x - 1, y) ?? oldH;
            const right = getHeightAt(x + 1, y) ?? oldH;
            const up = getHeightAt(x, y - 1) ?? oldH;
            const down = getHeightAt(x, y + 1) ?? oldH;
            const avg = (oldH + left + right + up + down) / 5;
            const strength = 0.5 * (1 - (dx * dx + dy * dy) / r2);
            const newH = heightClamp(lerp(oldH, avg, strength), maxHeight);
            if (rangeFilter.above.enabled && newH < rangeFilter.above.input)
                continue;
            if (rangeFilter.below.enabled && newH > rangeFilter.below.input)
                continue;
            if (oldH === newH)
                continue;
            state.map[idx(x, y)] = newH;
            changed.push({ x, y, oldH, newH });
        }
    }
    return changed;
}
self.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
        case "init": {
            state.width = msg.width;
            state.height = msg.height;
            state.map = new Float32Array(msg.buffer);
            break;
        }
        case "applyBrush": {
            const changed = msg.brushMode === "smooth"
                ? computeSmoothBrush(msg.params)
                : computeNormalBrush(msg.params);
            self.postMessage({ type: "brushResult", changed });
            break;
        }
    }
};
export {};
//# sourceMappingURL=brush.worker.js.map