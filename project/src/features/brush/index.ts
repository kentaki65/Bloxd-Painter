import { heightClamp, lerp } from "../../core/utils.js";
import { sizeState, brushState, mouseState, mapState, cameraState, getTopBlock, getHeight, setTopBlock, setHeight, tryGetHeight, getLayer, setLayer } from "../../states/index.js";
import { cellSize, nameToId } from "../../core/constants.js";
import { applyColumnChanges, markDirty, rebuildColumn } from "../chunk/index.js";
import { recordChange } from "../history/index.js";
import { syncRenderWorkerState } from "../render/renderBridge.js";

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
    rebuildColumn(x, z, h);
    markDirty(x, z);
  }
  syncRenderWorkerState(); 
}

function layerBrush(cellX: number, cellY: number) {
  if(!mapState.layerMap || !mapState.map) return;

  const r = brushState.brushRadius;
  const r2 = r * r;

  for (let dy = -r; dy <= r; dy++) {
    const dxMax = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let dx = -dxMax; dx <= dxMax; dx++) {
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

  syncRenderWorkerState();
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