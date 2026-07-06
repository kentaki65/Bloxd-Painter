import { sizeState, chunkState, mapState } from "./index.js";
import { chunkSize } from "../core/constants.js";
import { create2D, create3D } from "../core/utils.js";
export function initChunks() {
    chunkState.chunkCols = Math.ceil(sizeState.widthLength / chunkSize);
    chunkState.chunkRows = Math.ceil(sizeState.heightLength / chunkSize);
    chunkState.chunkCanvas = Array.from({ length: chunkState.chunkRows }, () => Array.from({ length: chunkState.chunkCols }, () => null));
    chunkState.dirtyChunks.clear();
    for (let cy = 0; cy < chunkState.chunkRows; cy++) {
        for (let cx = 0; cx < chunkState.chunkCols; cx++) {
            chunkState.dirtyChunks.add(`${cx},${cy}`);
        }
    }
}
export const mapInit = () => create2D(sizeState.heightLength, sizeState.widthLength, 0);
export const blockMapInit = () => create3D(sizeState.maxHeight, sizeState.heightLength, sizeState.widthLength, 0);
export const layerMapInit = () => create2D(sizeState.heightLength, sizeState.widthLength, null);
export const topBlockMap = () => create2D(sizeState.heightLength, sizeState.widthLength, null);
export function initMaps() {
    mapState.map = mapInit();
    mapState.blockMap = blockMapInit();
    mapState.layerMap = layerMapInit();
    mapState.topBlockMap = topBlockMap();
}
//# sourceMappingURL=init.js.map