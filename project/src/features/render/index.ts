import { sizeState, chunkState, mapState, brushState, cameraState, mouseState, tryGetHeight, getBlock, tryGetTopBlock } from "../../states/index.js";
import { cellSize, contour, blockColors, layerColors, DEFAULT_COLOR, chunkSize, idToName } from "../../core/constants.js";
import { SelectedBlock } from "../../core/types.js";
import { requestChunkRender, chunkBitmaps } from "./renderBridge.js";

const colorCache = new Map();
let smallCanvas: HTMLCanvasElement | null = null;
let smallCtx: CanvasRenderingContext2D | null = null;

function drawBrushPreview(canvas: HTMLCanvasElement): void{
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const radius = brushState.brushRadius * cellSize * cameraState.zoom; 
  ctx.beginPath(); 
  ctx.setLineDash([10, 4])
  ctx.arc(mouseState.mouseX, mouseState.mouseY, radius, 0, Math.PI * 2); 
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2; 
  ctx.stroke(); 
}

function getColorRGB(blockName: SelectedBlock): [number, number, number] {
  const cached = colorCache.get(blockName);
  if (cached) return cached;
 
  const base = blockColors[blockName] ?? DEFAULT_COLOR;
  
  const rgb: [number, number, number] = [
    base[0] ?? 0, 
    base[1] ?? 0, 
    base[2] ?? 0
  ];
  colorCache.set(blockName, rgb);
  return rgb;
}

function drawChunkGrid(
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  size: number, 
  startX: number, startY: number, 
  endX: number, endY: number
): void { 
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; 
  ctx.lineWidth = 1;

  for (let x = Math.floor(startX / chunkSize) * chunkSize; x <= endX; x += chunkSize) {
    const px = x * size + cameraState.camX; 
    ctx.beginPath(); ctx.moveTo(px, 0); 
    ctx.lineTo(px, canvas.height); 
    ctx.stroke(); 
  } 

  for (let y = Math.floor(startY / chunkSize) * chunkSize; y <= endY; y += chunkSize) {
    const py = y * size + cameraState.camY; 
    ctx.beginPath(); ctx.moveTo(0, py); 
    ctx.lineTo(canvas.width, py); 
    ctx.stroke(); 
  } 
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
 
function getSmallCanvas(w: number, h: number): CanvasRenderingContext2D {
  if (!smallCanvas) {
    smallCanvas = document.createElement("canvas");
    smallCtx = smallCanvas.getContext("2d");
  }
  if (smallCanvas.width !== w || smallCanvas.height !== h) {
    smallCanvas.width = w;
    smallCanvas.height = h;
  }
  return smallCtx!;
}

export function renderChunk(cx: number, cy: number): void {
  if (!chunkState.chunkCanvas) return;
 
  const size = cellSize;
  const chunkCanvasRow = chunkState.chunkCanvas[cy];
  if (!chunkCanvasRow) return;
 
  let canvas = chunkCanvasRow[cx];
  if (!canvas) {
    canvas = document.createElement("canvas");
    chunkCanvasRow[cx] = canvas;
  }
 
  canvas.width = chunkSize * size;
  canvas.height = chunkSize * size;
 
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
 
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = Math.min(startX + chunkSize, sizeState.widthLength);
  const endY = Math.min(startY + chunkSize, sizeState.heightLength);
 
  const cellsW = endX - startX;
  const cellsH = endY - startY;
  if (cellsW <= 0 || cellsH <= 0) return;
 
  const imgData = ctx.createImageData(cellsW, cellsH);
  const data = imgData.data;
 
  if (!mapState.map || !mapState.layerMap || !mapState.topBlockMap || !mapState.blockMap) return;
 
  const contourLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
 
  for (let y = startY; y < endY; y++) {
    const layerRow = mapState.layerMap[y];
    if (!layerRow) continue;
 
    for (let x = startX; x < endX; x++) {
      const h = tryGetHeight(y, x) ?? 0;
 
      const topY = Math.min(
        sizeState.maxHeight - 1,
        Math.max(0, Math.floor(h))
      );
 
      const topValue = tryGetTopBlock(y, x);
      const layerValue = getBlock(topY, y, x);
 
      const blockId: number =
        topValue != null
          ? topValue
          : layerValue != null
            ? layerValue
            : 0;
 
      const blockName = idToName[blockId] ?? "Air";
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
        const alpha = Math.min(0.6, shadowStrength * 0.08);
        blendPixel(data, offset, 0, 0, 0, alpha);
      }
 
      const isUnderWater = h < mapState.waterLevel;
      if (isUnderWater) {
        blendPixel(data, offset, 135, 206, 235, 0.5);
      }
 
      const layer = layerRow[x];
      if (layer) {
        const c = layerColors[layer];
        if (c) {
          const cr = c[0] ?? 0;
          const cg = c[1] ?? 0;
          const cb = c[2] ?? 0;
          
          if (layer === brushState.selectedLayer) {
            blendPixel(data, offset, cr, cg, cb, 0.6);
          } else {
            blendPixel(data, offset, cr, cg, cb, 0.35);
          }
        }
      }

      const level = (h / contour) | 0;
 
      if (x < sizeState.widthLength - 1) {
        const rightLevel = ((tryGetHeight(y, x + 1) ?? 0) / contour) | 0;
        if (level !== rightLevel) {
          contourLines.push({ x1: px + 1, y1: py, x2: px + 1, y2: py + 1 });
        }
      }
 
      if (y < sizeState.heightLength - 1) {
        const downLevel = ((tryGetHeight(y + 1, x) ?? 0) / contour) | 0;
        if (level !== downLevel) {
          contourLines.push({ x1: px, y1: py + 1, x2: px + 1, y2: py + 1 });
        }
      }
    }
  }

  const sCtx = getSmallCanvas(cellsW, cellsH);
  sCtx.putImageData(imgData, 0, 0);
 
  ctx.drawImage(
    sCtx.canvas,
    0, 0, cellsW, cellsH,
    0, 0, cellsW * size, cellsH * size
  );
 
  if (contourLines.length > 0) {
    ctx.beginPath();
    for (const line of contourLines) {
      ctx.moveTo(line.x1 * size, line.y1 * size);
      ctx.lineTo(line.x2 * size, line.y2 * size);
    }
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.max(1, 2 / cameraState.zoom);
    ctx.stroke();
  }
}

export function draw(canvas: HTMLCanvasElement){
  if(!chunkState.chunkCanvas)return;

  const ctx = canvas.getContext("2d");
  if(!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const size = cellSize * cameraState.zoom;
  const chunkPixel = chunkSize * size;

  const startChunkX = Math.max(0, Math.floor(-cameraState.camX / chunkPixel));
  const startChunkY = Math.max(0, Math.floor(-cameraState.camY / chunkPixel));
  const endChunkX = Math.min(chunkState.chunkCols, Math.ceil((canvas.width - cameraState.camX) / chunkPixel));
  const endChunkY = Math.min(chunkState.chunkRows, Math.ceil((canvas.height - cameraState.camY) / chunkPixel));

  for (const key of chunkState.dirtyChunks) {
    const [cx, cy] = key.split(",").map(Number);
    if (cx === undefined || cy === undefined) continue;
    requestChunkRender(cx, cy, cameraState.zoom);
  }
  chunkState.dirtyChunks.clear();

  for (let cy = startChunkY; cy < endChunkY; cy++) {
    for (let cx = startChunkX; cx < endChunkX; cx++) {
      const bitmap = chunkBitmaps.get(`${cx},${cy}`);
      if (!bitmap) continue;

      const px = Math.round(cx * chunkPixel + cameraState.camX);
      const py = Math.round(cy * chunkPixel + cameraState.camY);

      ctx.drawImage(
        bitmap,
        px, py,
        Math.round(bitmap.width * cameraState.zoom / (bitmap.width / (chunkSize * cellSize))), // ズーム対応、要検証
        Math.round(bitmap.height * cameraState.zoom / (bitmap.height / (chunkSize * cellSize)))
      );
    }
  }

  drawChunkGrid(
    ctx,
    canvas,
    size,
    startChunkX * chunkSize,
    startChunkY * chunkSize,
    endChunkX * chunkSize,
    endChunkY * chunkSize
  );

  drawBrushPreview(canvas);
}