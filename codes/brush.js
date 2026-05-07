import { 
  sizeState, brushState, mouseState, mapState, chunkSize, cellSize, stackState, cameraState
} from "./state.js";
import { heightClamp, lerp } from "./utils.js";
import { applyColumnChanges, markDirty } from "./chunk.js";
import { nameToId } from "./nameMap.js";

let currentStroke = null;
let strokeMap = null;

export function beginStroke() {
  currentStroke = [];
  strokeMap = new Map();
}

export function endStroke() {
  if (!strokeMap || strokeMap.size === 0) return;

  currentStroke = Array.from(strokeMap.values());

  stackState.undoStack.push(currentStroke);
  if (stackState.undoStack.length > stackState.MAX_HISTORY) {
    stackState.undoStack.shift();
  }

  stackState.redoStack.length = 0;

  currentStroke = null;
  strokeMap = null;
}

function recordChange(x, y, before, after, type = "height") {
  const key = `${type}:${x},${y}`;

  if (!strokeMap || strokeMap === null || !strokeMap.has(key)) {
    strokeMap.set(key, { x, y, before, after, type });
  } else {
    strokeMap.get(key).after = after;
  }
}

function normalBrush(cellX, cellY) {
  const r = brushState.brushRadius;
  const changed = new Set();

  const brushData =
    brushState.brushType !== "default"
      ? brushState.loadedBrushes[brushState.brushType]
      : null;

  const brushWidth = brushData ? brushData[0].length : 0;
  const brushHeight = brushData ? brushData.length : 0;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= sizeState.widthLength || y >= sizeState.heightLength) continue;

      const distance = Math.hypot(dx, dy);
      if (distance > r) continue;

      const oldH = mapState.map[y][x];
      const normalized = Math.pow(1 - distance / r, 2);

      let strength = normalized;
      if (brushData) {
        const imgX = Math.floor(((dx + r) / (2 * r)) * brushWidth);
        const imgY = Math.floor(((dy + r) / (2 * r)) * brushHeight);
        const brushStrength = brushData[imgY]?.[imgX] ?? 0;
        strength *= brushStrength;
      }

      let newH = oldH;

      if (mouseState.leftDown) {
        if (brushState.mode === "flatten" && brushState.targetHeight !== null) {
          newH = heightClamp(lerp(oldH, brushState.targetHeight, 0.08 * strength));
        } else {
          newH = heightClamp(oldH + (r - distance) * 0.03 * strength);
        }
      } else if (mouseState.rightDown) {
        if (brushState.mode !== "flatten") {
          newH = heightClamp(oldH - (r - distance) * 0.03 * strength);
        }
      }

      if (brushState.atOrAboveEnabled && newH < brushState.orAboveRangeInput) continue;
      if (brushState.atOrBelowEnabled && newH > brushState.atOrBelowRangeInput) continue;

      if (oldH === newH) continue;

      recordChange(x, y, oldH, newH, "height");

      mapState.map[y][x] = newH;
      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function smoothBrush(cellX, cellY) {
  const r = brushState.brushRadius;
  const changed = new Set();

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;

      if (x < 1 || y < 1 || x >= sizeState.widthLength - 1 || y >= sizeState.heightLength - 1) continue;
      if (dx * dx + dy * dy > r * r) continue;

      const oldH = mapState.map[y][x];

      const avg =
        (oldH +
          mapState.map[y][x - 1] +
          mapState.map[y][x + 1] +
          mapState.map[y - 1][x] +
          mapState.map[y + 1][x]) /
        5;

      const strength = 0.5 * (1 - (dx * dx + dy * dy) / (r * r));
      const newH = heightClamp(lerp(oldH, avg, strength));

      if (brushState.atOrAboveEnabled && newH < brushState.orAboveRangeInput) continue;
      if (brushState.atOrBelowEnabled && newH > brushState.atOrBelowRangeInput) continue;

      if (oldH === newH) continue;

      recordChange(x, y, oldH, newH, "height");

      mapState.map[y][x] = newH;
      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function sprayBrush(cellX, cellY) {
  const density = brushState.brushRadius * 3;

  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * brushState.brushRadius;

    const dx = Math.round(Math.cos(angle) * radius);
    const dz = Math.round(Math.sin(angle) * radius);

    const x = cellX + dx;
    const z = cellY + dz;

    if (x < 0 || z < 0 || x >= sizeState.widthLength || z >= sizeState.heightLength) continue;
    if (!mouseState.leftDown) continue;

    const oldBlock = mapState.topBlockMap[z][x];
    const newBlock = nameToId[brushState.selectedBlock];

    if (brushState.atOrAboveEnabled && mapState.map[z][x] < brushState.orAboveRangeInput) continue;
    if (brushState.atOrBelowEnabled && mapState.map[z][x] > brushState.atOrBelowRangeInput) continue;

    if (oldBlock === newBlock) continue;

    recordChange(x, z, oldBlock, newBlock, "block");

    mapState.topBlockMap[z][x] = newBlock;
    markDirty(x, z);
  }
}

function layerBrush(cellX, cellY) {
  const r = brushState.brushRadius;
  const r2 = r * r;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;

      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= sizeState.widthLength || y >= sizeState.heightLength) continue;

      const oldLayer = mapState.layerMap[y][x];
      const newLayer = mouseState.leftDown ? brushState.selectedLayer : null;

      if (brushState.atOrAboveEnabled && mapState.map[y][x] < brushState.orAboveRangeInput) continue;
      if (brushState.atOrBelowEnabled && mapState.map[y][x] > brushState.atOrBelowRangeInput) continue;

      if (oldLayer === newLayer) continue;

      recordChange(x, y, oldLayer, newLayer, "layer");

      mapState.layerMap[y][x] = newLayer;
      markDirty(x, y);
    }
  }
}

export function applyBrush() {
  const size = cellSize * cameraState.zoom;
  const cellX = Math.floor((mouseState.mouseX - cameraState.camX) / size);
  const cellY = Math.floor((mouseState.mouseY - cameraState.camY) / size);

  if (
    cellX < 0 ||
    cellY < 0 ||
    cellX >= sizeState.widthLength ||
    cellY >= sizeState.heightLength
  )
    return;

  if (!mouseState.leftDown && !mouseState.rightDown) return;

  switch (brushState.mode) {
    case "smooth":
      smoothBrush(cellX, cellY);
      break;
    case "sprayPaint":
      sprayBrush(cellX, cellY);
      break;
    case "layerPaint":
      layerBrush(cellX, cellY);
      break;
    default:
      normalBrush(cellX, cellY);
  }
}