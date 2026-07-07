import { heightClamp, lerp } from "../../core/utils.js";
import { sizeState, brushState, mouseState, mapState, cameraState, getTopBlock, getHeight, setTopBlock, setHeight, tryGetHeight, getLayer, setLayer } from "../../states/index.js";
import { cellSize, nameToId } from "../../core/constants.js";
import { applyColumnChanges, markDirty, rebuildColumn } from "../chunk/index.js";
import { recordChange } from "../history/index.js";

function normalBrush(cellX: number, cellY: number) {
  if(!mapState.map || !brushState.loadedBrushes) return;

  const r = brushState.brushRadius;
  const changed = new Set<string>();

  const brushData =
    brushState.brushType !== "default"
      ? brushState.loadedBrushes[brushState.brushType] ?? null
      : null;

  const brushWidth = brushData?.[0]?.length ?? 0;
  const brushHeight = brushData?.length ?? 0;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= sizeState.widthLength || y >= sizeState.heightLength) continue;

      const distance = Math.hypot(dx, dy);
      if (distance > r) continue;

      const oldH = getHeight(y, x);
      if(oldH === undefined) continue;

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

      if (brushState.rangeFilter.above.enabled && newH < brushState.rangeFilter.above.input) continue;
      if (brushState.rangeFilter.below.enabled && newH > brushState.rangeFilter.below.input) continue;

      if (oldH === newH) continue;

      recordChange(x, y, oldH, newH, "height");
      setHeight(y, x, newH);

      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function smoothBrush(cellX: number, cellY: number) {
  if(!mapState.map) return;

  const r = brushState.brushRadius;
  const changed = new Set<string>();

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cellX + dx;
      const y = cellY + dy;

      if (x < 1 || y < 1 || x >= sizeState.widthLength - 1 || y >= sizeState.heightLength - 1) continue;
      if (dx * dx + dy * dy > r * r) continue;

      const oldH = getHeight(y, x);
      if (oldH === undefined) continue;

      const left = tryGetHeight(y, x - 1) ?? oldH;
      const right = tryGetHeight(y, x + 1) ?? oldH;
      const up = tryGetHeight(y - 1, x) ?? oldH;
      const down = tryGetHeight(y + 1, x) ?? oldH;

      const avg = (oldH + left + right + up + down) / 5;

      const strength = 0.5 * (1 - (dx * dx + dy * dy) / (r * r));
      const newH = heightClamp(lerp(oldH, avg, strength));

      if (brushState.rangeFilter.above.enabled && newH < brushState.rangeFilter.above.input) continue;
      if (brushState.rangeFilter.below.enabled && newH > brushState.rangeFilter.above.input) continue;

      if (oldH === newH) continue;
      
      recordChange(x, y, oldH, newH, "height");
      setHeight(y, x, newH);

      changed.add(`${x},${y}`);
      markDirty(x, y);
    }
  }

  applyColumnChanges(changed);
}

function sprayBrush(cellX: number, cellY: number) {
  if(!mapState.topBlockMap || !mapState.map) return;

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

    const oldBlock = getTopBlock(z, x);
    if (oldBlock === undefined) continue;

    const newBlock = nameToId[brushState.selectedBlock];

    const h = getHeight(z, x);
    if (h === undefined) continue;

    if (brushState.rangeFilter.above.enabled && h < brushState.rangeFilter.above.input) continue;
    if (brushState.rangeFilter.below.enabled && h > brushState.rangeFilter.below.input) continue;

    if (oldBlock === newBlock) continue;

    recordChange(x, z, oldBlock, newBlock, "block");
    setTopBlock(z, x, newBlock);
    rebuildColumn(x, z, h); // ← 追加
    markDirty(x, z);
  }
}

function layerBrush(cellX: number, cellY: number) {
  if(!mapState.layerMap || !mapState.map) return;

  const r = brushState.brushRadius;
  const r2 = r * r;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;

      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= sizeState.widthLength || y >= sizeState.heightLength) continue;

      const oldLayer = getLayer(y, x);
      if(!oldLayer) continue;
      
      const newLayer = mouseState.leftDown ? brushState.selectedLayer : null;
      if(!newLayer) continue;

      const h = getHeight(y, x);
      if (h === undefined) continue;

      if (brushState.rangeFilter.above.enabled && h < brushState.rangeFilter.above.input) continue;
      if (brushState.rangeFilter.below.enabled && h > brushState.rangeFilter.below.input) continue;

      if (oldLayer === newLayer) continue;

      recordChange(x, y, oldLayer, newLayer, "layer");
      setLayer(y, x, newLayer);
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