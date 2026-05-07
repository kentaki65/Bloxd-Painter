import { sizeState, stackState, mapState } from "./state.js";
import { applyColumnChanges, markDirty } from "./chunk.js";

const LEAF_BLOCKS = new Set([
  100,101,102,103,
  208,209,210,211,
  491,492,493,
  494,495,496,
  1259, 2019, 2020, 2021, 2022, 2023, 2024, 2025
]);

export const heightClamp = (v) => {
  return Math.max(0, Math.min(sizeState.maxHeight, v));
}

export const lerp = (a, b, t) => { 
  return a + (b - a) * t; 
}

export function getTopBlock(x, z) {
  const height = Math.floor(mapState.map[z][x]);

  if (height < 0 || height >= sizeState.maxHeight) return 0;

  return mapState.blockMap[height][z][x];
}

export async function runLoading(fn){
  showLoading();
  await new Promise(r => setTimeout(r, 0));
  try{
    await fn();
  } finally {
    hideLoading();
  }
}

export function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

export function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

export function showPopup(text, time){
  const popup = document.getElementById("sevedLog");
  const replacedText = document.getElementById("replacedText");

  popup.classList.add("show");
  replacedText.textContent = text;
  setTimeout(() => {
    popup.classList.remove("show");
  }, time);
}

export function undo() {
  const stroke = stackState.undoStack.pop();
  if (!stroke) return;

  const heightChanged = new Set();

  for (const c of stroke) {
    if (c.type === "height") {
      mapState.map[c.y][c.x] = c.before;
      heightChanged.add(`${c.x},${c.y}`);
    } 
    else if (c.type === "block") {
      mapState.topBlockMap[c.y][c.x] = c.before;
      markDirty(c.x, c.y);
    } 
    else if (c.type === "layer") {
      mapState.layerMap[c.y][c.x] = c.before;
      markDirty(c.x, c.y);
    }
  }

  stackState.redoStack.push(stroke);

  if (heightChanged.size > 0) {
    applyColumnChanges(heightChanged);
  }
}

export function redo() {
  const stroke = stackState.redoStack.pop();
  if (!stroke) return;

  const heightChanged = new Set();

  for (const c of stroke) {
    if (c.type === "height") {
      mapState.map[c.y][c.x] = c.after;
      heightChanged.add(`${c.x},${c.y}`);
    } 
    else if (c.type === "block") {
      mapState.topBlockMap[c.y][c.x] = c.after;
      markDirty(c.x, c.y);
    } 
    else if (c.type === "layer") {
      mapState.layerMap[c.y][c.x] = c.after;
      markDirty(c.x, c.y);
    }
  }

  stackState.undoStack.push(stroke);

  if (heightChanged.size > 0) {
    applyColumnChanges(heightChanged);
  }
}