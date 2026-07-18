import { sizeState, chunkState, mapState } from "./index.js";
import { chunkSize } from "../core/constants.js";
import { create2D, create3D, createSharedFloat2D } from "../core/utils.js";

export function initChunks():void{
  chunkState.chunkCols = Math.ceil(sizeState.widthLength / chunkSize);
  chunkState.chunkRows = Math.ceil(sizeState.heightLength / chunkSize);

  chunkState.chunkCanvas = Array.from({ length: chunkState.chunkRows }, () =>
    Array.from({ length: chunkState.chunkCols }, () => null)
  );
}

export const mapInit = () => createSharedFloat2D(sizeState.heightLength, sizeState.widthLength, 0);
export const blockMapInit = () => create3D(sizeState.maxHeight, sizeState.heightLength, sizeState.widthLength, 1);
export const layerMapInit = () => create2D(sizeState.heightLength, sizeState.widthLength, "none");
export const topBlockMap = () => create2D(sizeState.heightLength, sizeState.widthLength, 4);

export function initMaps() {
  mapState.map = mapInit();
  mapState.blockMap = blockMapInit();
  mapState.layerMap = layerMapInit();
  mapState.topBlockMap = topBlockMap();
}