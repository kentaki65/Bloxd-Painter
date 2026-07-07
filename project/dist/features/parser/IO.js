import { mapState, sizeState, chunkState, getHeight } from "../../states/index.js";
import { chunkSize } from "../../core/constants.js";
import { resizeMap, resizeHeight, rebuildColumn, redrawAllChunks } from "../chunk/index.js";
import { parse } from "./decode.js";
import { Buffer } from "https://esm.sh/buffer";
export async function downloadSchems(result) {
    const baseName = mapState.fileName || "schem";
    if (result.schems.length === 1) {
        const schem = result.schems[0];
        if (!schem)
            return;
        const blob = new Blob([new Uint8Array(schem)], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.bloxdschem`;
        a.click();
        URL.revokeObjectURL(url);
        return;
    }
    const zip = new JSZip();
    result.schems.forEach((bin, i) => {
        zip.file(`${baseName}${i}.bloxdschem`, new Uint8Array(bin));
    });
    zip.file("schem.json", JSON.stringify({
        version: 1,
        split: true,
        count: result.schems.length
    }, null, 2));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
}
export function downloadJSON() {
    if (!mapState.map || !mapState.topBlockMap || !mapState.layerMap)
        return;
    const data = {
        version: 1,
        map: mapState.map,
        topBlockMap: mapState.topBlockMap,
        layerMap: mapState.layerMap,
        meta: {
            width: sizeState.widthLength,
            height: sizeState.heightLength,
            maxHeight: sizeState.maxHeight,
            time: Date.now()
        }
    };
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terrain_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
export function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const parseData = reader.result;
            if (!parseData || typeof parseData !== "string")
                return; // readAsText なので string のはず
            const data = JSON.parse(parseData); // ← parseData を使う
            if (!data.map || !data.meta) {
                throw new Error("Invalid format");
            }
            const targetChunkX = Math.ceil(data.meta.width / chunkSize);
            const targetChunkZ = Math.ceil(data.meta.height / chunkSize);
            if (targetChunkX !== sizeState.chunkLenX || targetChunkZ !== sizeState.chunkLenZ) {
                const ok = confirm("マップサイズが違います。リサイズして読み込みますか？");
                if (!ok)
                    return;
                await resizeMap(targetChunkX, targetChunkZ);
            }
            if (data.meta.maxHeight !== sizeState.maxHeight) {
                await resizeHeight(data.meta.maxHeight);
            }
            mapState.map = data.map;
            mapState.topBlockMap = data.topBlockMap ?? null;
            mapState.layerMap = data.layerMap ?? null;
            if (!mapState.map)
                return;
            for (let y = 0; y < sizeState.heightLength; y++) {
                for (let x = 0; x < sizeState.widthLength; x++) {
                    const height = getHeight(y, x);
                    if (height === undefined)
                        continue;
                    rebuildColumn(x, y, height);
                }
            }
            chunkState.dirtyChunks.clear();
            redrawAllChunks();
            console.log("Loaded JSON");
        }
        catch (e) {
            console.error("Invalid JSON", e);
        }
    };
    reader.readAsText(file);
}
export function loadSchem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const arrayBuffer = reader.result;
                if (!arrayBuffer || typeof arrayBuffer === "string")
                    return reject(new Error("Invalid file data"));
                const uint8 = new Uint8Array(arrayBuffer);
                const buf = Buffer.from(uint8);
                const result = parse(buf);
                resolve(result);
            }
            catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}
//# sourceMappingURL=IO.js.map