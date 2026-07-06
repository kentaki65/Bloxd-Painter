import { initCanvasInput, initKeyboardShortcuts } from "./input.js";
import { initUiEvents } from "./ui.js";
import { loadAllBrushes } from "../brush/loader.js";
import { getElement } from "../../core/utils.js";
const brushImages = [...Array.from({ length: 36 }, (_, index) => {
        return `brush${(index + 1)}.webp`;
    })];
export function eventInit() {
    const canvas = getElement("canvas");
    initCanvasInput(canvas);
    initKeyboardShortcuts();
    initUiEvents({
        modeBar: getElement("mode"),
        layerBar: getElement("layer"),
        selectBlockBar: getElement("selectBlock"),
        terrainTab: getElement("terraintab"),
        advancedTab: getElement("advancedtab"),
        terrainContent: getElement("terrainContent"),
        advancedSetting: getElement("advancedContent"),
        brushTab: getElement("brushestab"),
        optionTab: getElement("optionstab"),
        brushContent: getElement("brushContent"),
        optionsContent: getElement("optionsContent"),
        toolName: getElement("toolName"),
        toolName2: getElement("toolName2"),
        newFileInput: getElement("newFile"),
        exportInput: getElement("exportFile"),
        importInput: getElement("importInput"),
        fileInput: getElement("schemInput"),
        fileNameInput: getElement("volume"),
        paletteSizeInput: getElement("paletteSize"),
        maxHeightInput: getElement("maxHeight"),
        waterLevelInput: getElement("waterLevelHeight"),
        aboveEnabled: getElement("atOrAboveEnabled"),
        belowEnabled: getElement("atOrBelowEnabled"),
    });
    loadAllBrushes(brushImages, getElement("brushUI"), getElement("brushType"));
}
//# sourceMappingURL=index.js.map