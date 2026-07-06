import { chunkSize } from "../core/constants.js";
export const sizeState = {
    chunkLenX: 4,
    chunkLenZ: 4,
    maxHeight: 64,
    get widthLength() { return this.chunkLenX * chunkSize; },
    get heightLength() { return this.chunkLenZ * chunkSize; }
};
//# sourceMappingURL=sizeState.js.map