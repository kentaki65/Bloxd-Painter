import { schema0 } from "./schema.js";
export function decodeBlocks(avroChunk) {
    let i = 0;
    const blocks = [];
    function decodeLEB128() {
        let shift = 0;
        let value = 0;
        while (true) {
            const byte = avroChunk.blocks[i++];
            if (byte === undefined)
                break;
            value |= (byte & 127) << shift;
            shift += 7;
            if ((byte & 128) === 0)
                break;
        }
        return value;
    }
    while (i < avroChunk.blocks.length) {
        const amount = decodeLEB128();
        const id = decodeLEB128();
        for (let j = 0; j < amount; j++) {
            blocks.push(id);
        }
    }
    return blocks;
}
export function convertTo3D(avroJson) {
    const chunkSize = 32;
    const blocks = [];
    for (const chunk of avroJson.chunks) {
        const decoded = decodeBlocks(chunk);
        let i = 0;
        for (let x = 0; x < chunkSize; x++) {
            for (let y = 0; y < chunkSize; y++) {
                for (let z = 0; z < chunkSize; z++) {
                    const id = decoded[i++];
                    if (id === undefined || id === 0)
                        continue;
                    blocks.push({
                        x: chunk.x * chunkSize + x,
                        y: chunk.y * chunkSize + y,
                        z: chunk.z * chunkSize + z,
                        id,
                    });
                }
            }
        }
    }
    return {
        name: avroJson.name,
        size: [avroJson.sizeX, avroJson.sizeY, avroJson.sizeZ],
        blocks,
    };
}
export function getBounds(blocks) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const b of blocks) {
        if (b.id === 0)
            continue;
        if (b.x < minX)
            minX = b.x;
        if (b.y < minY)
            minY = b.y;
        if (b.z < minZ)
            minZ = b.z;
        if (b.x > maxX)
            maxX = b.x;
        if (b.y > maxY)
            maxY = b.y;
        if (b.z > maxZ)
            maxZ = b.z;
    }
    return { minX, minY, minZ, maxX, maxY, maxZ };
}
export function parse(avroBuffer) {
    const data = schema0.fromBuffer(avroBuffer, undefined, true);
    return convertTo3D(data);
}
//# sourceMappingURL=decode.js.map