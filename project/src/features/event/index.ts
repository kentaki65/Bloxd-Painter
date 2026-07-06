import { initCanvasInput, initKeyboardShortcuts } from "./input.js";
import { initUiEvents } from "./ui.js";
import { loadAllBrushes } from "../brush/loader.js";
import { getElement } from "../../core/utils.js";

const brushImages = [...Array.from({length: 36}, (_, index) => {
  return `brush${(index + 1)}.webp`;
})];

export function eventInit(): void {
  const canvas = getElement<HTMLCanvasElement>("canvas");

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
    fileInput: getElement<HTMLInputElement>("schemInput"),
    fileNameInput: getElement<HTMLInputElement>("volume"),
    paletteSizeInput: getElement<HTMLInputElement>("paletteSize"),
    maxHeightInput: getElement<HTMLInputElement>("maxHeight"),
    waterLevelInput: getElement<HTMLInputElement>("waterLevelHeight"),
    aboveEnabled: getElement<HTMLInputElement>("atOrAboveEnabled"),
    belowEnabled: getElement<HTMLInputElement>("atOrBelowEnabled"),
  });

  loadAllBrushes(brushImages, getElement("brushUI"), getElement("brushType"));
}