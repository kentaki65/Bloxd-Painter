// features/event/index.ts
import { initCanvasInput, initKeyboardShortcuts } from "./input.js";
import { initUiEvents } from "./ui.js";
import { loadAllBrushes } from "../brush/loader.js";
import { getElement } from "../../core/utils.js";
const brushImages = [...Array.from({ length: 36 }, (_, index) => {
        return `brush${(index + 1)}.webp`;
    })];
const blockIds = [
    "Dirt",
    "Grass Block",
    "Sand",
    "Stone",
    "MessyStone",
    "Gravel",
    "Clay",
    "Andesite",
    "Diorite",
    "Granite",
    "Snow"
];
export function eventInit() {
    const canvas = getElement("canvas");
    initCanvasInput(canvas, {
        zoomSizeBar: getElement("zoom"),
        brushSizeBar: getElement("brushSize"),
        locationBar: getElement("location"),
        heightBar: getElement("heightchild"),
    });
    initKeyboardShortcuts();
    initUiEvents({
        undoBtn: getElement("undo"),
        redoBtn: getElement("redo"),
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
        paletteWidthInput: getElement("paletteWidth"),
        paletteHeightInput: getElement("paletteHeight"),
        maxHeightInput: getElement("maxHeight"),
        waterLevelInput: getElement("waterLevelHeight"),
        aboveEnabled: getElement("atOrAboveEnabled"),
        belowEnabled: getElement("atOrBelowEnabled"),
        brushModeButtons: [
            getElement("sprayPaint"),
            getElement("height"),
            getElement("flatten"),
            getElement("smooth"),
        ],
        blockModeButtons: [
            ...blockIds.map(id => {
                return getElement(id);
            })
        ],
        createWorldOverlay: getElement("createWorldOverlay"),
        createWorldConfirm: getElement("createWorldConfirm"),
        createWorldCancel: getElement("createWorldCancel"),
        newFileNameInput: getElement("newFileName"),
        newChunkXInput: getElement("newChunkX"),
        newChunkZInput: getElement("newChunkZ"),
        newMaxHeightInput: getElement("newMaxHeight"),
        newWaterLevelInput: getElement("newWaterLevel"),
    });
    loadAllBrushes(brushImages, getElement("brushUI"), getElement("brushType"));
}
//# sourceMappingURL=index.js.map