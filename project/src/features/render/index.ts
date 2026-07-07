import { sizeState, chunkState, mapState, brushState, cameraState, mouseState, getTopBlock, getBlock, tryGetTopBlock } from "../../states/index.js";
import { cellSize, contour, blockColors, layerColors, DEFAULT_COLOR, chunkSize, idToName } from "../../core/constants.js";
import { SelectedBlock } from "../../core/types.js";
const colorCache = new Map();

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

function getColor(blockName:SelectedBlock) :string {
  if (colorCache.has(blockName)) return colorCache.get(blockName);

  const base = blockColors[blockName] ?? DEFAULT_COLOR;
  const color = `rgb(${base[0]},${base[1]},${base[2]})`;

  colorCache.set(blockName, color);
  return color;
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

export function renderChunk(cx: number, cy: number): void{
  if (!chunkState.chunkCanvas) return;

  const size = cellSize;
    const chunkCanvasRow = chunkState.chunkCanvas[cy];
  if (!chunkCanvasRow) return;

  let canvas = chunkCanvasRow[cx];
  if(!canvas){
    canvas = document.createElement("canvas");
    chunkCanvasRow[cx] = canvas;
  }

  canvas.width = chunkSize * size;
  canvas.height = chunkSize * size;

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = Math.min(startX + chunkSize, sizeState.widthLength);
  const endY = Math.min(startY + chunkSize, sizeState.heightLength);

  ctx.beginPath();

  for (let y = startY; y < endY; y++) {
    if (!mapState.map || !mapState.layerMap || !mapState.topBlockMap || !mapState.blockMap) continue;

    const row = mapState.map[y];
    const layerRow = mapState.layerMap[y];
    if (row === undefined || !layerRow) continue;

    for (let x = startX; x < endX; x++) {
      const h = row[x] ?? 0;

      const topY = Math.min(
        sizeState.maxHeight - 1,
        Math.max(0, Math.floor(row[x] ?? 0))
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

      const isUnderWater = h < mapState.waterLevel;
      const px = (x - startX) * size;
      const py = (y - startY) * size;

      ctx.fillStyle = getColor(blockName);
      ctx.fillRect(px, py, size, size);

      const hLeft = row[x - 1] ?? h;
      const hUp = mapState.map[y-1]?.[x] ?? h;

      const shadowStrength = Math.max(
        hLeft - h,
        hUp - h
      );

      if (shadowStrength > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, shadowStrength * 0.08)})`;
        ctx.fillRect(px, py, size, size);
      }

      if(isUnderWater){
        ctx.fillStyle = "rgba(135,206,235,0.5)";
        ctx.fillRect(px, py, size, size);
      }

      if(!layerRow) continue;
      const layer = layerRow[x];
      
      if(layer){
        const c = layerColors[layer];
        if(c){
          ctx.fillStyle = (layer === brushState.selectedLayer)
            ? "rgba(50,255,50,0.5)"
            : `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
          ctx.fillRect(px, py, size, size);
        }
      }

      const level = (h / contour) | 0;

      if (x < sizeState.widthLength - 1) {
        const rightLevel = ((row[x+1] ?? 0) / contour) | 0;
        if (level !== rightLevel) {
          ctx.moveTo((x-startX+1)*size, (y-startY)*size);
          ctx.lineTo((x-startX+1)*size, (y-startY+1)*size);
        }
      }

      if (y < sizeState.heightLength - 1) {
        const downLevel = ((mapState.map[y+1]?.[x] ?? 0) / contour) | 0;
        if (level !== downLevel) {
          ctx.moveTo((x-startX)*size, (y-startY+1)*size);
          ctx.lineTo((x-startX+1)*size, (y-startY+1)*size);
        }
      }
    }
  }

  ctx.strokeStyle = "black";
  ctx.lineWidth = Math.max(1, 2 / cameraState.zoom);
  ctx.stroke();
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

  for(const key of chunkState.dirtyChunks){
    const [cx, cy] = key.split(",").map(Number);
    if(cx === undefined || cy === undefined) continue;

    renderChunk(cx, cy);
  }
  chunkState.dirtyChunks.clear();

  for(let cy = startChunkY; cy < endChunkY; cy++){
    for(let cx = startChunkX; cx < endChunkX; cx++){
      const chunkCanvasRow = chunkState.chunkCanvas[cy];

      const chunk = chunkCanvasRow?.[cx];
      if(chunk === undefined || chunk === null) continue;

      const px = Math.round(cx * chunkPixel + cameraState.camX);
      const py = Math.round(cy * chunkPixel + cameraState.camY);

      ctx.drawImage(
        chunk,
        px,
        py,
        Math.round(chunk.width * cameraState.zoom),
        Math.round(chunk.height * cameraState.zoom)
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