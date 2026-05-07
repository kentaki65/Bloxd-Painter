//main.js
import { draw } from "./render.js"
import { eventInit } from "./event.js";
import { initMaps, initChunks, mapState, mouseState } from "./state.js";
import { applyBrush } from "./brush.js";
import { beginStroke, endStroke } from "./brush.js";
import { initDB, loadFromDB, autoSave } from "./autosave.js";
import { redrawAllChunks } from "./chunk.js";


let lastTime = 0;
const canvas = document.getElementById("canvas");
window.addEventListener("mousedown", beginStroke);
window.addEventListener("mouseup", endStroke);

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function loop(time){
  if(mouseState.leftDown || mouseState.rightDown){
    applyBrush();
  }
  lastTime = time;
  draw(canvas);
  requestAnimationFrame(loop);
}

await initDB();
const data = await loadFromDB();

initChunks()
initMaps();
if (data) {
  mapState.map = data.map;
  mapState.topBlockMap = data.topBlockMap;
  mapState.layerMap = data.layerMap;
  redrawAllChunks();
}

eventInit();
loop();
autoSave();