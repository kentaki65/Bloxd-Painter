export const chunkSize = 32;
export const cellSize = 10;

export const contour = 10;
export const DEFAULT_COLOR = [255,0,255];

export const blockColors = {
  "Air": [144, 215, 236],
  "Dirt": [120, 85, 60],
  "Grass Block": [20,120,40],
  "Sand": [200,190,120],
  "Stone": [120,120,120],
  "Messy Stone": [110,110,110],
  "Gravel": [130,130,130],
  "Clay": [150,160,170],
  "Andesite": [140,140,145],
  "Diorite": [210,210,210],
  "Granite": [150,110,100],
  "Snow": [240,240,240],
  "Water": [135, 206, 235]
};

export const layerColors = {
  layerDeliciousForest: [30,90,40],
  layerPineForest: [40,110,50]
};

export const treesStructures = {
  pine: [
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,491,491,491,0,0],[491,491,491,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,12,0,0,0],[0,0,12,0,0,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[491,491,12,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,491,491,491,0,0],[491,491,491,491,491,0],[0,491,491,491,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ],
    [
      [0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,491,0,0,0],[0,491,491,491,0,0],[0,0,491,0,0,0],[0,0,491,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]
    ]
  ]
}

export const sizeState = { //size.
  chunkLenX: 4,
  chunkLenZ: 4,
  maxHeight: 64,
  get widthLength() { return this.chunkLenX * chunkSize; },
  get heightLength() { return this.chunkLenZ * chunkSize; }
}

export const mapState = {
  map: null,
  blockMap: null,
  layerMap: null,
  topBlockMap: null,
  fileName: "schem",
  waterLevel: 0,
}

export const mouseState = {
  leftDown: false,
  rightDown: false,
  mouseX: 0,
  mouseY: 0,
}

export const cameraState = {
  camX: 0,
  camY: 0,
  zoom: 1,
  panning: false,
  panStartX: 0,
  panStartY: 0,
}

export const brushState = {
  brushRadius: 3,
  mode: "height",
  targetHeight: null,
  selectedBlock: "Grass Block",
  selectedLayer: "layerPineForest",

  atOrAboveEnabled: false,      // チェックボックスは初期オフ
  orAboveRangeInput: 0,         // number input 初期値 0
  atOrBelowEnabled: false,      // チェックボックスは初期オフ
  atOrBelowRangeInput: 0,       // number input 初期値 0
  
  brushType: "default",
  loadedBrushes: null,
  blockLayers: [
    { depth: 1, block: 4 }, // 表面（Grass）
    { depth: 3, block: 2 }, // 土
    { depth: Infinity, block: 28 } // 石
  ]
};
 
export const chunkState = {
  chunkCols: 0,
  chunkRows: 0,
  chunkCanvas: null,
  dirtyChunks: new Set(),
};

export const stackState = {
  undoStack: [],
  redoStack: [],
  MAX_HISTORY: 10,
};

export function initChunks(){
  chunkState.chunkCols = Math.ceil(sizeState.widthLength / chunkSize);
  chunkState.chunkRows = Math.ceil(sizeState.heightLength / chunkSize);

  chunkState.chunkCanvas = Array.from({ length: chunkState.chunkRows }, () =>
    Array.from({ length: chunkState.chunkCols }, () => null)
  );

  chunkState.dirtyChunks.clear();

  for(let cy = 0; cy < chunkState.chunkRows; cy++){
    for(let cx = 0; cx < chunkState.chunkCols; cx++){
      chunkState.dirtyChunks.add(`${cx},${cy}`);
    }
  }
}

export const mapInit = () =>
  Array.from({ length: sizeState.heightLength }, () =>
    new Array(sizeState.widthLength).fill(0)
  );

export const blockMapInit = () =>
  Array.from({ length: sizeState.maxHeight }, () =>
    Array.from({ length: sizeState.heightLength }, () =>
      new Array(sizeState.widthLength).fill(0)
    )
  );

export const layerMapInit = () =>
  Array.from({ length: sizeState.heightLength }, () =>
    new Array(sizeState.widthLength).fill(null)
  );

export const topBlockMap = () => 
  Array.from({ length: sizeState.heightLength }, () =>
    new Array(sizeState.widthLength).fill(null)
  );


export function initMaps() {
  mapState.map = mapInit();
  mapState.blockMap = blockMapInit();
  mapState.layerMap = layerMapInit();
  mapState.topBlockMap = topBlockMap();
}