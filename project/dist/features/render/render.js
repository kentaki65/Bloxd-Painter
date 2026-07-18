import { cameraState, getBlock, mapState, sizeState, tryGetHeight } from "../../states/index.js";
import { buildBlockIdMap, buildColorLUT } from "../../core/utils.js";
import { cellSize, chunkSize, contour, layerColors } from "../../core/constants.js";
import { buildLayerNameToId, buildLayerIdMap, buildLayerColorLUT } from "../../core/utils.js";
let colorLUT;
let blockIdMap;
let terrainCanvas = null;
let layerNameToId;
let layerIdMap;
let layerColorLUT;
export function updateTerrainCanvasTransform() {
    if (!terrainCanvas)
        return;
    const scale = cellSize * cameraState.zoom;
    terrainCanvas.style.transformOrigin = "0 0";
    terrainCanvas.style.transform = `translate(${cameraState.camX}px, ${cameraState.camY}px) scale(${scale})`;
}
export function updateTerrainRegion(x, y, w, h) {
    updateBlockIdMapRegion(x, y, w, h);
    updateFullRegion(x, y, w, h);
    renderFullTerrain();
}
function updateBlockIdMapRegion(x0, y0, w0, h0) {
    if (!blockIdMap || !mapState.map || !mapState.topBlockMap || !mapState.blockMap)
        return;
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    const endX = Math.min(x0 + w0, width);
    const endY = Math.min(y0 + h0, height);
    for (let y = Math.max(0, y0); y < endY; y++) {
        const row = mapState.topBlockMap[y];
        for (let x = Math.max(0, x0); x < endX; x++) {
            const height = tryGetHeight(y, x) ?? 0;
            const topY = Math.min(sizeState.maxHeight - 1, Math.max(0, Math.floor(height)));
            const topValue = row?.[x];
            const layerValue = getBlock(topY, y, x);
            const blockId = topValue != null ? topValue : layerValue != null ? layerValue : 0;
            blockIdMap[y * width + x] = blockId;
        }
    }
}
function compileShader(glCtx, type, source) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        const log = glCtx.getShaderInfoLog(shader);
        glCtx.deleteShader(shader);
        throw new Error(`Shader compile failed: ${log}`);
    }
    return shader;
}
function linkProgram(glCtx, vsSrc, fsSrc) {
    const vs = compileShader(glCtx, glCtx.VERTEX_SHADER, vsSrc);
    const fs = compileShader(glCtx, glCtx.FRAGMENT_SHADER, fsSrc);
    const program = glCtx.createProgram();
    glCtx.attachShader(program, vs);
    glCtx.attachShader(program, fs);
    glCtx.linkProgram(program);
    if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
        const log = glCtx.getProgramInfoLog(program);
        glCtx.deleteProgram(program);
        throw new Error(`Program link failed: ${log}`);
    }
    glCtx.deleteShader(vs);
    glCtx.deleteShader(fs);
    return program;
}
let fullGl = null;
let fullCanvas = null;
let terrainProgram = null;
let fullQuadVAO = null;
let heightTexture = null;
let blockIdTexture = null;
let colorLUTTexture = null;
let layerIdTexture = null;
let layerColorLUTTexture = null;
let fullInitialized = false;
function checkMaxTextureSize(glCtx, width, height) {
    const maxSize = glCtx.getParameter(glCtx.MAX_TEXTURE_SIZE);
    if (width > maxSize || height > maxSize) {
        throw new Error(`Map size (${width}x${height}) exceeds MAX_TEXTURE_SIZE (${maxSize}). Tiling required.`);
    }
}
const TERRAIN_VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;
const TERRAIN_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_heightMap;
uniform usampler2D u_blockIdMap;
uniform sampler2D u_colorLUT;
uniform float u_waterLevel;
uniform vec2 u_texelSize;
uniform float u_contour;
uniform float u_chunkSize;
uniform vec2 u_mapSize;
uniform float u_gridLineWidthPx;
uniform usampler2D u_layerIdMap;
uniform sampler2D u_layerColorLUT;

void main() {
  float h = texture(u_heightMap, v_uv).r;
  uint blockId = texture(u_blockIdMap, v_uv).r;

  vec3 color = texelFetch(u_colorLUT, ivec2(int(blockId), 0), 0).rgb;

  // 陰影
  float hLeft = texture(u_heightMap, v_uv - vec2(u_texelSize.x, 0.0)).r;
  float hUp   = texture(u_heightMap, v_uv - vec2(0.0, u_texelSize.y)).r;

  float shadowStrength = max(hLeft - h, hUp - h);
  if (shadowStrength > 0.0) {
    float alpha = min(0.6, shadowStrength * 0.08);
    color = mix(color, vec3(0.0), alpha);
  }

  // 水
  if (h < u_waterLevel) {
    vec3 waterColor = vec3(135.0, 206.0, 235.0) / 255.0;
    color = mix(color, waterColor, 0.5);
  }

  // ===== 等高線 =====
  float level = floor(h / u_contour);

  float hR = texture(u_heightMap, v_uv + vec2(u_texelSize.x, 0.0)).r;
  float hL = texture(u_heightMap, v_uv - vec2(u_texelSize.x, 0.0)).r;
  float hU = texture(u_heightMap, v_uv - vec2(0.0, u_texelSize.y)).r;
  float hD = texture(u_heightMap, v_uv + vec2(0.0, u_texelSize.y)).r;

  float levelR = floor(hR / u_contour);
  float levelL = floor(hL / u_contour);
  float levelU = floor(hU / u_contour);
  float levelD = floor(hD / u_contour);

  float contourLine =
      step(0.5, abs(level-levelR)) +
      step(0.5, abs(level-levelL)) +
      step(0.5, abs(level-levelU)) +
      step(0.5, abs(level-levelD));

  if (contourLine > 0.0) {
      color = mix(color, vec3(0.0), 0.9);
  }

  // ===== chunkグリッド線 =====
  vec2 cellPos = v_uv * u_mapSize;
  vec2 gridUV = fract(cellPos / u_chunkSize);
  vec2 distToEdge = min(gridUV, 1.0 - gridUV) * u_chunkSize;

  vec2 lineWidthInCells = fwidth(cellPos) * u_gridLineWidthPx;
  float gridLine = step(distToEdge.x, lineWidthInCells.x) + step(distToEdge.y, lineWidthInCells.y);

  if (gridLine > 0.0) {
    color = mix(color, vec3(1.0), 0.2);
  }

  uint layerId = texture(u_layerIdMap, v_uv).r;
  if (layerId > 0u) {
    vec4 layerColor = texelFetch(u_layerColorLUT, ivec2(int(layerId), 0), 0);
    color = mix(color, layerColor.rgb, 0.6 * layerColor.a);
  }
    
  outColor = vec4(color, 1.0);
}`;
export function initTerrainCanvas(existingCanvas) {
    colorLUT = buildColorLUT();
    blockIdMap = buildBlockIdMap();
    layerNameToId = buildLayerNameToId(layerColors);
    layerIdMap = buildLayerIdMap(mapState.layerMap, layerNameToId, sizeState.widthLength, sizeState.heightLength);
    console.log("initial layerIdMap:", layerIdMap, "layerMap exists:", !!mapState.layerMap);
    layerColorLUT = buildLayerColorLUT(layerColors, layerNameToId);
    const container = existingCanvas.parentElement;
    const computedPosition = getComputedStyle(container).position;
    if (computedPosition === "static") {
        container.style.position = "relative";
    }
    terrainCanvas = document.createElement("canvas");
    terrainCanvas.width = sizeState.widthLength;
    terrainCanvas.height = sizeState.heightLength;
    terrainCanvas.style.position = "absolute";
    terrainCanvas.style.top = `${existingCanvas.offsetTop}px`;
    terrainCanvas.style.left = `${existingCanvas.offsetLeft}px`;
    terrainCanvas.style.imageRendering = "pixelated";
    terrainCanvas.style.pointerEvents = "none";
    terrainCanvas.style.zIndex = "-10";
    container.insertBefore(terrainCanvas, existingCanvas.nextSibling);
    initFullTerrainRenderer(sizeState.widthLength, sizeState.heightLength);
    uploadColorLUTToFullRenderer();
    uploadFullHeightMap();
    uploadFullBlockIdMap();
    uploadLayerColorLUTToFullRenderer();
    uploadFullLayerIdMap();
}
function initFullTerrainRenderer(width, height) {
    const ctx = terrainCanvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!ctx)
        throw new Error("WebGL2 not available for full terrain renderer");
    fullGl = ctx;
    checkMaxTextureSize(fullGl, width, height);
    terrainProgram = linkProgram(fullGl, TERRAIN_VS, TERRAIN_FS);
    const quadData = new Float32Array([
        -1, -1, 0, 0,
        1, -1, 1, 0,
        -1, 1, 0, 1,
        1, 1, 1, 1,
    ]);
    const quadBuf = fullGl.createBuffer();
    fullGl.bindBuffer(fullGl.ARRAY_BUFFER, quadBuf);
    fullGl.bufferData(fullGl.ARRAY_BUFFER, quadData, fullGl.STATIC_DRAW);
    fullQuadVAO = fullGl.createVertexArray();
    fullGl.bindVertexArray(fullQuadVAO);
    const posLoc = fullGl.getAttribLocation(terrainProgram, "a_pos");
    const uvLoc = fullGl.getAttribLocation(terrainProgram, "a_uv");
    fullGl.enableVertexAttribArray(posLoc);
    fullGl.vertexAttribPointer(posLoc, 2, fullGl.FLOAT, false, 16, 0);
    fullGl.enableVertexAttribArray(uvLoc);
    fullGl.vertexAttribPointer(uvLoc, 2, fullGl.FLOAT, false, 16, 8);
    fullGl.bindVertexArray(null);
    heightTexture = fullGl.createTexture();
    fullGl.bindTexture(fullGl.TEXTURE_2D, heightTexture);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MIN_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MAG_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_S, fullGl.CLAMP_TO_EDGE);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_T, fullGl.CLAMP_TO_EDGE);
    fullGl.texImage2D(fullGl.TEXTURE_2D, 0, fullGl.R32F, width, height, 0, fullGl.RED, fullGl.FLOAT, null);
    blockIdTexture = fullGl.createTexture();
    fullGl.bindTexture(fullGl.TEXTURE_2D, blockIdTexture);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MIN_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MAG_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_S, fullGl.CLAMP_TO_EDGE);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_T, fullGl.CLAMP_TO_EDGE);
    fullGl.texImage2D(fullGl.TEXTURE_2D, 0, fullGl.R16UI, width, height, 0, fullGl.RED_INTEGER, fullGl.UNSIGNED_SHORT, null);
    colorLUTTexture = fullGl.createTexture();
    layerIdTexture = fullGl.createTexture();
    fullGl.bindTexture(fullGl.TEXTURE_2D, layerIdTexture);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MIN_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MAG_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_S, fullGl.CLAMP_TO_EDGE);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_T, fullGl.CLAMP_TO_EDGE);
    fullGl.texImage2D(fullGl.TEXTURE_2D, 0, fullGl.R8UI, width, height, 0, fullGl.RED_INTEGER, fullGl.UNSIGNED_BYTE, null);
    layerColorLUTTexture = fullGl.createTexture();
    fullInitialized = true;
}
function uploadColorLUTToFullRenderer() {
    if (!fullGl || !colorLUTTexture || !colorLUT)
        return;
    const blockCount = colorLUT.length / 3;
    if (blockCount === 0)
        return;
    const rgba = new Uint8Array(blockCount * 4);
    for (let i = 0; i < blockCount; i++) {
        rgba[i * 4] = colorLUT[i * 3];
        rgba[i * 4 + 1] = colorLUT[i * 3 + 1];
        rgba[i * 4 + 2] = colorLUT[i * 3 + 2];
        rgba[i * 4 + 3] = 255;
    }
    fullGl.bindTexture(fullGl.TEXTURE_2D, colorLUTTexture);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MIN_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MAG_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_S, fullGl.CLAMP_TO_EDGE);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_T, fullGl.CLAMP_TO_EDGE);
    fullGl.texImage2D(fullGl.TEXTURE_2D, 0, fullGl.RGBA8, blockCount, 1, 0, fullGl.RGBA, fullGl.UNSIGNED_BYTE, rgba);
}
function uploadFullHeightMap() {
    if (!fullGl || !heightTexture || !mapState.map)
        return;
    const h = sizeState.heightLength;
    const w = sizeState.widthLength;
    fullGl.pixelStorei(fullGl.UNPACK_ALIGNMENT, 1); // 追加
    fullGl.bindTexture(fullGl.TEXTURE_2D, heightTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, 0, 0, w, h, fullGl.RED, fullGl.FLOAT, mapState.map);
}
function uploadFullBlockIdMap() {
    if (!fullGl || !blockIdTexture || !blockIdMap)
        return;
    const h = sizeState.heightLength;
    const w = sizeState.widthLength;
    fullGl.bindTexture(fullGl.TEXTURE_2D, blockIdTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, 0, 0, w, h, fullGl.RED_INTEGER, fullGl.UNSIGNED_SHORT, blockIdMap);
}
function uploadLayerColorLUTToFullRenderer() {
    if (!fullGl || !layerColorLUTTexture || !layerColorLUT)
        return;
    const layerCount = layerColorLUT.length / 4;
    if (layerCount === 0)
        return;
    fullGl.bindTexture(fullGl.TEXTURE_2D, layerColorLUTTexture);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MIN_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_MAG_FILTER, fullGl.NEAREST);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_S, fullGl.CLAMP_TO_EDGE);
    fullGl.texParameteri(fullGl.TEXTURE_2D, fullGl.TEXTURE_WRAP_T, fullGl.CLAMP_TO_EDGE);
    fullGl.texImage2D(fullGl.TEXTURE_2D, 0, fullGl.RGBA8, layerCount, 1, 0, fullGl.RGBA, fullGl.UNSIGNED_BYTE, layerColorLUT);
}
function uploadFullLayerIdMap() {
    if (!fullGl || !layerIdTexture || !layerIdMap)
        return;
    const h = sizeState.heightLength;
    const w = sizeState.widthLength;
    fullGl.pixelStorei(fullGl.UNPACK_ALIGNMENT, 1);
    fullGl.bindTexture(fullGl.TEXTURE_2D, layerIdTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, 0, 0, w, h, fullGl.RED_INTEGER, fullGl.UNSIGNED_BYTE, layerIdMap);
}
/**
 * 変更されたセル範囲だけ height / blockId テクスチャを更新する。
 * ハイトマップはSharedArrayBuffer上のstate.mapから直接部分アップロードできる。
 */
function updateFullRegion(x0, y0, w0, h0) {
    if (!fullGl || !heightTexture || !blockIdTexture || !mapState.map || !blockIdMap)
        return;
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    const startX = Math.max(0, x0);
    const startY = Math.max(0, y0);
    const endX = Math.min(x0 + w0, width);
    const endY = Math.min(y0 + h0, height);
    const regionW = endX - startX;
    const regionH = endY - startY;
    if (regionW <= 0 || regionH <= 0)
        return;
    const heightRegion = new Float32Array(regionW * regionH);
    const blockIdRegion = new Uint16Array(regionW * regionH);
    for (let y = 0; y < regionH; y++) {
        const srcRowStart = (startY + y) * width + startX;
        heightRegion.set(mapState.map.subarray(srcRowStart, srcRowStart + regionW), y * regionW);
        blockIdRegion.set(blockIdMap.subarray(srcRowStart, srcRowStart + regionW), y * regionW);
    }
    fullGl.pixelStorei(fullGl.UNPACK_ALIGNMENT, 1); // 追加
    fullGl.bindTexture(fullGl.TEXTURE_2D, heightTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, startX, startY, regionW, regionH, fullGl.RED, fullGl.FLOAT, heightRegion);
    fullGl.bindTexture(fullGl.TEXTURE_2D, blockIdTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, startX, startY, regionW, regionH, fullGl.RED_INTEGER, fullGl.UNSIGNED_SHORT, blockIdRegion);
}
function updateLayerIdMapRegion(x0, y0, w0, h0) {
    if (!layerIdMap || !mapState.layerMap || !layerNameToId)
        return;
    console.log("updateLayerIdMapRegion called", { x0, y0, w0, h0, hasLayerIdMap: !!layerIdMap });
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    const endX = Math.min(x0 + w0, width);
    const endY = Math.min(y0 + h0, height);
    for (let y = Math.max(0, y0); y < endY; y++) {
        const row = mapState.layerMap[y];
        for (let x = Math.max(0, x0); x < endX; x++) {
            const layer = row?.[x];
            const id = layer ? (layerNameToId.get(layer) ?? 0) : 0;
            if (x === Math.floor((x0 + endX) / 2) && y === Math.floor((y0 + endY) / 2)) {
                // 範囲の中心1点だけログ(全セル分出ると大量になるので)
                console.log("sample cell:", { layer, id, layerNameToIdKeys: [...layerNameToId.keys()] });
            }
            layerIdMap[y * width + x] = id;
        }
    }
}
function updateLayerIdTextureRegion(x0, y0, w0, h0) {
    if (!fullGl || !layerIdTexture || !layerIdMap) {
        console.log("updateLayerIdTextureRegion early return", { hasGl: !!fullGl, hasTexture: !!layerIdTexture, hasMap: !!layerIdMap });
        return;
    }
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    const startX = Math.max(0, x0);
    const startY = Math.max(0, y0);
    const endX = Math.min(x0 + w0, width);
    const endY = Math.min(y0 + h0, height);
    const regionW = endX - startX;
    const regionH = endY - startY;
    if (regionW <= 0 || regionH <= 0)
        return;
    const region = new Uint8Array(regionW * regionH);
    for (let y = 0; y < regionH; y++) {
        const srcRowStart = (startY + y) * width + startX;
        region.set(layerIdMap.subarray(srcRowStart, srcRowStart + regionW), y * regionW);
    }
    fullGl.pixelStorei(fullGl.UNPACK_ALIGNMENT, 1);
    fullGl.bindTexture(fullGl.TEXTURE_2D, layerIdTexture);
    fullGl.texSubImage2D(fullGl.TEXTURE_2D, 0, startX, startY, regionW, regionH, fullGl.RED_INTEGER, fullGl.UNSIGNED_BYTE, region);
}
export function updateTerrainBlockRegion(x, y, w, h) {
    updateBlockIdMapRegion(x, y, w, h);
    updateFullRegion(x, y, w, h);
    renderFullTerrain();
}
export function updateTerrainLayerRegion(x, y, w, h) {
    updateLayerIdMapRegion(x, y, w, h);
    updateLayerIdTextureRegion(x, y, w, h);
    renderFullTerrain();
}
export function rebuildLayerPalette() {
    console.log(layerColors);
    layerNameToId = buildLayerNameToId(layerColors);
    layerColorLUT = buildLayerColorLUT(layerColors, layerNameToId);
    uploadLayerColorLUTToFullRenderer();
    layerIdMap = buildLayerIdMap(mapState.layerMap, layerNameToId, sizeState.widthLength, sizeState.heightLength);
    uploadFullLayerIdMap();
    renderFullTerrain();
}
export function renderFullTerrain() {
    if (!fullGl || !terrainProgram) {
        console.log(fullGl, terrainProgram);
        throw new Error("Full terrain renderer not initialized");
    }
    ;
    const glCtx = fullGl;
    const width = sizeState.widthLength;
    const height = sizeState.heightLength;
    glCtx.viewport(0, 0, width, height);
    glCtx.disable(glCtx.BLEND);
    glCtx.clearColor(0, 0, 0, 1);
    glCtx.clear(glCtx.COLOR_BUFFER_BIT);
    glCtx.useProgram(terrainProgram);
    glCtx.bindVertexArray(fullQuadVAO);
    glCtx.activeTexture(glCtx.TEXTURE0);
    glCtx.bindTexture(glCtx.TEXTURE_2D, heightTexture);
    glCtx.uniform1i(glCtx.getUniformLocation(terrainProgram, "u_heightMap"), 0);
    glCtx.activeTexture(glCtx.TEXTURE1);
    glCtx.bindTexture(glCtx.TEXTURE_2D, blockIdTexture);
    glCtx.uniform1i(glCtx.getUniformLocation(terrainProgram, "u_blockIdMap"), 1);
    glCtx.activeTexture(glCtx.TEXTURE2);
    glCtx.bindTexture(glCtx.TEXTURE_2D, colorLUTTexture);
    glCtx.uniform1i(glCtx.getUniformLocation(terrainProgram, "u_colorLUT"), 2);
    glCtx.uniform1f(glCtx.getUniformLocation(terrainProgram, "u_waterLevel"), mapState.waterLevel);
    glCtx.uniform2f(glCtx.getUniformLocation(terrainProgram, "u_texelSize"), 1.0 / width, 1.0 / height);
    glCtx.uniform1f(glCtx.getUniformLocation(terrainProgram, "u_contour"), contour);
    glCtx.uniform1f(glCtx.getUniformLocation(terrainProgram, "u_chunkSize"), chunkSize);
    glCtx.uniform2f(glCtx.getUniformLocation(terrainProgram, "u_mapSize"), width, height);
    glCtx.uniform1f(glCtx.getUniformLocation(terrainProgram, "u_gridLineWidthPx"), 1.0);
    glCtx.activeTexture(glCtx.TEXTURE3);
    glCtx.bindTexture(glCtx.TEXTURE_2D, layerIdTexture);
    glCtx.uniform1i(glCtx.getUniformLocation(terrainProgram, "u_layerIdMap"), 3);
    glCtx.activeTexture(glCtx.TEXTURE4);
    glCtx.bindTexture(glCtx.TEXTURE_2D, layerColorLUTTexture);
    glCtx.uniform1i(glCtx.getUniformLocation(terrainProgram, "u_layerColorLUT"), 4);
    glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4);
    glCtx.bindVertexArray(null);
    return;
}
//# sourceMappingURL=render.js.map