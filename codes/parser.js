import avro from "https://esm.sh/avsc@5.7.9";
import { Buffer } from "https://esm.sh/buffer";
import { nameToId } from "./nameMap.js";
import { treesStructures, mapState, sizeState, chunkState, brushState} from "./state.js";
import { resizeMapEmpty, resizeHeightEmpty } from "./chunk.js";

const schema0 = avro.Type.forSchema({
	type: "record",
	name: "Schematic",
	fields: [
		{ name: 'headers', type: { type: 'fixed', size: 4 }, default: "\u{0}\u{0}\u{0}\u{0}" },
		{ name: "name", type: "string" },
		{ name: "x", type: "int" },
		{ name: "y", type: "int" },
		{ name: "z", type: "int" },
		{ name: "sizeX", type: "int" },
		{ name: "sizeY", type: "int" },
		{ name: "sizeZ", type: "int" },
		{
			name: "chunks",
			type: {
				type: "array",
				items: {
					type: "record",
					fields: [
						{ name: "x", type: "int" },
						{ name: "y", type: "int" },
						{ name: "z", type: "int" },
						{ name: "blocks", type: "bytes" }
					]
				}
			}
		}
	]
});
const chunkSize = 32;

function getMaxUsedHeight() {
	let max = 0;
	for (let z = 0; z < sizeState.heightLength; z++) {
		for (let x = 0; x < sizeState.widthLength; x++) {
			const h = mapState.map[z][x];
			if (h > max) max = h;
		}
	}
	return max;
}

export function growForest(pattern, spacing = 8) {
  const width = sizeState.widthLength;
  const height = sizeState.heightLength;

  for (let z = 0; z < height; z += spacing) {
    for (let x = 0; x < width; x += spacing) {

      const pos = getRandomOffset(x, z, spacing);
      if (!canPlace(pos, pattern)) continue;

      const yStart = getSurfaceY(pos);
      placePattern(pattern, pos, yStart);
    }
  }
}

function getRandomOffset(x, z, spacing) {
  return {
    x: x + Math.floor(Math.random() * (spacing / 2)) - (spacing >> 2),
    z: z + Math.floor(Math.random() * (spacing / 2)) - (spacing >> 2),
  };
}

function canPlace(pos, pattern) {
  const width = sizeState.widthLength;
  const height = sizeState.heightLength;

  const pW = pattern[0][0].length;
  const pD = pattern[0].length;

  if (
    pos.x < 0 || pos.z < 0 ||
    pos.x + pW > width ||
    pos.z + pD > height
  ) return false;

  const cx = pos.x + (pW >> 1);
  const cz = pos.z + (pD >> 1);

  return mapState.layerMap[cz]?.[cx] === brushState.selectedLayer;
}

function getSurfaceY(pos) {
  const x = pos.x;
  const z = pos.z;

  const surface = Math.floor(mapState.map[z][x] || 0);

  for (let y = sizeState.maxHeight - 1; y >= 0; y--) {
    if (mapState.blockMap[y][z][x] !== 0) {
      return Math.max(surface, y + 1);
    }
  }

  return surface;
}

function placePattern(pattern, pos, yStart) {
  const pH = pattern.length;
  const pD = pattern[0].length;
  const pW = pattern[0][0].length;

  for (let py = 0; py < pH; py++) {
    for (let pz = 0; pz < pD; pz++) {
      for (let px = 0; px < pW; px++) {

        const id = pattern[py][pz][px];
        if (id === 0) continue;
        
        // pattern[z][y][x]
        const wx = pos.x + px;
        const wy = yStart + pz;
        const wz = nz + py;

        if (
          wx < 0 || wz < 0 ||
          wx >= sizeState.widthLength ||
          wz >= sizeState.heightLength ||
          wy >= sizeState.maxHeight
        ) continue;

        if (mapState.layerMap[wz]?.[wx] !== brushState.selectedLayer) continue;

        mapState.blockMap[wy][wz][wx] = id;
      }
    }
  }
}

function convertChunks() {
  const chunks = [];
  const chunkCountX = sizeState.chunkLenX;
  const chunkCountZ = sizeState.chunkLenZ;
  const maxUsedHeight = getMaxUsedHeight();
  const chunkCountY = Math.ceil(maxUsedHeight / chunkSize);

  for (let cx = 0; cx < chunkCountX; cx++) {
    for (let cz = 0; cz < chunkCountZ; cz++) {
      for (let cy = 0; cy < chunkCountY; cy++) {
        const blocks = [];

        for (let x = 0; x < chunkSize; x++) {
          for (let y = 0; y < chunkSize; y++) { // Yは高さ
            for (let z = 0; z < chunkSize; z++) {
              const wx = cx * chunkSize + x;
              const wz = cz * chunkSize + z;
              const wy = cy * chunkSize + y;
              let id = 0;

              if (wx < sizeState.widthLength && wz < sizeState.heightLength && wy < sizeState.maxHeight) {
                const surfaceBlock = mapState.blockMap[wy]?.[wz]?.[wx];
                if (surfaceBlock && surfaceBlock !== 0) {
                  id = surfaceBlock;
                }
              }

              blocks.push(id);
            }
          }
        }

        chunks.push({ x: cx, y: cy, z: cz, blocks });
      }
    }
  }
  let minCX = Infinity, minCY = Infinity, minCZ = Infinity;
  let maxCX = -Infinity, maxCY = -Infinity, maxCZ = -Infinity;

  for (const c of chunks) {
    if (c.x < minCX) minCX = c.x;
    if (c.y < minCY) minCY = c.y;
    if (c.z < minCZ) minCZ = c.z;
    if (c.x > maxCX) maxCX = c.x;
    if (c.y > maxCY) maxCY = c.y;
    if (c.z > maxCZ) maxCZ = c.z;
  }

  for (const c of chunks) {
    c.x -= minCX;
    c.y -= minCY;
    c.z -= minCZ;
  }

  const sizeX = (maxCX - minCX + 1) * chunkSize;
  const sizeY = (maxCY - minCY + 1) * chunkSize;
  const sizeZ = (maxCZ - minCZ + 1) * chunkSize;

  return {
    name: mapState.fileName || "schem",
    pos: [0, 0, 0],
    size: [sizeX, sizeY, sizeZ],
    chunks
  };
}

function convertTo3D(avroJson) {
	const chunkSize = 32
	const result = {
		name: avroJson.name,
		size: [avroJson.sizeX, avroJson.sizeY, avroJson.sizeZ],
		blocks: [],
	}
	for (const chunk of avroJson.chunks) {
		const decoded = decodeBlocks(chunk)

		let i = 0
		for (let x = 0; x < chunkSize; x++) {
			for (let y = 0; y < chunkSize; y++) {
				for (let z = 0; z < chunkSize; z++) {
					const id = decoded[i++]
					if (id === 0) continue
					const wx = chunk.x * chunkSize + x
					const wy = chunk.y * chunkSize + y
					const wz = chunk.z * chunkSize + z
					result.blocks.push({
						x: wx,
						y: wy,
						z: wz,
						id
					})
				}
			}
		}	
	}
	return result;
}

function getBounds(blocks) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const b of blocks) {
    if (b.id === 0) continue;

    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.z < minZ) minZ = b.z;

    if (b.x > maxX) maxX = b.x;
    if (b.y > maxY) maxY = b.y;
    if (b.z > maxZ) maxZ = b.z;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

async function loadSchemAsWorld(result) {
  const bounds = getBounds(result.blocks);

  const width  = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const depth  = bounds.maxZ - bounds.minZ + 1;

  await resizeMapEmpty(Math.ceil(width / chunkSize), Math.ceil(depth / chunkSize));
  await resizeHeightEmpty(height);

  for (let y = 0; y < sizeState.maxHeight; y++) {
    for (let z = 0; z < sizeState.heightLength; z++) {
      for (let x = 0; x < sizeState.widthLength; x++) {
        mapState.blockMap[y][z][x] = 0;
      }
    }
  }

  applyParsed(result, bounds);
}

function rebuildHeight() {
  for (let z = 0; z < sizeState.heightLength; z++) {
    for (let x = 0; x < sizeState.widthLength; x++) {

      let found = false;

      for (let y = sizeState.maxHeight - 1; y >= 0; y--) {
        if (mapState.blockMap[y][z][x] !== 0) {
          mapState.map[z][x] = y;
          mapState.topBlockMap[z][x] = mapState.blockMap[y][z][x];
          found = true;
          break;
        }
      }

      if (!found) {
        mapState.map[z][x] = 0;
        mapState.topBlockMap[z][x] = null;
      }
    }
  }
}

function applyParsed(result, bounds) {
  for (const b of result.blocks) {
    if (b.id === 0) continue;

    const x = b.x - bounds.minX;
    const y = b.y - bounds.minY;
    const z = b.z - bounds.minZ;

    if (
      x < 0 || z < 0 ||
      x >= sizeState.widthLength ||
      z >= sizeState.heightLength ||
      y >= sizeState.maxHeight
    ) continue;

    mapState.blockMap[y][z][x] = b.id;
  }

  rebuildHeight();
}

const splitBloxdschem = function (json) {
	const schems = [];
	const zySize = Math.ceil(json.sizeY / 32) * Math.ceil(json.sizeZ / 32);
	const sliceSize = Math.floor(200 / zySize);
	let currOffset = 0;
	while (true) {
		const chunksSlice = json.chunks.splice(0, zySize * sliceSize);
		if (!chunksSlice.length) break;

		chunksSlice.map(chunk => chunk.x -= currOffset);

		schems.push({
			name: json.name,
			x: 0,
			y: 0,
			z: 0,
			sizeX: Math.min(json.sizeX, sliceSize * 32),
			sizeY: json.sizeY,
			sizeZ: json.sizeZ,
			chunks: chunksSlice
		})
		currOffset += sliceSize;
	}
	return {
		schems: schems,
		sliceSize: sliceSize
	};
}

function decodeBlocks(avroChunk) {
	let i = 0
	const blocks = []
	function decodeLEB128() {
		let shift = 0
		let value = 0

		while (true) {
			const byte = avroChunk.blocks[i++]
			value |= (byte & 127) << shift
			shift += 7
			if ((byte & 128) === 0) break
		}
		return value
	}
	while (i < avroChunk.blocks.length) {
		const amount = decodeLEB128()
		const id = decodeLEB128()
		for (let j = 0; j < amount; j++) {
			blocks.push(id)
		}
	}

	return blocks
}

async function downloadSchems(result) {
  const zip = new JSZip();

  result.schems.forEach((bin, i) => {
    const fileName = `${mapState.fileName || "schem"}${i}.bloxdschem`;
    zip.file(fileName, bin);
  });
  
  const content = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${mapState.fileName || "data"}.zip`;
  a.click();

  URL.revokeObjectURL(url);
}

export function downloadJSON() {
  const data = {
    version: 1,
    map: mapState.map,
    topBlockMap: mapState.topBlockMap,
    layerMap: mapState.layerMap,
    meta: {
      width: sizeState.widthLength,
      height: sizeState.heightLength,
      maxHeight: sizeState.maxHeight,
      time: Date.now()
    }
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `terrain_${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export function importJSON(file) {
  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data.map || !data.meta) {
        throw new Error("Invalid format");
      }

      const targetChunkX = Math.ceil(data.meta.width / chunkSize);
      const targetChunkZ = Math.ceil(data.meta.height / chunkSize);

      if (
        targetChunkX !== sizeState.chunkLenX ||
        targetChunkZ !== sizeState.chunkLenZ
      ) {
        const ok = confirm("マップサイズが違います。リサイズして読み込みますか？");
        if (!ok) return;

        await resizeMap(targetChunkX, targetChunkZ);
      }

      if (data.meta.maxHeight !== sizeState.maxHeight) {
        await resizeHeight(data.meta.maxHeight);
      }

      mapState.map = data.map;
      mapState.topBlockMap = data.topBlockMap ?? null;
      mapState.layerMap = data.layerMap ?? null;

      for (let y = 0; y < sizeState.heightLength; y++) {
        for (let x = 0; x < sizeState.widthLength; x++) {
          rebuildColumn(x, y, mapState.map[y][x]);
        }
      }

      chunkState.dirtyChunks.clear();
      for (let cy = 0; cy < chunkState.chunkRows; cy++) {
        for (let cx = 0; cx < chunkState.chunkCols; cx++) {
          chunkState.dirtyChunks.add(`${cx},${cy}`);
        }
      }

      console.log("Loaded JSON");

    } catch (e) {
      console.error("Invalid JSON", e);
    }
  };

  reader.readAsText(file);
}

function loadSchem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result;
        const uint8 = new Uint8Array(arrayBuffer);

        const buf = Buffer.from(uint8);
        const result = parse(buf);
        console.log(result);
        
        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;

    reader.readAsArrayBuffer(file);
  });
}

function parse(avroBuffer) {
	const data = schema0.fromBuffer(avroBuffer, undefined, true);
	return convertTo3D(data);
}

function writeBloxdSchem(json) {
	const avroJson = {
		name: json.name,
		x: 0,
		y: 0,
		z: 0,
		sizeX: 0,
		sizeY: 0,
		sizeZ: 0,
		chunks: [],
		filler: 0
	};
	function encodeLEB128(value) {
		const bytes = new Array();
		while ((value & -128) != 0) {
			let schemId = value & 127 | 128;
			bytes.push(schemId);
			value >>>= 7;
		}
		bytes.push(value);
		return bytes;
	}

	[
		avroJson.x,
		avroJson.y,
		avroJson.z
	] = json.pos;

	[
		avroJson.sizeX,
		avroJson.sizeY,
		avroJson.sizeZ,
	] = json.size;

	for (let chunkI = 0; chunkI < json.chunks.length; chunkI++) {
		const chunk = json.chunks[chunkI];
		const avroChunk = {};
		const RLEArray = [];

		let currId = chunk.blocks[0];
		let currAmt = 1;

		for (let i = 1; i <= chunk.blocks.length; i++) {
			const id = chunk.blocks[i];
			if (id === currId) {
				currAmt++;
			} else {
				RLEArray.push(...encodeLEB128(currAmt));
				RLEArray.push(...encodeLEB128(currId));
				currAmt = 1;
				currId = id;
			}
		}

		avroChunk.x = chunk.x;
		avroChunk.y = chunk.y;
		avroChunk.z = chunk.z;

		avroChunk.blocks = new Uint8Array(RLEArray);
		avroJson.chunks.push(avroChunk);
	}

	const {
		schems: splitJsons,
		sliceSize
	} = splitBloxdschem(avroJson);
	const bins = [];
	for (const json of splitJsons) {
		for (const chunk of json.chunks) {
			chunk.blocks = Buffer.from(chunk.blocks);
		}

		bins.push(schema0.toBuffer(json));
	}
	return {
		schems: bins,
		sliceSize: sliceSize * 32
	};
};

export { writeBloxdSchem, loadSchem, convertChunks, downloadSchems, applyParsed, loadSchemAsWorld, };