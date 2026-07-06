import { getElement } from "../../core/utils.js";
import { mapState } from "../../states/index.js";
import { showPopup } from "../UI/loading.js";
import { redrawAllChunks } from "../chunk/index.js";
import { SaveData } from "../../core/types.js";
import { downloadJSON, importJSON } from "../parser/index.js";

let db: IDBDatabase | null = null;

const fileInput = document.createElement("input");
const openFile = getElement("openFile");
const saveFile = getElement("saveFile");

fileInput.type = "file";
fileInput.accept = ".json";

fileInput.onchange = (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) importJSON(file);
};

openFile.addEventListener("click", () => {
  fileInput.click();
});

saveFile.addEventListener("click", () => {
  downloadJSON();
})

document.addEventListener("keydown", (e) => {
  if(!document.activeElement)return;

  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.key === "s" || e.key === "S") {
    e.preventDefault();

    if (e.shiftKey) {
      downloadJSON(); // Ctrl+Shift+S → ファイル保存
    } else {
      showPopup("quick saved!", 2000);
      quickSave(); // Ctrl+S → IndexedDB
    }
  }

  if (e.key === "o" || e.key === "O") {
    e.preventDefault();
    //openLoadDialog(); // Ctrl+O → 読み込み
  }
});

export function initDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("terrainDB", 1);

    req.onupgradeneeded = (e) => {
      const target = e.target as IDBOpenDBRequest | null;
      if (!target) return;

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

export function saveToDB(data: SaveData): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("DB not initialized"));

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

export function loadFromDB(): Promise<SaveData | null> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("DB not initialized"));

    const tx = db.transaction("saves", "readonly");
    const store = tx.objectStore("saves");
    const req = store.get("autosave");

    req.onsuccess = () => {
      resolve(req.result?.data ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function quickSave(): Promise<void> {
  if (!mapState.map || !mapState.topBlockMap || !mapState.layerMap) return;

  const data: SaveData = {
    map: mapState.map,
    topBlockMap: mapState.topBlockMap,
    layerMap: mapState.layerMap
  };

  await saveToDB(data);
  console.log("Auto Saved");
}

export function autoSave(): void{
  setInterval(async () => {
    await quickSave();
  }, 60000)
}
