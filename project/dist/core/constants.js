export const chunkSize = 32; //チャンクの縦/横幅
export const cellSize = 10; //なにこれ
export const contour = 10; //contorごとに等高線が引かれる
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
export const LEAF_BLOCKS = new Set([
    100, 101, 102, 103,
    208, 209, 210, 211,
    491, 492, 493,
    494, 495, 496,
    1259, 2019, 2020, 2021, 2022, 2023, 2024, 2025
]);
export * from "./types.js";
//# sourceMappingURL=constants.js.map