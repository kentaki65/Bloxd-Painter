export const brushState = {
    brushRadius: 3,
    brushType: "default",
    mode: "height",
    intensity: 0.1,
    threshold: 0.001,
    selectedBlock: "Grass Block",
    selectedLayer: "layerPineForest",
    targetHeight: null,
    loadedBrushes: null,
    rangeFilter: {
        above: {
            enabled: false,
            input: 0,
        },
        below: {
            enabled: false,
            input: 0
        }
    },
    blockLayers: [
        { depth: 1, block: 4 }, // 表面（Grass）
        { depth: 3, block: 2 }, // 土
        { depth: Infinity, block: 28 } // 石
    ]
};
//# sourceMappingURL=brushState.js.map