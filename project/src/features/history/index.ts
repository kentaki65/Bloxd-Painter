import { stackState, mapState, sizeState } from "../../states/index.js";
import { applyColumnChanges } from "../chunk/index.js";
import { Change, Stroke, ChangeType } from "../../core/types.js";
import { setHeight } from "../../states/index.js";
import { renderFullTerrain } from "../render/render.js";

let heightMap: Map<number, Change> | null = null;
let blockMap: Map<number, Change> | null = null;
let layerMap: Map<number, Change> | null = null;

export function beginStroke(): void {
  heightMap = new Map();
  blockMap = new Map();
  layerMap = new Map();
}

export function endStroke() {
  const size = (heightMap?.size ?? 0) + (blockMap?.size ?? 0) + (layerMap?.size ?? 0);
  if (size === 0) return;

  const currentStroke: Stroke = [
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

export function recordChange(
  x: number, y: number,
  before: number, after: number,
  type: "height" | "block"
): void;

export function recordChange(
  x: number, y: number,
  before: string | null, after: string | null,
  type: "layer"
): void;

export function recordChange(
  x: number, y: number,
  before: number | string | null,
  after: number | string | null,
  type: ChangeType
): void {
  const width = sizeState.widthLength;
  const key = y * width + x;

  const targetMap = type === "height" ? heightMap : type === "block" ? blockMap : layerMap;
  if (!targetMap) return;

  const existing = targetMap.get(key);
  if (!existing) {
    targetMap.set(key, { x, y, before, after, type } as Change);
  } else {
    (existing as { after: typeof after }).after = after;
  }
}

export function undo(): void {
  const stroke = stackState.undoStack.pop();
  if (!stroke) return;

  const heightChanged = new Map<string, number>();

  for (const c of stroke) {
    if (c.type === "height") {
      setHeight(c.y, c.x, c.before);
      heightChanged.set(`${c.x},${c.y}`, c.after);
    }
    else if (c.type === "block") {
      const row = mapState.topBlockMap?.[c.y];
      if (row) row[c.x] = c.before;
      renderFullTerrain();
    }
    else if (c.type === "layer") {
      const row = mapState.layerMap?.[c.y];
      if (row) row[c.x] = c.before;
      renderFullTerrain()
    }
  }

  stackState.redoStack.push(stroke);

  if (heightChanged.size > 0) {
    applyColumnChanges(heightChanged);
  }
}

export function redo() {
  if(!mapState.map || !mapState.topBlockMap || !mapState.layerMap) return;

  const stroke = stackState.redoStack.pop();
  if (!stroke) return;

  const heightChanged = new Map<string, number>();

  for (const c of stroke) {
    if (c.type === "height") {
      setHeight(c.y, c.x, c.after);
      heightChanged.set(`${c.x},${c.y}`, c.before);
    }
    else if (c.type === "block") {
      const row = mapState.topBlockMap?.[c.y];
      if (row) row[c.x] = c.after;
      renderFullTerrain();
    }
    else if (c.type === "layer") {
      const row = mapState.layerMap?.[c.y];
      if (row) row[c.x] = c.after;
      renderFullTerrain();
    }
  }

  stackState.undoStack.push(stroke);

  if (heightChanged.size > 0) {
    applyColumnChanges(heightChanged);
  }
}