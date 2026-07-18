import { brushState, cameraState, mouseState } from "../../states/index.js";
import { cellSize } from "../../core/constants.js";

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

export function draw(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  
  drawBrushPreview(canvas);
}