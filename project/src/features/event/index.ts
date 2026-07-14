// features/event/index.ts
import { initCanvasInput, initKeyboardShortcuts } from "./input.js";
import { initUiEvents } from "./ui.js";
import { loadAllBrushes } from "../brush/loader.js";
import { getElement } from "../../core/utils.js";

const brushImages = [...Array.from({length: 36}, (_, index) => {
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

export function eventInit(): void {
  const canvas = getElement<HTMLCanvasElement>("canvas");

  initCanvasInput(canvas, {
    zoomSizeBar: getElement("zoom"),
    brushSizeBar: getElement("brushSize"),
    locationBar: getElement("location"),
    heightBar: getElement("heightchild"),
  });

  initKeyboardShortcuts();

  initUiEvents({
    intensity: getElement("intensity"),
    undoBtn: getElement("undo"), 
    redoBtn: getElement("redo"),
    modeBar: getElement("mode"),
    layerBar: getElement("layer"),
    selectBlockBar: getElement("selectBlock"),
    terrainTab: getElement("terraintab"),
    advancedTab: getElement("advancedtab"),
    layertab: getElement("layertab"),
    layerContent: getElement("layerContent"),
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
    fileInput: getElement<HTMLInputElement>("schemInput"),
    fileNameInput: getElement<HTMLInputElement>("volume"),
    paletteWidthInput: getElement<HTMLInputElement>("paletteWidth"),
    paletteHeightInput: getElement<HTMLInputElement>("paletteHeight"),
    maxHeightInput: getElement<HTMLInputElement>("maxHeight"),
    waterLevelInput: getElement<HTMLInputElement>("waterLevelHeight"),
    aboveEnabled: getElement<HTMLInputElement>("atOrAboveEnabled"),
    belowEnabled: getElement<HTMLInputElement>("atOrBelowEnabled"),

    brushModeButtons: [
      getElement("sprayPaint"),
      getElement("height"),
      getElement("flatten"),
      getElement("smooth"),
      getElement("layerPaint")
    ],
    blockModeButtons: [
      ...blockIds.map(id => {
        return getElement(id);
      })
    ],
    
    createWorldOverlay: getElement("createWorldOverlay"),
    createWorldConfirm: getElement("createWorldConfirm"),
    createWorldCancel: getElement("createWorldCancel"),
    newFileNameInput: getElement<HTMLInputElement>("newFileName"),
    newChunkXInput: getElement<HTMLInputElement>("newChunkX"),
    newChunkZInput: getElement<HTMLInputElement>("newChunkZ"),
    newMaxHeightInput: getElement<HTMLInputElement>("newMaxHeight"),
    newWaterLevelInput: getElement<HTMLInputElement>("newWaterLevel"),

    editBlockLayer: getElement("editBlockLayer"),
    editBlockLayerOverlay: getElement("editBlockLayerOverlay"),
    jsonInput: getElement<HTMLInputElement>("jsonInput"),
    editBlockLayerConfirm: getElement("editBlockLayerConfirm"),
    editBlockLayerCancel: getElement("editBlockLayerCancel"),
    errorlog: getElement("errorlog"),

    loadSchemOverlay: getElement("loadSchemOverlay"),
    schemFileInput: getElement<HTMLInputElement>("schemFileInput"),
    schemDensityInput: getElement<HTMLInputElement>("schemDensityInput"),
    schemMinSpacingInput: getElement<HTMLInputElement>("schemMinSpacingInput"),
    schemErrorlog: getElement("schemErrorlog"),
    loadSchemConfirm: getElement("loadSchemConfirm"),
    loadSchemCancel: getElement("loadSchemCancel"),

    addLayer: getElement("addLayer"),
    addLayerBtn: getElement("addLayerBtn"),
    newLayerNameInput: getElement<HTMLInputElement>("newLayerNameInput"),
    newLayerColorInput: getElement<HTMLInputElement>("newLayerColorInput"),
    schemTargetLayerSelect: getElement("schemTargetLayerSelect"),
  });

  loadAllBrushes(brushImages, getElement("brushUI"), getElement("brushType"));
}