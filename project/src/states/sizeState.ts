import { chunkSize } from "../core/constants.js";
import { SizeState } from "../core/types.js";

export const sizeState:SizeState = {
  chunkLenX: 4,
  chunkLenZ: 4,
  maxHeight: 64,
  get widthLength() { return this.chunkLenX * chunkSize },
  get heightLength() { return this.chunkLenZ * chunkSize}
};