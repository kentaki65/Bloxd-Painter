// features/event/ui.ts
import { brushState, mapState, sizeState, schemState } from "../../states/index.js";
import { resizeHeight, resizeMap, redrawAllChunks, applyWaterLevel, resizeMapEmpty } from "../chunk/index.js";
import { writeBloxdSchem, downloadSchems, convertChunks, loadSchem, loadSchemAsWorld } from "../parser/index.js";
import { blockColors } from "../../core/constants.js";
import { layerColors } from "../../core/types.js";
import { initMaps } from "../../states/init.js";
import { redo, undo } from "../history/index.js";
import { reinitBrushWorkerMap } from "../brush/workerBridge.js";
import { reinitRenderWorkerMap, syncRenderWorkerState } from "../render/renderBridge.js";
import { hexToRgb, parseJsonWithInfinity, validateBlockLayers } from "../../core/utils.js";
import { addCustomLayer, deleteCustomLayer, getAllLayerNames, populateLayerSelect } from "../../states/customLayerState.js";
import { renderLayerButtons } from "../UI/createLayerBtn.js";
import { exportWithStamps } from "../parser/schemaParts.js";
import { deleteLayerFromDB, loadAllLayersFromDB, saveLayerToDB, saveSchemState, loadSchemState } from "../autosave/index.js";
let pendingSchemFile = null;
export async function initUiEvents(el) {
    const layerToolTypesEl = document.querySelector("#layerContent .toolTypes");
    async function handleDeleteLayer(name) {
        deleteCustomLayer(name);
        populateLayerSelect(el.schemTargetLayerSelect, getAllLayerNames());
        const currentLayerToolTypesEl = document.querySelector("#layerContent .toolTypes");
        if (currentLayerToolTypesEl) {
            renderLayerButtons(currentLayerToolTypesEl, layerColors, handleDeleteLayer);
        }
        if (mapState.layerMap) {
            for (let x = 0; x < mapState.layerMap.length; x++) {
                const row = mapState.layerMap[x];
                if (!row)
                    continue;
                for (let z = 0; z < row.length; z++) {
                    if (row[z] === name) {
                        row[z] = "none";
                    }
                }
            }
            redrawAllChunks();
            syncRenderWorkerState();
        }
        try {
            await deleteLayerFromDB(name);
        }
        catch (err) {
            console.error("Failed to delete layer from DB:", err);
        }
    }
    try {
        const savedLayers = await loadAllLayersFromDB();
        for (const { name, color } of savedLayers) {
            addCustomLayer(name, color);
        }
    }
    catch (err) {
        console.error("Failed to restore layers from DB:", err);
    }
    renderLayerButtons(layerToolTypesEl, layerColors, handleDeleteLayer);
    populateLayerSelect(el.schemTargetLayerSelect, getAllLayerNames());
    try {
        const savedSchemState = await loadSchemState();
        if (savedSchemState) {
            schemState.selected = savedSchemState.selected;
            schemState.settings = savedSchemState.settings;
            if (schemState.settings.targetLayer) {
                el.schemTargetLayerSelect.value = schemState.settings.targetLayer;
            }
            el.schemDensityInput.value = String(schemState.settings.density);
            el.schemMinSpacingInput.value = String(schemState.settings.minSpacing);
        }
    }
    catch (err) {
        console.error("Failed to restore schem state from DB:", err);
    }
    function switchTab(activeTab, activeContent, tabs, contents) {
        tabs.forEach(tab => tab.classList.remove("tab--active"));
        contents.forEach(content => content.classList.add("hidden"));
        activeTab.classList.add("tab--active");
        activeContent.classList.remove("hidden");
    }
    const tabs = [el.terrainTab, el.advancedTab, el.layertab];
    const contents = [el.terrainContent, el.advancedSetting, el.layerContent];
    const tabs2 = [el.brushTab, el.optionTab];
    const contents2 = [el.brushContent, el.optionsContent];
    el.terrainTab.addEventListener("click", () => {
        el.toolName.textContent = "terrain";
        switchTab(el.terrainTab, el.terrainContent, tabs, contents);
    });
    el.advancedTab.addEventListener("click", () => {
        el.toolName.textContent = "advancedSetting";
        switchTab(el.advancedTab, el.advancedSetting, tabs, contents);
    });
    el.layertab.addEventListener("click", () => {
        el.toolName.textContent = "layer";
        switchTab(el.layertab, el.layerContent, tabs, contents);
    });
    el.brushTab.addEventListener("click", () => {
        el.toolName2.textContent = "Brushes";
        switchTab(el.brushTab, el.brushContent, tabs2, contents2);
    });
    el.optionTab.addEventListener("click", () => {
        el.toolName2.textContent = "Options";
        switchTab(el.optionTab, el.optionsContent, tabs2, contents2);
    });
    el.brushModeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            el.brushModeButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            brushState.mode = btn.id;
            el.modeBar.textContent = `Mode: ${btn.id}`;
        });
    });
    el.blockModeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            el.blockModeButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            brushState.selectedBlock = btn.id;
            el.selectBlockBar.textContent = `Block: ${btn.id}`;
        });
    });
    Object.keys(blockColors).forEach(name => {
        const elementId = "block" + name[0]?.toUpperCase() + name.slice(1);
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener("click", () => {
                brushState.selectedBlock = name;
                el.selectBlockBar.textContent = `Block: ${name}`;
            });
        }
    });
    el.newFileInput.addEventListener("click", () => {
        el.createWorldOverlay.classList.add("show");
        el.createWorldOverlay.classList.remove("hidden");
    });
    el.createWorldCancel.addEventListener("click", () => {
        el.createWorldOverlay.classList.remove("show");
    });
    el.createWorldConfirm.addEventListener("click", async () => {
        const fileName = el.newFileNameInput.value || "schem";
        const chunkX = parseInt(el.newChunkXInput.value) || 4;
        const chunkZ = parseInt(el.newChunkZInput.value) || 4;
        const maxHeight = parseInt(el.newMaxHeightInput.value) || 64;
        const waterLevel = parseInt(el.newWaterLevelInput.value) || 0;
        mapState.fileName = fileName;
        sizeState.maxHeight = maxHeight;
        mapState.waterLevel = waterLevel;
        el.fileNameInput.value = fileName;
        el.paletteHeightInput.value = String(chunkZ);
        el.paletteWidthInput.value = String(chunkX);
        el.maxHeightInput.value = String(maxHeight);
        el.waterLevelInput.value = String(waterLevel);
        await resizeMapEmpty(chunkX, chunkZ);
        applyWaterLevel();
        reinitBrushWorkerMap();
        reinitRenderWorkerMap();
        el.createWorldOverlay.classList.remove("show");
    });
    el.newFileInput.addEventListener("click", () => {
        initMaps();
        redrawAllChunks();
    });
    el.editBlockLayer.addEventListener("click", e => {
        el.editBlockLayerOverlay.classList.add("show");
        el.editBlockLayerOverlay.classList.remove("hidden");
    });
    el.editBlockLayerCancel.addEventListener("click", e => {
        el.editBlockLayerOverlay.classList.remove("show");
    });
    el.editBlockLayerConfirm.addEventListener("click", e => {
        const value = el.jsonInput.value;
        if (!value)
            return;
        try {
            const json = parseJsonWithInfinity(value);
            const errorMessages = validateBlockLayers(json);
            if (errorMessages.length === 0) {
                el.editBlockLayerOverlay.classList.remove("show");
                el.errorlog.textContent = "";
                brushState.blockLayers = json;
            }
            else {
                el.errorlog.textContent = errorMessages.join("\n");
            }
        }
        catch (e) {
            el.errorlog.textContent = e?.message ?? "throwed error";
        }
    });
    el.addLayer.addEventListener("click", () => {
        el.loadSchemOverlay.classList.add("show");
        el.loadSchemOverlay.classList.remove("hidden");
    });
    el.schemFileInput.addEventListener("change", () => {
        pendingSchemFile = el.schemFileInput.files?.[0] ?? null;
        el.schemErrorlog.textContent = "";
    });
    el.loadSchemConfirm.addEventListener("click", async () => {
        if (!pendingSchemFile) {
            el.schemErrorlog.textContent = "Please select a schematic file";
            return;
        }
        const density = Number(el.schemDensityInput.value);
        const minSpacing = Number(el.schemMinSpacingInput.value);
        const targetLayer = el.schemTargetLayerSelect.value;
        if (Number.isNaN(density) || density < 0 || density > 1) {
            el.schemErrorlog.textContent = "Density must be between 0 and 1";
            return;
        }
        if (Number.isNaN(minSpacing) || minSpacing < 1) {
            el.schemErrorlog.textContent = "Min spacing must be at least 1";
            return;
        }
        if (!targetLayer) {
            el.schemErrorlog.textContent = "Please select a target layer";
            return;
        }
        try {
            const parsed = await loadSchem(pendingSchemFile);
            schemState.selected = parsed;
            schemState.settings.density = density;
            schemState.settings.minSpacing = minSpacing;
            schemState.settings.targetLayer = targetLayer;
            el.schemErrorlog.textContent = "";
            el.loadSchemOverlay.classList.remove("show");
            try {
                await saveSchemState(schemState);
            }
            catch (err) {
                console.error("Failed to save schem state to DB:", err);
            }
        }
        catch (err) {
            el.schemErrorlog.textContent = err?.message ?? "Failed to load schematic";
        }
        finally {
            syncRenderWorkerState();
        }
    });
    el.loadSchemCancel.addEventListener("click", () => {
        el.loadSchemOverlay.classList.remove("show");
    });
    el.addLayerBtn.addEventListener("click", async () => {
        const name = el.newLayerNameInput.value;
        const rgb = hexToRgb(el.newLayerColorInput.value);
        const result = addCustomLayer(name, rgb);
        if (!result.ok) {
            el.schemErrorlog.textContent = result.reason ?? "Failed to add layer";
            return;
        }
        el.newLayerNameInput.value = "";
        el.schemErrorlog.textContent = "";
        populateLayerSelect(el.schemTargetLayerSelect, getAllLayerNames());
        const layerToolTypesEl = document.querySelector("#layerContent .toolTypes");
        if (layerToolTypesEl) {
            renderLayerButtons(layerToolTypesEl, layerColors, handleDeleteLayer);
        }
        try {
            await saveLayerToDB({ name: name.trim(), color: rgb });
        }
        catch (err) {
            console.error("Failed to save layer to DB:", err);
        }
    });
    el.exportInput.addEventListener("click", async () => {
        let blockMapForExport = undefined;
        if (schemState.selected && schemState.settings.targetLayer) {
            blockMapForExport = exportWithStamps(schemState.settings.targetLayer, {
                schem: schemState.selected,
                density: schemState.settings.density,
                minSpacing: schemState.settings.minSpacing,
                targetLayer: schemState.settings.targetLayer,
            });
        }
        const json = convertChunks(blockMapForExport);
        if (!json)
            return;
        const result = writeBloxdSchem(json);
        await downloadSchems(result);
    });
    el.importInput.addEventListener("click", () => {
        el.fileInput.click();
    });
    el.fileInput.addEventListener("change", async (e) => {
        const target = e.target;
        const file = target.files?.[0];
        if (!file)
            return;
        const result = await loadSchem(file);
        await loadSchemAsWorld(result);
    });
    el.fileNameInput.addEventListener("input", (e) => {
        const target = e.target;
        mapState.fileName = target.value;
    });
    el.paletteHeightInput.addEventListener("input", async (e) => {
        const target = e.target;
        const newSize = parseInt(target.value) || 8;
        const otherSize = parseInt(el.paletteWidthInput.value);
        await resizeMap(otherSize, newSize);
    });
    el.paletteWidthInput.addEventListener("input", async (e) => {
        const target = e.target;
        const newSize = parseInt(target.value) || 8;
        const otherSize = parseInt(el.paletteHeightInput.value);
        await resizeMap(newSize, otherSize);
    });
    el.maxHeightInput.addEventListener("input", async (e) => {
        const target = e.target;
        const value = parseInt(target.value) || 64;
        sizeState.maxHeight = value;
        await resizeHeight(value);
    });
    el.waterLevelInput.addEventListener("input", (e) => {
        const target = e.target;
        const value = parseInt(target.value) || 0;
        mapState.waterLevel = value;
        applyWaterLevel();
    });
    el.aboveEnabled.addEventListener("change", (e) => {
        const target = e.target;
        brushState.rangeFilter.above.enabled = target.checked;
    });
    el.belowEnabled.addEventListener("change", (e) => {
        const target = e.target;
        brushState.rangeFilter.below.enabled = target.checked;
    });
    el.aboveInput.addEventListener("change", e => {
        const target = e.target;
        brushState.rangeFilter.above.input = target.valueAsNumber;
    });
    el.belowInput.addEventListener("change", e => {
        const target = e.target;
        brushState.rangeFilter.below.input = target.valueAsNumber;
    });
    el.slopeAboveEnabled.addEventListener("change", (e) => {
        const target = e.target;
        brushState.rangeFilter.slopeAbove.enabled = target.checked;
    });
    el.slopeBelowEnabled.addEventListener("change", (e) => {
        const target = e.target;
        brushState.rangeFilter.slopeBelow.enabled = target.checked;
    });
    el.slopeAboveInput.addEventListener("input", (e) => {
        const target = e.target;
        brushState.rangeFilter.slopeAbove.input = target.valueAsNumber || 0;
    });
    el.slopeBelowInput.addEventListener("input", (e) => {
        const target = e.target;
        brushState.rangeFilter.slopeBelow.input = target.valueAsNumber || 90;
    });
    el.intensity.addEventListener("change", (e) => {
        const target = e.target;
        brushState.intensity = target.valueAsNumber;
    });
    el.undoBtn.addEventListener("click", undo);
    el.redoBtn.addEventListener("click", redo);
}
//# sourceMappingURL=ui.js.map