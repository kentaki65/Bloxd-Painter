import { schema0 } from "./schema.js";
import { Buffer } from "https://esm.sh/buffer";
globalThis.Buffer = Buffer;
function encodeLEB128(value) {
    const bytes = [];
    while ((value & -128) != 0) {
        const schemId = (value & 127) | 128;
        bytes.push(schemId);
        value >>>= 7;
    }
    bytes.push(value);
    return bytes;
}
export function splitBloxdschem(json) {
    const schems = [];
    const zySize = Math.ceil(json.sizeY / 32) * Math.ceil(json.sizeZ / 32);
    const sliceSize = Math.floor(200 / zySize);
    let currOffset = 0;
    while (true) {
        const chunksSlice = json.chunks.splice(0, zySize * sliceSize);
        if (!chunksSlice.length)
            break;
        chunksSlice.forEach(chunk => { chunk.x -= currOffset; });
        schems.push({
            name: json.name,
            x: 0,
            y: 0,
            z: 0,
            sizeX: Math.min(json.sizeX, sliceSize * 32),
            sizeY: json.sizeY,
            sizeZ: json.sizeZ,
            chunks: chunksSlice,
            filler: 0,
        });
        currOffset += sliceSize;
    }
    return {
        schems,
        sliceSize,
    };
}
export function writeBloxdSchem(json) {
    const avroJson = {
        name: json.name,
        x: json.pos[0],
        y: json.pos[1],
        z: json.pos[2],
        sizeX: json.size[0],
        sizeY: json.size[1],
        sizeZ: json.size[2],
        chunks: [],
        filler: 0,
    };
    for (const chunk of json.chunks) {
        const RLEArray = [];
        let currId = chunk.blocks[0] ?? 0;
        let currAmt = 1;
        for (let i = 1; i <= chunk.blocks.length; i++) {
            const id = chunk.blocks[i];
            if (id === currId) {
                currAmt++;
            }
            else {
                RLEArray.push(...encodeLEB128(currAmt));
                RLEArray.push(...encodeLEB128(currId));
                currAmt = 1;
                currId = id ?? 0;
            }
        }
        const avroChunk = {
            x: chunk.x,
            y: chunk.y,
            z: chunk.z,
            blocks: new Uint8Array(RLEArray),
        };
        avroJson.chunks.push(avroChunk);
    }
    const { schems: splitJsons, sliceSize } = splitBloxdschem(avroJson);
    const bins = [];
    for (const splitJson of splitJsons) {
        for (const chunk of splitJson.chunks) {
            chunk.blocks = Buffer.from(chunk.blocks);
        }
        bins.push(schema0.toBuffer(splitJson));
    }
    return {
        schems: bins,
        sliceSize: sliceSize * 32,
    };
}
//# sourceMappingURL=encode.js.map