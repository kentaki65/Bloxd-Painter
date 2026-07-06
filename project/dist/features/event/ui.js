// features/event/ui.ts
import { brushState, mapState, sizeState } from "../../states/index.js";
import { resizeHeight, resizeMap, redrawAllChunks, applyWaterLevel } from "../chunk/index.js";
import { writeBloxdSchem, downloadSchems, convertChunks, loadSchem, loadSchemAsWorld } from "../parser/index.js";
import { blockColors } from "../../core/constants.js";
import { create2D, create3D } from "../../core/utils.js";
export function initUiEvents(el) {
    function switchTab(activeTab, activeContent, tabs, contents) {
        tabs.forEach(tab => tab.classList.remove("tab--active"));
        contents.forEach(content => content.classList.add("hidden"));
        activeTab.classList.add("tab--active");
        activeContent.classList.remove("hidden");
    }
    const tabs = [el.terrainTab, el.advancedTab];
    const contents = [el.terrainContent, el.advancedSetting];
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
    el.brushTab.addEventListener("click", () => {
        el.toolName2.textContent = "Brushes";
        switchTab(el.brushTab, el.brushContent, tabs2, contents2);
    });
    el.optionTab.addEventListener("click", () => {
        el.toolName2.textContent = "Options";
        switchTab(el.optionTab, el.optionsContent, tabs2, contents2);
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
        mapState.map = create2D(sizeState.heightLength, sizeState.widthLength, 0);
        mapState.blockMap = create3D(sizeState.maxHeight, sizeState.heightLength, sizeState.widthLength, 0);
        mapState.layerMap = create2D(sizeState.heightLength, sizeState.widthLength, null);
        mapState.topBlockMap = create2D(sizeState.heightLength, sizeState.widthLength, null);
        redrawAllChunks();
    });
    el.exportInput.addEventListener("click", async () => {
        const json = convertChunks();
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
    el.paletteSizeInput.addEventListener("input", async (e) => {
        const target = e.target;
        const newSize = parseInt(target.value) || 8;
        await resizeMap(newSize, newSize);
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
}
//# sourceMappingURL=ui.js.map