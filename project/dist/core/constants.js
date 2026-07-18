export const chunkSize = 32; //チャンクの縦/横幅
export const cellSize = 10;
export const contour = 10; //contorごとに等高線が引かれる
export const SPRAY_INTENSITY_MIN = 0.025;
export const SPRAY_INTENSITY_MAX = 0.1;
export const DEFAULT_COLOR = [255, 0, 255]; //ブロックが見つからなかった時のデフォルトカラー
export const BRUSH_IMAGE_PATH = "assets/brushes/";
export const blockColors = {
    "Air": [144, 215, 236],
    "Dirt": [120, 85, 60],
    "Grass Block": [20, 120, 40],
    "Sand": [200, 190, 120],
    "Stone": [120, 120, 120],
    "Messy Stone": [110, 110, 110],
    "Gravel": [130, 130, 130],
    "Clay": [150, 160, 170],
    "Andesite": [140, 140, 145],
    "Diorite": [210, 210, 210],
    "Granite": [150, 110, 100],
    "Snow": [240, 240, 240],
    "Water": [135, 206, 235],
};
export * from "./types.js";
//# sourceMappingURL=constants.js.map