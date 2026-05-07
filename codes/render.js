import {
  sizeState, mouseState, chunkState, mapState, brushState, cameraState,
  cellSize, contour, DEFAULT_COLOR,
  blockColors, layerColors, chunkSize
} from "./state.js";
import { nameToId } from "./nameMap.js";

const idToName = Object.fromEntries(
  Object.entries(nameToId).map(([key,value])=>[value, key])
)

function getColor(blockName) {
  if (colorCache.has(blockName)) return colorCache.get(blockName);

  console.log(blockName);
  const base = blockColors[blockName] ?? DEFAULT_COLOR;
  const color = `rgb(${base[0]},${base[1]},${base[2]})`;

  colorCache.set(blockName, color);
  return color;
}

const colorCache = new Map();

export function updateBlockMap() {
  const newMap = Array.from({ length: sizeState.maxHeight }, () =>
    Array.from({ length: sizeState.heightLength }, () =>
      new Array(sizeState.widthLength).fill(0)
    )
  );

  for (let z = 0; z < sizeState.heightLength; z++) {
    for (let x = 0; x < sizeState.widthLength; x++) {
      const h = Math.floor(mapState.map[z][x]);
      for (let y = 0; y <= h && y < sizeState.maxHeight; y++) {
        if (mapState.blockMap[y][z][x] === 0) {
          newMap[y][z][x] = 4;
        } else {
          newMap[y][z][x] = mapState.blockMap[y][z][x];
        }
      }
    }
  }

  mapState.blockMap = newMap;
}

function drawBrushPreview(canvas){ 
  const ctx = canvas.getContext("2d"); 
  const radius = brushState.brushRadius * cellSize * cameraState.zoom; 
  ctx.beginPath(); 
  ctx.setLineDash([10, 4])
  ctx.arc(mouseState.mouseX, mouseState.mouseY, radius, 0, Math.PI * 2); 
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2; 
  ctx.stroke(); 
}

function drawChunkGrid(ctx, canvas, size, startX, startY, endX, endY) { 
  const chunk = 32; 
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; 
  ctx.lineWidth = 1; 
  for (let x = Math.floor(startX / chunk) * chunk; x <= endX; x += chunk) {
    const px = x * size + cameraState.camX; 
    ctx.beginPath(); ctx.moveTo(px, 0); 
    ctx.lineTo(px, canvas.height); 
    ctx.stroke(); 
  } 
  for (let y = Math.floor(startY / chunk) * chunk; y <= endY; y += chunk) {
    const py = y * size + cameraState.camY; 
    ctx.beginPath(); ctx.moveTo(0, py); 
    ctx.lineTo(canvas.width, py); 
    ctx.stroke(); 
  } 
}

export function renderChunk(cx, cy){
  const size = cellSize;

  let canvas = chunkState.chunkCanvas[cy][cx];
  if(!canvas){
    canvas = document.createElement("canvas");
    chunkState.chunkCanvas[cy][cx] = canvas;
  }

  canvas.width = chunkSize * size;
  canvas.height = chunkSize * size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = Math.min(startX + chunkSize, sizeState.widthLength);
  const endY = Math.min(startY + chunkSize, sizeState.heightLength);

  ctx.beginPath();

  for(let y = startY; y < endY; y++){
    const row = mapState.map[y];
    const layerRow = mapState.layerMap[y];

    for(let x = startX; x < endX; x++){

      const h = row[x] | 0;
      const blockY = h < sizeState.maxHeight ? h : sizeState.maxHeight - 1;
      const topY = Math.min(
        sizeState.maxHeight - 1,
        Math.max(0, Math.floor(mapState.map[y][x] || 0))
      );

      const topRow = mapState.topBlockMap[y];
      const blockLayer = mapState.blockMap[topY];

      const blockId =
        (topRow && topRow[x] != null)
          ? topRow[x]
          : (blockLayer && blockLayer[y] && blockLayer[y][x] != null)
            ? blockLayer[y][x]
            : 0;

      const blockName = idToName[blockId] ?? "Air";

      const isUnderWater = h < mapState.waterLevel;
      const px = (x - startX) * size;
      const py = (y - startY) * size;

      ctx.fillStyle = getColor(blockName);
      ctx.fillRect(px, py, size, size);

      const hLeft = mapState.map[y][x-1] ?? h;
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
        const rightLevel = ((row[x+1]) / contour) | 0;
        if (level !== rightLevel) {
          ctx.moveTo((x-startX+1)*size, (y-startY)*size);
          ctx.lineTo((x-startX+1)*size, (y-startY+1)*size);
        }
      }

      if (y < sizeState.heightLength - 1) {
        const downLevel = ((mapState.map[y+1][x]) / contour) | 0;
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

export function draw(canvas){
  const ctx = canvas.getContext("2d");
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
    renderChunk(cx, cy);
  }
  chunkState.dirtyChunks.clear();

  for(let cy = startChunkY; cy < endChunkY; cy++){
    for(let cx = startChunkX; cx < endChunkX; cx++){

      const chunk = chunkState.chunkCanvas[cy][cx];
      if(!chunk) continue;

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