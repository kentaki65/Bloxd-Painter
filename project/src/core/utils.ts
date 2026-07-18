import { getBlock, mapState, sizeState, tryGetHeight } from "../states/index.js";
import { blockColors, DEFAULT_COLOR } from "./constants.js";
import { idToName, LayerStruct } from "./types.js";

export const heightClamp = (v:number) => {
  return Math.max(0, Math.min(sizeState.maxHeight, v));
}

export const lerp = (a:number, b:number, t:number) => { 
  return a + (b - a) * t; 
}

export function resize2D<T>(
  oldArray: (T[] | undefined)[],
  newRows: number,
  newCols: number,
  fallback: T
): T[][] {
  return Array.from({ length: newRows }, (_, y) =>
    Array.from({ length: newCols }, (_, x) =>
      oldArray?.[y]?.[x] ?? fallback
    )
  );
};

export function resize3D<T>(
  oldArray: (T[][] | undefined)[],
  layers: number,
  newRows: number,
  newCols: number,
  fallback: T
): T[][][] {
  return Array.from({ length: layers }, (_, y) =>
    Array.from({ length: newRows }, (_, z) =>
      Array.from({ length: newCols }, (_, x) =>
        oldArray?.[y]?.[z]?.[x] ?? fallback
      )
    )
  );
}

export function create2D<T>(rows: number, cols: number, value: T): T[][]{
  return Array.from({ length: rows }, () =>
      new Array(cols).fill(value)
    )
}

export function create3D<T>(layer: number, rows: number, cols: number, value: T): T[][][]{
  return Array.from({ length: layer }, () =>
      Array.from({ length: rows }, () =>
        new Array(cols).fill(value)
      )
    );
}

export function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return el as T;
}

export function createSharedFloat2D(rows: number, cols: number, value: number): Float32Array {
  const buffer = new SharedArrayBuffer(rows * cols * Float32Array.BYTES_PER_ELEMENT);
  const arr = new Float32Array(buffer);
  if (value !== 0) arr.fill(value);
  return arr;
}

export function resizeSharedFloat2D(
  oldArray: Float32Array | null,
  oldRows: number,
  oldCols: number,
  newRows: number,
  newCols: number,
  fallback: number
): Float32Array {
  const newArr = createSharedFloat2D(newRows, newCols, fallback);
  if (!oldArray) return newArr;

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

export function toSharedFloat32(source: Float32Array): Float32Array {
  const shared = new Float32Array(new SharedArrayBuffer(source.length * Float32Array.BYTES_PER_ELEMENT));
  shared.set(source);
  return shared;
}

export function parseJsonWithInfinity(text: string): LayerStruct[] {
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
      if (ch === '"') inString = false;
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

export function validateBlockLayers(json: unknown): string[] {
  const errorMessages: string[] = [];

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

    const { depth, block } = data as Record<string, unknown>;

    const depthOk =
      typeof depth === "number" &&
      !Number.isNaN(depth) &&
      (Number.isInteger(depth) || depth === Infinity) &&
      depth > 0;

    const blockOk =
      typeof block === "number" &&
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

  const last = json[json.length - 1] as Record<string, unknown> | undefined;
  if (last && last.depth !== Infinity) {
    errorMessages.push(`The last layer's "depth" must be Infinity`);
  }

  return errorMessages;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function buildColorLUT(): Uint8Array {
  const maxId = Object.keys(idToName).reduce(
    (max, k) => Math.max(max, Number(k)),
    0
  );
  const lut = new Uint8Array((maxId + 1) * 3);

  for (let id = 0; id <= maxId; id++) {
    const name = idToName[id] ?? "Air";
    const base = blockColors[name] ?? DEFAULT_COLOR;
    const o = id * 3;
    lut[o]     = base[0] ?? 0;
    lut[o + 1] = base[1] ?? 0;
    lut[o + 2] = base[2] ?? 0;
  }

  return lut;
}

export function buildBlockIdMap(): Uint16Array | undefined{
  if (!mapState.map || !mapState.topBlockMap || !mapState.blockMap) {
    return;
  }

  const w = sizeState.widthLength;
  const h = sizeState.heightLength;
  const out = new Uint16Array(w * h);

  for (let y = 0; y < h; y++) {
    const row = mapState.topBlockMap[y];
    for (let x = 0; x < w; x++) {
      const height = tryGetHeight(y, x) ?? 0;
      const topY = Math.min(sizeState.maxHeight - 1, Math.max(0, Math.floor(height)));

      const topValue = row?.[x];
      const layerValue = getBlock(topY, y, x);

      const blockId: number =
        topValue != null ? topValue : layerValue != null ? layerValue : 0;

      out[y * w + x] = blockId;
    }
  }

  return out;
}

export function buildLayerNameToId(
  layerColors: Partial<Record<string, number[]>>
): Map<string, number> {
  const map = new Map<string, number>();
  map.set("none", 0); // "none" = レイヤーなし。予約してID0(透明)に固定する
  let nextId = 1;
  for (const name of Object.keys(layerColors)) {
    if (name === "none") continue; // 既に0番として予約済みなので重複させない
    map.set(name, nextId++);
  }
  return map;
}

export function buildLayerIdMap(
  layerMap: (string | null)[][] | null,
  layerNameToId: Map<string, number>,
  width: number,
  height: number
): Uint8Array | undefined {
  if (!layerMap) return undefined;

  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = layerMap[y];
    for (let x = 0; x < width; x++) {
      const layer = row?.[x];
      out[y * width + x] = layer ? (layerNameToId.get(layer) ?? 0) : 0;
    }
  }
  return out;
}

export function buildLayerColorLUT(
  layerColors: Partial<Record<string, number[]>>,
  layerNameToId: Map<string, number>
): Uint8Array {
  const maxId = layerNameToId.size;
  const lut = new Uint8Array(maxId * 4);

  for (const [name, id] of layerNameToId) {
    if (id === 0) continue;
    const c = layerColors[name];
    const o = id * 4;
    lut[o]     = c?.[0] ?? 0;
    lut[o + 1] = c?.[1] ?? 0;
    lut[o + 2] = c?.[2] ?? 0;
    lut[o + 3] = 255;
  }
  return lut;
}