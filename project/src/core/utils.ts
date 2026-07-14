import { sizeState } from "../states/index.js";
import { LayerStruct } from "./types.js";

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