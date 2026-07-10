import { sizeState } from "../states/index.js";

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