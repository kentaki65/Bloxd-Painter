import { getElement } from "../../core/utils.js";
import { mapState, sizeState } from "../../states/index.js";
import { showPopup } from "../UI/loading.js";
import { redrawAllChunks } from "../chunk/index.js";
import { downloadJSON, importJSON } from "../parser/index.js";
let db = null;
const fileInput = document.createElement("input");
const openFile = getElement("openFile");
const saveFile = getElement("saveFile");
fileInput.type = "file";
fileInput.accept = ".json";
fileInput.onchange = (e) => {
    const target = e.target;
    const file = target.files?.[0];
    if (file)
        importJSON(file);
};
openFile.addEventListener("click", () => {
    fileInput.click();
});
saveFile.addEventListener("click", () => {
    downloadJSON();
});
document.addEventListener("keydown", (e) => {
    if (!document.activeElement)
        return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl)
        return;
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA")
        return;
    if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (e.shiftKey) {
            downloadJSON(); // Ctrl+Shift+S → ファイル保存
        }
        else {
            showPopup("quick saved!", 2000);
            quickSave(); // Ctrl+S → IndexedDB
        }
    }
    if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        //openLoadDialog(); // Ctrl+O → 読み込み
    }
});
export function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("terrainDB", 1);
        req.onupgradeneeded = (e) => {
            const target = e.target;
            if (!target)
                return;
            const database = target.result;
            database.createObjectStore("saves", { keyPath: "id" });
        };
        req.onsuccess = () => {
            db = req.result;
            redrawAllChunks();
            resolve();
        };
        req.onerror = () => {
            reject(req.error);
        };
    });
}
export function saveToDB(data) {
    return new Promise((resolve, reject) => {
        if (!db)
            return reject(new Error("DB not initialized"));
        const tx = db.transaction("saves", "readwrite");
        const store = tx.objectStore("saves");
        store.put({
            id: "autosave",
            data,
            time: Date.now()
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export function loadFromDB() {
    return new Promise((resolve, reject) => {
        if (!db)
            return reject(new Error("DB not initialized"));
        const tx = db.transaction("saves", "readonly");
        const store = tx.objectStore("saves");
        const req = store.get("autosave");
        req.onsuccess = () => {
            resolve(req.result?.data ?? null);
        };
        req.onerror = () => reject(req.error);
    });
}
export async function quickSave() {
    if (!mapState.map || !mapState.topBlockMap || !mapState.layerMap)
        return;
    const mapCopy = new Float32Array(mapState.map);
    const data = {
        map: mapCopy,
        topBlockMap: mapState.topBlockMap,
        layerMap: mapState.layerMap,
        chunkLenX: sizeState.chunkLenX,
        chunkLenZ: sizeState.chunkLenZ,
        maxHeight: sizeState.maxHeight,
    };
    await saveToDB(data);
    console.log("Auto Saved");
}
export function autoSave() {
    setInterval(async () => {
        await quickSave();
    }, 60000);
}
//# sourceMappingURL=index.js.map