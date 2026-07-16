import { sizeState, mapState, getLayer, inBounds, getHeight } from "../../states/index.js";
import type { StampOptions, WorldBlock, ParsedResult } from "../../core/types.js";
const POISSON_K = 30;

function cloneBlockMap(blockMap: number[][][]): number[][][] {
  return blockMap.map(layer => layer.map(row => [...row]));
}

function getRootAnchor(blocks: WorldBlock[]): { dx: number; dz: number; minY: number } {
  let minY = Infinity;
  let anchorDx = 0;
  let anchorDz = 0;

  for (const b of blocks) {
    if (b.y < minY) {
      minY = b.y;
      anchorDx = b.x;
      anchorDz = b.z;
    }
  }

  return { dx: anchorDx, dz: anchorDz, minY };
}

function setBlockOn(
  blockMapClone: number[][][],
  y: number, z: number, x: number, value: number
): void {
  const layer = blockMapClone[y];
  if (!layer) return;
  const row = layer[z];
  if (!row) return;
  row[x] = value;
}

export function exportWithStamps(targetLayer: string, options: StampOptions): number[][][] {
  if (!mapState.blockMap) throw new Error("blockMap is not initialized");
  const clonedBlockMap = cloneBlockMap(mapState.blockMap!);
  const stampedBlocks = stampSchemOnLayer(options);

  for (const b of stampedBlocks) {
    setBlockOn(clonedBlockMap, b.y, b.z, b.x, b.id);
  }

  return clonedBlockMap;
}

function pickStampOrigins(options: StampOptions): { x: number; z: number }[] {
  const { minSpacing, density } = options;
  const points = poissonDiskSample(sizeState.widthLength, sizeState.heightLength, minSpacing);
 
  const origins = points.filter(() => Math.random() < density);
 
  return origins.filter(({ x, z }) => inBounds(z, x));
}

function poissonDiskSample(
  width: number, height: number, minDist: number
): { x: number; z: number }[] {
  const cellSize = minDist / Math.SQRT2;
  const gridW = Math.ceil(width / cellSize);
  const gridH = Math.ceil(height / cellSize);
  const grid: ({ x: number; z: number } | null)[] = new Array(gridW * gridH).fill(null);

  const points: { x: number; z: number }[] = [];
  const active: { x: number; z: number }[] = [];

  const gridIndex = (x: number, z: number) => {
    const gx = Math.floor(x / cellSize);
    const gz = Math.floor(z / cellSize);
    return gz * gridW + gx;
  };

  const isFarEnough = (x: number, z: number): boolean => {
    const gx = Math.floor(x / cellSize);
    const gz = Math.floor(z / cellSize);

    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const nz = gz + dz;
        if (nx < 0 || nz < 0 || nx >= gridW || nz >= gridH) continue;

        const neighbor = grid[nz * gridW + nx];
        if (!neighbor) continue;

        const ddx = neighbor.x - x;
        const ddz = neighbor.z - z;
        if (ddx * ddx + ddz * ddz < minDist * minDist) return false;
      }
    }
    return true;
  };

  const addPoint = (x: number, z: number) => {
    const p = { x, z };
    points.push(p);
    active.push(p);
    grid[gridIndex(x, z)] = p;
  };

  addPoint(Math.random() * width, Math.random() * height);

  while (active.length > 0) {
    const idx = Math.floor(Math.random() * active.length);
    const base = active[idx]!;
    let found = false;

    for (let i = 0; i < POISSON_K; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDist * (1 + Math.random()); // [minDist, 2*minDist)
      const nx = base.x + Math.cos(angle) * radius;
      const nz = base.z + Math.sin(angle) * radius;

      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      if (!isFarEnough(nx, nz)) continue;

      addPoint(nx, nz);
      found = true;
      break;
    }

    if (!found) {
      active.splice(idx, 1);
    }
  }

  return points.map(p => ({ x: Math.floor(p.x), z: Math.floor(p.z) }));
}

function fitsWithinLayer(
  originX: number, originZ: number,
  footprintCells: { dx: number; dz: number }[],
  targetLayer: string
): boolean {
  for (const { dx, dz } of footprintCells) {
    const x = originX + dx;
    const z = originZ + dz;
    const layer = getLayer(z, x);
    if (!inBounds(z, x)) return false;
    if (layer !== targetLayer) return false;
  }
  return true;
}

function getFootprint(blocks: WorldBlock[]): { dx: number; dz: number }[] {
  const seen = new Set<string>();
  const footprint: { dx: number; dz: number }[] = [];
  for (const b of blocks) {
    const key = `${b.x},${b.z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    footprint.push({ dx: b.x, dz: b.z });
  }
  return footprint;
}

function stampAt(
  originX: number, originZ: number,
  schem: ParsedResult, anchor: { dx: number; dz: number; minY: number }
): WorldBlock[] {
  const anchorWorldX = originX + anchor.dx;
  const anchorWorldZ = originZ + anchor.dz;

  const groundY = getHeight(anchorWorldZ, anchorWorldX);
  if (groundY === undefined) return [];

  const groundYInt = Math.round(groundY);

  return schem.blocks.map(b => ({
    x: originX + b.x,
    y: groundYInt + (b.y - anchor.minY),
    z: originZ + b.z,
    id: b.id,
  }));
}

export function stampSchemOnLayer(options: StampOptions): WorldBlock[] {
  const { schem, targetLayer } = options;
  const anchor = getRootAnchor(schem.blocks);
  const footprint = getFootprint(schem.blocks);

  const origins = pickStampOrigins(options);
  const result: WorldBlock[] = [];

  for (const { x, z } of origins) {
    if (!fitsWithinLayer(x, z, footprint, targetLayer)) continue;
    result.push(...stampAt(x, z, schem, anchor));
  }

  return result;
}