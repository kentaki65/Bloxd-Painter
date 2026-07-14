// src/features/render/render.worker.ts

interface WorkerState {
  map: Float32Array | null;
  width: number;
  height: number;
  maxHeight: number;
  waterLevel: number;

  topBlockMap: (number | null)[][] | null;
  layerMap: (string | null)[][] | null;
  blockMap: number[][][] | null; // [y][z][x]

  blockColors: Record<string, number[]>;
  layerColors: Record<string, number[]>;
  idToName: Record<number, string>;
  selectedLayer: string | null;

  chunkSize: number;
  contour: number;
}

const state: WorkerState = {
  map: null,
  width: 0,
  height: 0,
  maxHeight: 0,
  waterLevel: 0,
  topBlockMap: null,
  layerMap: null,
  blockMap: null,
  blockColors: {},
  layerColors: {},
  idToName: {},
  selectedLayer: null,
  chunkSize: 32,
  contour: 1,
};

const DEFAULT_COLOR = [255, 0, 255];

function idx(x: number, y: number): number {
  return y * state.width + x;
}

function tryGetHeight(y: number, x: number): number | undefined {
  if (!state.map) return undefined;
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return undefined;
  return state.map[idx(x, y)];
}

function tryGetTopBlock(y: number, x: number): number | null | undefined {
  return state.topBlockMap?.[y]?.[x];
}

function getBlock(yy: number, z: number, x: number): number | undefined {
  return state.blockMap?.[yy]?.[z]?.[x];
}

const colorCache = new Map<string, [number, number, number]>();

function getColorRGB(blockName: string): [number, number, number] {
  const cached = colorCache.get(blockName);
  if (cached) return cached;

  const base = state.blockColors[blockName] ?? DEFAULT_COLOR;
  const rgb: [number, number, number] = [base[0] ?? 0, base[1] ?? 0, base[2] ?? 0];
  colorCache.set(blockName, rgb);
  return rgb;
}

function blendPixel(
  data: Uint8ClampedArray,
  offset: number,
  r: number, g: number, b: number, alpha: number
): void {
  if (alpha >= 1) {
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
    return;
  }
  const inv = 1 - alpha;
  data[offset] = (data[offset] ?? 0) * inv + r * alpha;
  data[offset + 1] = (data[offset + 1] ?? 0) * inv + g * alpha;
  data[offset + 2] = (data[offset + 2] ?? 0) * inv + b * alpha;
  data[offset + 3] = 255;
}

interface ContourLine {
  x1: number; y1: number; x2: number; y2: number;
}

async function renderChunkToImageBitmap(cx: number, cy: number, cellSize: number, zoom: number): Promise<ImageBitmap | null> {
  const chunkSize = state.chunkSize;
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = Math.min(startX + chunkSize, state.width);
  const endY = Math.min(startY + chunkSize, state.height);

  const cellsW = endX - startX;
  const cellsH = endY - startY;
  if (cellsW <= 0 || cellsH <= 0) return null;

  if (!state.map || !state.layerMap || !state.topBlockMap || !state.blockMap) return null;

  const imgData = new ImageData(cellsW, cellsH);
  const data = imgData.data;

  const contourLines: ContourLine[] = [];

  for (let y = startY; y < endY; y++) {
    const layerRow = state.layerMap[y];
    if (!layerRow) continue;

    for (let x = startX; x < endX; x++) {
      const h = tryGetHeight(y, x) ?? 0;

      const topY = Math.min(state.maxHeight - 1, Math.max(0, Math.floor(h)));
      const topValue = tryGetTopBlock(y, x);
      const layerValue = getBlock(topY, y, x);

      const blockId: number =
        topValue != null ? topValue : layerValue != null ? layerValue : 0;

      const blockName = state.idToName[blockId] ?? "Air";
      const [r, g, b] = getColorRGB(blockName);

      const px = x - startX;
      const py = y - startY;
      const offset = (py * cellsW + px) * 4;

      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;

      const hLeft = tryGetHeight(y, x - 1) ?? h;
      const hUp = tryGetHeight(y - 1, x) ?? h;
      const shadowStrength = Math.max(hLeft - h, hUp - h);
      if (shadowStrength > 0) {
        blendPixel(data, offset, 0, 0, 0, Math.min(0.6, shadowStrength * 0.08));
      }

      if (h < state.waterLevel) {
        blendPixel(data, offset, 135, 206, 235, 0.5);
      }

      const layer = layerRow[x];
      if (layer) {
        const c = state.layerColors[layer];
        if (c) {
          const cr = c[0] ?? 0;
          const cg = c[1] ?? 0;
          const cb = c[2] ?? 0;
          blendPixel(data, offset, cr, cg, cb, 0.6);
        }
      }

      const level = (h / state.contour) | 0;

      if (x < state.width - 1) {
        const rightLevel = ((tryGetHeight(y, x + 1) ?? 0) / state.contour) | 0;
        if (level !== rightLevel) {
          contourLines.push({ x1: px + 1, y1: py, x2: px + 1, y2: py + 1 });
        }
      }
      if (y < state.height - 1) {
        const downLevel = ((tryGetHeight(y + 1, x) ?? 0) / state.contour) | 0;
        if (level !== downLevel) {
          contourLines.push({ x1: px, y1: py + 1, x2: px + 1, y2: py + 1 });
        }
      }
    }
  }

  const offCanvas = new OffscreenCanvas(cellsW * cellSize, cellsH * cellSize);
  const octx = offCanvas.getContext("2d")!;
  octx.imageSmoothingEnabled = false;

  const smallCanvas = new OffscreenCanvas(cellsW, cellsH);
  const sctx = smallCanvas.getContext("2d")!;
  sctx.putImageData(imgData, 0, 0);

  octx.drawImage(smallCanvas, 0, 0, cellsW, cellsH, 0, 0, cellsW * cellSize, cellsH * cellSize);

  if (contourLines.length > 0) {
    octx.beginPath();
    for (const line of contourLines) {
      octx.moveTo(line.x1 * cellSize, line.y1 * cellSize);
      octx.lineTo(line.x2 * cellSize, line.y2 * cellSize);
    }
    octx.strokeStyle = "black";
    octx.lineWidth = Math.max(1, 2 / zoom);
    octx.stroke();
  }

  return offCanvas.transferToImageBitmap();
}

type InitMsg = {
  type: "init";
  width: number; height: number; maxHeight: number; waterLevel: number;
  mapBuffer: SharedArrayBuffer;
  topBlockMap: (number | null)[][];
  layerMap: (string | null)[][];
  blockMap: number[][][];
  blockColors: Record<string, number[]>;
  layerColors: Record<string, number[]>;
  idToName: Record<number, string>;
  selectedLayer: string | null;
  chunkSize: number;
  contour: number;
};

type SyncStateMsg = {
  type: "syncState";
  topBlockMap?: (number | null)[][];
  layerMap?: (string | null)[][];
  blockMap?: number[][][];
  waterLevel?: number;
  selectedLayer?: string | null;
  layerColors?: Partial<Record<string, number[]>>
};

type RenderChunkMsg = {
  type: "renderChunk";
  requestId: number;
  cx: number; cy: number; cellSize: number; zoom: number;
};

type WorkerMessage = InitMsg | SyncStateMsg | RenderChunkMsg;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "init": {
      state.width = msg.width;
      state.height = msg.height;
      state.maxHeight = msg.maxHeight;
      state.waterLevel = msg.waterLevel;
      state.map = new Float32Array(msg.mapBuffer);
      state.topBlockMap = msg.topBlockMap;
      state.layerMap = msg.layerMap;
      state.blockMap = msg.blockMap;
      state.blockColors = msg.blockColors;
      state.layerColors = msg.layerColors;
      state.idToName = msg.idToName;
      state.selectedLayer = msg.selectedLayer;
      state.chunkSize = msg.chunkSize;
      state.contour = msg.contour;
      break;
    }

    case "syncState": {
      if (msg.topBlockMap !== undefined) state.topBlockMap = msg.topBlockMap;
      if (msg.layerMap !== undefined) state.layerMap = msg.layerMap;
      if (msg.blockMap !== undefined) state.blockMap = msg.blockMap;
      if (msg.waterLevel !== undefined) state.waterLevel = msg.waterLevel;
      if (msg.selectedLayer !== undefined) state.selectedLayer = msg.selectedLayer;
      if (msg.layerColors !== undefined) state.layerColors = Object.fromEntries(Object.entries(msg.layerColors).filter(([_, v]) => v !== undefined)) as Record<string, number[]>;
      break;
    }

    case "renderChunk": {
      const bitmap = await renderChunkToImageBitmap(msg.cx, msg.cy, msg.cellSize, msg.zoom);
      (self as unknown as Worker).postMessage(
        { type: "chunkResult", requestId: msg.requestId, cx: msg.cx, cy: msg.cy, bitmap },
        bitmap ? [bitmap] : []
      );
      break;
    }
  }
};

export {};