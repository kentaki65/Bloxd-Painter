import {
  sizeState, brushState, mouseState, chunkState, mapState, cameraState,
  cellSize,
  blockColors,
  mapInit,
  blockMapInit,
  layerMapInit,
  treesStructures,
  topBlockMap
} from "./state.js";

import { writeBloxdSchem, downloadSchems, convertChunks, growForest, loadSchem, loadSchemAsWorld, applyParsed} from "./parser.js";
import { hideLoading, showLoading, undo, redo } from "./utils.js";
import { resizeHeight, resizeMap, redrawAllChunks, applyColumnChanges } from "./chunk.js";
import { quickSave } from "./autosave.js";

const brushImages = [
  "Circle Mountain 2.webp",
  "Circle Mountain 3.webp",
  "Circle Mountain 4.webp",
  "Circle Mountain 5.webp",
  "Cliff Mountain 1.webp",
  "Cliff Mountain 2.webp",
  "Cliff Mountain 3.webp",
  "Cliff Mountain 4.webp",
  "Desert Mountain 1.webp",
  "Desert Mountain 2.webp",
  "Desert Mountain 3.webp",
  "Desert Mountain 4.webp",
  "Desert Mountain 6.webp",
  "Mountain 1.webp",
  "Mountain 2.webp",
  "Mountain 3.webp",
  "Mountain 4.webp",
  "Plateau 1.webp",
  "Plateau 2.webp",
  "Plateau 3.webp",
  "Plateau 4.webp",
  "Snow Mountain 1.webp",
  "Snow Mountain 2.webp",
  "Snow Mountain 3.webp",
  "Snow Mountain 4.webp",
  "Snow Mountain 5.webp",
  "Terraced Mountain 2.webp",
  "Terraced Mountain 3.webp",
  "Terraced Mountain 4.webp",
  "Terraced Mountain 6.webp",
  "Terraced Mountain 7.webp"
]

const canvas = document.getElementById("canvas");

const brushSizeBar = document.getElementById("brushSize");
const zoomSizeBar = document.getElementById("zoom");
const modeBar = document.getElementById("mode");
const selectBlockBar = document.getElementById("selectBlock");
const layerBar = document.getElementById("layer");
const brushBar = document.getElementById("brushType");

const newFileInput = document.getElementById("newFile");
const exportInput = document.getElementById("exportFile");

const importInput = document.getElementById("importInput");
const fileInput = document.getElementById("schemInput");

const open3dView = document.getElementById("open3dview");

const locationBar = document.getElementById("location");
const heightBar = document.getElementById("heightchild");

const fileNameInput = document.getElementById("volume");
const paletteSizeInput = document.getElementById("paletteSize");
const maxHeightInput = document.getElementById("maxHeight");
const waterLevelInput = document.getElementById("waterLevelHeight");

const layerTab = document.getElementById("layertab");
const terrainTab = document.getElementById("terraintab");
const advancedTab = document.getElementById("advancedtab");

const layerContent = document.getElementById("layerContent");
const terrainContent = document.getElementById("terrainContent");
const advancedSetting = document.getElementById("advancedContent");

const brushTab = document.getElementById("brushestab");
const optionTab = document.getElementById("optionstab");

const brushContent = document.getElementById("brushContent");
const optionsContent = document.getElementById("optionsContent");

const aboveEnabled = document.getElementById("atOrAboveEnabled");
const belowEnabled = document.getElementById("atOrBelowEnabled");

const tabs = [layerTab, terrainTab, advancedTab];
const contents = [layerContent, terrainContent, advancedSetting];

const tabs2 = [brushTab, optionTab];
const contents2 = [brushContent, optionsContent];

const toolName = document.getElementById("toolName");
const toolName2 = document.getElementById("toolName2");

function changeMode(e) {
  const name = e.currentTarget.id;
  brushState.mode = name;
  modeBar.textContent = `Mode: ${name}`;
}

function changeSelectLayer(e) {
  const name = e.currentTarget.id;
  brushState.selectedLayer = name;
  layerBar.textContent = `Layer: ${name}`;
}

async function loadBrush(filename) {
  return new Promise((resolve) => {
    const brushImg = new Image();
    brushImg.src = `brushes/${filename}`;
    brushImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = brushImg.width;
      canvas.height = brushImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(brushImg, 0, 0);
      const data = ctx.getImageData(0, 0, brushImg.width, brushImg.height).data;

      const normalized = [];
      for(let y=0; y<brushImg.height; y++){
        normalized[y] = [];
        for(let x=0; x<brushImg.width; x++){
          const idx = (y * brushImg.width + x) * 4;
          const r = data[idx];
          normalized[y][x] = 1 - r / 255;
        }
      }
      resolve({ filename, normalized });
    };
  });
}

async function loadAllBrushes(brushImages) {
  const container = document.getElementById("brushUI");
  showLoading();
  try {
    //throw new Error();

    await new Promise(r => setTimeout(r, 0));
    const results = await Promise.all(
      brushImages.map(filename => loadBrush(filename))
    );
    const loadedBrushes = {};
    for (const { filename: name, normalized } of results) {
      loadedBrushes[name] = normalized;

      const brushTitle = name.replace(/\.[^/.]+$/, "");
      const brushId = brushTitle.replace(/\s+/g, "_");

      const button = document.createElement("button");
      button.className = "BlockButton";
      button.title = brushTitle;
      button.id = brushId;

      const img = document.createElement("img");
      img.src = `brushes/${name}`;
      img.width = 24;

      button.appendChild(img);
      container.appendChild(button);

      button.addEventListener("click", () => {
        brushBar.textContent = `Brush: ${brushTitle}`;
        brushState.brushType = name;
      });
    }
    brushState.loadedBrushes = loadedBrushes;
  } catch (e) {
    console.error("Brush load failed:", e);
  } finally {
    hideLoading();
  }
}

function applyWaterLevel(){
  const width = sizeState.widthLength;
  const height = sizeState.heightLength;
  const maxH = sizeState.maxHeight;

  const waterId = 126;
  const waterLevel = mapState.waterLevel;

  for(let z = 0; z < height; z++){
    for(let x = 0; x < width; x++){
      for(let y = 0; y < maxH; y++){
        if(mapState.blockMap[y][z][x] === waterId){
          mapState.blockMap[y][z][x] = 0;
        }
      }
      for(let y = 0; y <= waterLevel; y++){
        if(y >= maxH) break;

        if(mapState.blockMap[y][z][x] === 0){
          mapState.blockMap[y][z][x] = waterId;
        }
      }
    }
  }

  for(let cy = 0; cy < chunkState.chunkRows; cy++){
    for(let cx = 0; cx < chunkState.chunkCols; cx++){
      chunkState.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

function switchTab(activeTab, activeContent) {
  // 全部リセット
  tabs.forEach(tab => tab.classList.remove("tab--active"));
  contents.forEach(content => content.classList.add("hidden"));

  // 選択だけ有効化
  activeTab.classList.add("tab--active");
  activeContent.classList.remove("hidden");
}

function switchTab2(activeTab, activeContent) {
  // 全部リセット
  tabs2.forEach(tab => tab.classList.remove("tab--active"));
  contents2.forEach(content => content.classList.add("hidden"));

  // 選択だけ有効化
  activeTab.classList.add("tab--active");
  activeContent.classList.remove("hidden");
}

export function eventInit() {
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      //setTimeout(saveHistory, 0);
      mouseState.leftDown = true;
      if (brushState.mode === "flatten") {
        const size = cellSize * cameraState.zoom;
        const cellX = Math.floor((e.offsetX - cameraState.camX) / size);
        const cellY = Math.floor((e.offsetY - cameraState.camY) / size);
        brushState.targetHeight = mapState.map[cellY][cellX];
      }
    }
    if (e.button === 1) {
      cameraState.panning = true;
      cameraState.panStartX = e.clientX;
      cameraState.panStartY = e.clientY;
    }
    if (e.button === 2) mouseState.rightDown = true;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      if (brushState.mode === "flatten") brushState.targetHeight = null;
      mouseState.leftDown = false;
    }
    if (e.button === 1) cameraState.panning = false;
    if (e.button === 2) mouseState.rightDown = false;
  });

  window.addEventListener("wheel", (e) => {
    if (e.shiftKey) {
      cameraState.zoom += e.deltaY > 0 ? -0.1 : 0.1;
      cameraState.zoom = Math.max(0.05, Math.min(4, cameraState.zoom));
      zoomSizeBar.textContent = `Zoom: ${cameraState.zoom.toFixed(2)}`;
      return;
    }

    brushState.brushRadius += e.deltaY > 0 ? -2 : 2;
    brushState.brushRadius = Math.max(1, Math.min(300, brushState.brushRadius));
    brushSizeBar.textContent = `Size: ${brushState.brushRadius}`;
  });

  canvas.addEventListener("mousemove", (e) => {
    // 先にマウス座標更新
    mouseState.mouseX = e.offsetX;
    mouseState.mouseY = e.offsetY;

    const size = cellSize * cameraState.zoom;
    const cellX = Math.floor((mouseState.mouseX - cameraState.camX) / size);
    const cellY = Math.floor((mouseState.mouseY - cameraState.camY) / size);

    // 範囲チェック（絶対戻す）
    if (
      cellX >= 0 &&
      cellY >= 0 &&
      cellX < sizeState.widthLength &&
      cellY < sizeState.heightLength
    ) {
      locationBar.textContent = `Location: ${cellX}, ${cellY}`;
      heightBar.textContent = `Height: ${Math.floor(mapState.map[cellY][cellX])}/${sizeState.maxHeight}`;
    }

    // パン処理
    if (!cameraState.panning) return;

    const dx = e.clientX - cameraState.panStartX;
    const dy = e.clientY - cameraState.panStartY;

    cameraState.camX += dx;
    cameraState.camY += dy;

    cameraState.panStartX = e.clientX;
    cameraState.panStartY = e.clientY;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  ["height", "flatten", "sprayPaint", "smooth", "layerPaint"].forEach(id => {
    document.getElementById(id).addEventListener("click", changeMode);
  });

  //森一つに統一したい
  ["layerFrost", "layerDeliciousForest", "layerPineForest"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", changeSelectLayer);
  });

  layerTab.addEventListener("click", () => {
    toolName.textContent = "layer";
    switchTab(layerTab, layerContent);
  });

  terrainTab.addEventListener("click", () => {
    toolName.textContent = "terrain";
    switchTab(terrainTab, terrainContent);
  });

  advancedTab.addEventListener("click", () => {
    toolName.textContent = "advancedSetting";
    switchTab(advancedTab, advancedSetting);
  });

  brushTab.addEventListener("click", e => {
    toolName2.textContent = "Brushes";
    switchTab2(brushTab, brushContent);
  })

  optionTab.addEventListener("click", e => {
    toolName2.textContent = "Options";
    switchTab2(optionTab, optionsContent);
  })

  Object.keys(blockColors).forEach(name => {
    const element = document.getElementById("block" + name[0].toUpperCase() + name.slice(1));
    if (element) element.addEventListener("click", () => {
      brushState.selectedBlock = name;
      selectBlockBar.textContent = `Block: ${name}`;
    });
  });

  newFileInput.addEventListener("click", (e) => {
    mapState.map = mapInit();
    mapState.blockMap = blockMapInit();
    mapState.layerMap = layerMapInit();
    mapState.topBlockMap = topBlockMap();
    redrawAllChunks();
  });

  exportInput.addEventListener("click", async () => {
    growForest(treesStructures.pine, 6); 
    const json = convertChunks();
    const result = writeBloxdSchem(json);
    await downloadSchems(result);
  });

  importInput.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Success")
    const result = await loadSchem(file);
    await loadSchemAsWorld(result);

    //applyParsed(result);
  });
  
  fileNameInput.addEventListener("input", (e) => {
    mapState.fileName = e.target.value;
    console.log("fileName:", mapState.fileName);
  });

  paletteSizeInput.addEventListener("input", async (e) => {
    const newSize = parseInt(e.target.value) || 8;
    await resizeMap(newSize, newSize);
    console.log("palette resized:", newSize, "width:", sizeState.widthLength, "height:", sizeState.heightLength);
  });
  
  maxHeightInput.addEventListener("input", async (e) => {
    const value = parseInt(e.target.value) || 64;
    sizeState.maxHeight = value;
    await resizeHeight(value);
    console.log("maxHeight:", sizeState.maxHeight);
  });

  waterLevelInput.addEventListener("input", (e)=>{
    const value = parseInt(e.target.value) || 0;
    mapState.waterLevel = value;
    applyWaterLevel();
    console.log("maxHeight:", mapState.waterLevel);
  })

  aboveEnabled.addEventListener("change", e => {
    brushState.atOrAboveEnabled = e.target.checked;
  });

  belowEnabled.addEventListener("change", e => {
    brushState.atOrBelowEnabled = e.target.checked;
  });

  Object.keys(brushState).forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener("input", (e) => {
      const el = e.target;

      switch(el.type){
        case "checkbox":
          brushState[id] = el.checked;
          break;
        case "number":
        case "range":
          brushState[id] = parseFloat(el.value);
          break;
        default:
          brushState[id] = el.value;
      }
    });
  });
  loadAllBrushes(brushImages);

  document.addEventListener("keydown", async (e) => {
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Ctrl / Cmd 対応
    const ctrl = e.ctrlKey || e.metaKey;

    if (!ctrl) return;

    // Undo
    if (e.key === "z" || e.key === "Z") {
      e.preventDefault();

      if (e.shiftKey) {
        // Ctrl+Shift+Z → Redo
        redo();
      } else {
        undo();
      }
    }

    // Ctrl+Y → Redo
    if (e.key === "y" || e.key === "Y") {
      e.preventDefault();
      redo();
    }

    if(e.key === "s"){
      e.preventDefault();
      await quickSave();
    }
  });
}