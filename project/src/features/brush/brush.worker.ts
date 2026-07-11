type HeightMap = Float32Array;
type SyncBrushImagesMsg = {
  type: "syncBrushImages";
  loadedBrushes: Record<string, number[][]>;
};

interface WorkerState {
  map: HeightMap | null;
  width: number;
  height: number;
  loadedBrushes: Record<string, number[][]>;
}

const state: WorkerState = {
  map: null,
  width: 0,
  height: 0,
  loadedBrushes: {},
};

function idx(x: number, y: number): number {
  return y * state.width + x;
}

function getHeightAt(x: number, y: number): number | undefined {
  if (!state.map) return undefined;
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return undefined;
  return state.map[idx(x, y)];
}

function heightClamp(v: number, maxHeight: number): number {
  return Math.max(0, Math.min(maxHeight, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface RangeFilter {
  above: { enabled: boolean; input: number };
  below: { enabled: boolean; input: number };
}

interface BrushParams {
  cellX: number;
  cellY: number;
  radius: number;
  mode: string;
  targetHeight: number | null;
  leftDown: boolean;
  rightDown: boolean;
  rangeFilter: RangeFilter;
  maxHeight: number;
  intensity: number;
  threshold: number;
  brushType: string;
}

interface ChangedCell {
  x: number;
  y: number;
  oldH: number;
  newH: number;
}

function computeNormalBrush(params: BrushParams): ChangedCell[] {
  const {
    cellX, cellY, radius: r, leftDown, rightDown, mode, targetHeight,
    rangeFilter, maxHeight, intensity, threshold, brushType
  } = params;

  const changed: ChangedCell[] = [];
  if (!state.map) return changed;

  const r2 = r * r;

  const brushImageData = brushType !== "default" ? state.loadedBrushes[brushType] ?? null : null;
  const brushWidth = brushImageData?.[0]?.length ?? 0;
  const brushHeight = brushImageData?.length ?? 0;

  for (let dy = -r; dy <= r; dy++) {
    const y = cellY + dy;
    if (y < 0 || y >= state.height) continue;

    const dxMax = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));

    for (let dx = -dxMax; dx <= dxMax; dx++) {
      const x = cellX + dx;
      if (x < 0 || x >= state.width) continue;

      const distSq = dx * dx + dy * dy;
      const distance = Math.sqrt(distSq);

      const oldH = getHeightAt(x, y);
      if (oldH === undefined) continue;

      let strength: number;

      if (brushImageData) {
        const imgX = Math.floor(((dx + r) / (2 * r)) * brushWidth);
        const imgY = Math.floor(((dy + r) / (2 * r)) * brushHeight);
        strength = brushImageData[imgY]?.[imgX] ?? 0;
      } else {
        strength = Math.pow(1 - distance / r, 2);
      }

      let newH = oldH;
      if (leftDown) {
        if (mode === "flatten" && targetHeight !== null) {
          newH = heightClamp(lerp(oldH, targetHeight, intensity * strength), maxHeight);
        } else if (brushImageData) {
          newH = heightClamp(oldH + intensity * strength * (r / 4), maxHeight); 
        } else {
          newH = heightClamp(oldH + (r - distance) * intensity * strength, maxHeight);
        }
      } else if (rightDown) {
        if (mode !== "flatten") {
          if (brushImageData) {
            newH = heightClamp(oldH - intensity * strength * 10, maxHeight);
          } else {
            newH = heightClamp(oldH - (r - distance) * intensity * strength, maxHeight);
          }
        }
      }

      if (rangeFilter.above.enabled && newH < rangeFilter.above.input) continue;
      if (rangeFilter.below.enabled && newH > rangeFilter.below.input) continue;
      if (Math.abs(newH - oldH) < threshold) continue;

      state.map[idx(x, y)] = newH;
      changed.push({ x, y, oldH, newH });
    }
  }

  return changed;
}

function computeSmoothBrush(params: BrushParams): ChangedCell[] {
  const { cellX, cellY, radius: r, rangeFilter, maxHeight, intensity, threshold } = params;
  const changed: ChangedCell[] = [];
  if (!state.map) return changed;

  const r2 = r * r;

  for (let dy = -r; dy <= r; dy++) {
    const y = cellY + dy;
    if (y < 1 || y >= state.height - 1) continue;

    const dxMax = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));

    for (let dx = -dxMax; dx <= dxMax; dx++) {
      const x = cellX + dx;
      if (x < 1 || x >= state.width - 1) continue;

      const oldH = getHeightAt(x, y);
      if (oldH === undefined) continue;

      const left = getHeightAt(x - 1, y) ?? oldH;
      const right = getHeightAt(x + 1, y) ?? oldH;
      const up = getHeightAt(x, y - 1) ?? oldH;
      const down = getHeightAt(x, y + 1) ?? oldH;

      const avg = (oldH + left + right + up + down) / 5;
      const strength = 0.5 * (1 - (dx * dx + dy * dy) / r2) * intensity;
      const newH = heightClamp(lerp(oldH, avg, strength), maxHeight);

      if (rangeFilter.above.enabled && newH < rangeFilter.above.input) continue;
      if (rangeFilter.below.enabled && newH > rangeFilter.below.input) continue;
      if (Math.abs(newH - oldH) < threshold) continue;

      state.map[idx(x, y)] = newH;
      changed.push({ x, y, oldH, newH });
    }
  }

  return changed;
}

type WorkerMessage =
  | { type: "init"; width: number; height: number; buffer: SharedArrayBuffer }
  | { type: "applyBrush"; brushMode: "normal" | "smooth"; params: BrushParams }
  | SyncBrushImagesMsg;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "init": {
      state.width = msg.width;
      state.height = msg.height;
      state.map = new Float32Array(msg.buffer);
      break;
    }
    case "applyBrush": {
      const changed =
        msg.brushMode === "smooth"
          ? computeSmoothBrush(msg.params)
          : computeNormalBrush(msg.params);

      (self as unknown as Worker).postMessage({ type: "brushResult", changed });
      break;
    }
    case "syncBrushImages": {
      state.loadedBrushes = msg.loadedBrushes;
      break;
    }
  }
};

export {};