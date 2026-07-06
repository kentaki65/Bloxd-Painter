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