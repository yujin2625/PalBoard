// Standalone Palworld save parser test harness.
//   node scripts/parse-save.mjs <path-to-Level.sav> [--dump]
//
// Decompress (PlZ zlib / PlM oodle) -> WASM GVAS deserialize -> locate pals.
// With --dump it prints the raw JSON of the first pal node so we can see the
// exact shape and refine extraction.

import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(__dirname, "..", "electron", "vendor");

const MAGIC_PLZ = 0x5a6c50; // "PlZ"
const MAGIC_PLM = 0x4d6c50; // "PlM"

const savePath = process.argv[2];
const DUMP = process.argv.includes("--dump");
if (!savePath) {
  console.error("usage: node scripts/parse-save.mjs <Level.sav> [--dump]");
  process.exit(1);
}

const raw = fs.readFileSync(savePath);
const lenDecompressed = raw.readInt32LE(0);
const lenCompressed = raw.readInt32LE(4);
const magic = raw.readInt32LE(8);
const magicBytes = magic & 0x00ffffff;
const saveType = (magic >> 24) & 0xff;
const body = raw.subarray(12, 12 + lenCompressed);

console.log(
  `header: decompressed=${lenDecompressed} compressed=${lenCompressed} ` +
    `magic=${magicBytes === MAGIC_PLZ ? "PlZ" : magicBytes === MAGIC_PLM ? "PlM" : "?"} ` +
    `type=0x${saveType.toString(16)}`,
);

let decompressed;
if (magicBytes === MAGIC_PLM) {
  const { decompress } = await import(pathToFileURL(path.join(VENDOR, "ooz-node.mjs")).href);
  decompressed = await decompress(new Uint8Array(body), lenDecompressed);
} else {
  let d = body;
  if (saveType === 0x32) d = zlib.inflateSync(d); // double zlib
  d = zlib.inflateSync(d);
  decompressed = d;
}
console.log(`decompressed ok: ${decompressed.length} bytes`);

const { initSync, deserialize } = await import(
  pathToFileURL(path.join(VENDOR, "uesave", "uesave_wasm.js")).href
);
initSync(fs.readFileSync(path.join(VENDOR, "uesave", "uesave_wasm_bg.wasm")));

const typeMap = new Map([
  [".worldSaveData.CharacterSaveParameterMap.Key", "Struct"],
  [".worldSaveData.FoliageGridSaveDataMap.Key", "Struct"],
  [".worldSaveData.FoliageGridSaveDataMap.ModelMap.InstanceDataMap.Key", "Struct"],
  [".worldSaveData.MapObjectSpawnerInStageSaveData.Key", "Struct"],
  [".worldSaveData.ItemContainerSaveData.Key", "Struct"],
  [".worldSaveData.CharacterContainerSaveData.Key", "Struct"],
]);

console.time("deserialize");
const jsonStr = deserialize(new Uint8Array(decompressed), typeMap);
console.timeEnd("deserialize");
console.log(`json length: ${jsonStr.length}`);

const gvas = JSON.parse(jsonStr);

// Recursively find nodes whose keys include something matching /CharacterID/i.
function findPalNodes(root, limit = Infinity) {
  const hits = [];
  const seen = new Set();
  const stack = [root];
  while (stack.length && hits.length < limit) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);
    if (!Array.isArray(node)) {
      const keys = Object.keys(node);
      if (keys.some((k) => /^CharacterID$/i.test(k))) hits.push(node);
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return hits;
}

// Report top-level shape.
console.log("\ntop-level keys:", Object.keys(gvas));
if (gvas.root) console.log("root keys:", Object.keys(gvas.root));

const pals = findPalNodes(gvas);
console.log(`\nnodes containing a CharacterID key: ${pals.length}`);

if (DUMP && pals.length) {
  console.log("\n===== FIRST PAL NODE (raw) =====");
  console.log(JSON.stringify(pals[0], null, 2).slice(0, 4000));
  if (pals.length > 1) {
    console.log("\n===== SECOND PAL NODE (raw) =====");
    console.log(JSON.stringify(pals[1], null, 2).slice(0, 4000));
  }
}
