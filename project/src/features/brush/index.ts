import { sizeState, brushState, mouseState, mapState, cameraState, getTopBlock, getHeight, setTopBlock, getLayer, setLayer } from "../../states/index.js";
import { cellSize, nameToId } from "../../core/constants.js";
import { rebuildColumn } from "../chunk/index.js";
import { recordChange } from "../history/index.js";
import { updateTerrainBlockRegion, updateTerrainLayerRegion } from "../render/render.js";


export function getSlopeAngleAt(z: number, x: number): number {
   const center = getHeight(z, x);
   if (center === undefined) return 0;

   const left = getHeight(z, x - 1) ?? center;
   const right = getHeight(z, x + 1) ?? center;
   const up = getHeight(z - 1, x) ?? center;
   const down = getHeight(z + 1, x) ?? center;

   const gradX = (right - left) / 2;
   const gradY = (down - up) / 2;

  const rise = Math.sqrt(gradX * gradX + gradY * gradY);
  return Math.atan(rise) * (180 / Math.PI);
}

function sprayBrush(cellX: number, cellY: number) {
  if (!mapState.topBlockMap || !mapState.map) return;

  const r = brushState.brushRadius;
  const intensityRatio = Math.min(brushState.intensity / 0.1, 1);

  if (!mouseState.leftDown) return;

  const newBlock = nameToId[brushState.selectedBlock];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function tryPaint(x: number, z: number): void {
    if (x < 0 || z < 0 || x >= sizeState.widthLength || z >= sizeState.heightLength) return;

    const oldBlock = getTopBlock(z, x);
    if (oldBlock === undefined) return;

    const h = getHeight(z, x);
    if (h === undefined) return;

    const d = getSlopeAngleAt(z, x);

    if (brushState.rangeFilter.above.enabled && h < brushState.rangeFilter.above.input) return;
    if (brushState.rangeFilter.below.enabled && h > brushState.rangeFilter.below.input) return;
    if (brushState.rangeFilter.slopeAbove.enabled && d < brushState.rangeFilter.slopeAbove.input) return;
    if (brushState.rangeFilter.slopeBelow.enabled && d > brushState.rangeFilter.slopeBelow.input) return;
    if (oldBlock === newBlock) return;

    recordChange(x, z, oldBlock, newBlock, "block");
    setTopBlock(z, x, newBlock);
    rebuildColumn(x, z, h);

    minX = Math.min(minX, x);
    minY = Math.min(minY, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, z);
  }

  if (intensityRatio >= 1) {
    const r2 = r * r;
    for (let dz = -r; dz <= r; dz++) {
      const dxMax = Math.floor(Math.sqrt(r2 - dz * dz));
      for (let dx = -dxMax; dx <= dxMax; dx++) {
        if (dx * dx + dz * dz > r2) continue;
        tryPaint(cellX + dx, cellY + dz);
      }
    }
  } else {
    const density = r * 3 * intensityRatio;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * r;
      const dx = Math.round(Math.cos(angle) * radius);
      const dz = Math.round(Math.sin(angle) * radius);
      tryPaint(cellX + dx, cellY + dz);
    }
  }

  if (minX <= maxX && minY <= maxY) {
    updateTerrainBlockRegion(minX - 1, minY - 1, (maxX - minX) + 3, (maxY - minY) + 3);
  }
}

function layerBrush(cellX: number, cellY: number) {
  if (!mapState.layerMap || !mapState.map) return;

  const r = brushState.brushRadius;
  const r2 = r * r;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let dy = -r; dy <= r; dy++) {
    const dxMax = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let dx = -dxMax; dx <= dxMax; dx++) {
      if (dx * dx + dy * dy > r2) continue;

      const x = cellX + dx;
      const y = cellY + dy;
      if (x < 0 || y < 0 || x >= sizeState.widthLength || y >= sizeState.heightLength) continue;

      const oldLayer = getLayer(y, x);
      if (!oldLayer) continue;

      let newLayer: string | null;
      if (mouseState.leftDown) newLayer = brushState.selectedLayer;
      else if (mouseState.rightDown) newLayer = "none";
      else continue;

      const h = getHeight(y, x);
      if (h === undefined) continue;

      const d = getSlopeAngleAt(y, x);

      if (brushState.rangeFilter.above.enabled && h < brushState.rangeFilter.above.input) continue;
      if (brushState.rangeFilter.below.enabled && h > brushState.rangeFilter.below.input) continue;
      if (brushState.rangeFilter.slopeAbove.enabled && d < brushState.rangeFilter.slopeAbove.input) continue;
      if (brushState.rangeFilter.slopeBelow.enabled && d > brushState.rangeFilter.slopeBelow.input) continue;

      recordChange(x, y, oldLayer, newLayer, "layer");
      setLayer(y, x, newLayer);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX <= maxX && minY <= maxY) {
    updateTerrainLayerRegion(minX - 1, minY - 1, (maxX - minX) + 3, (maxY - minY) + 3);
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
    case "sprayPaint":
      sprayBrush(cellX, cellY);
      break;
    case "layerPaint":
      layerBrush(cellX, cellY);
      break;
  }
}