// Node port of iebb/PalworldSaveEditor's oozLoader — Oodle (Kraken)
// decompression for PlM-format saves (newer Palworld versions).
// Reads ooz.wasm from disk instead of fetch().

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OOZ_SAFE_SPACE = 64;

let oozInstance = null;

async function initOoz() {
  if (oozInstance) return oozInstance;

  const wasmBytes = fs.readFileSync(path.join(__dirname, "ooz.wasm"));

  let HEAPU8;
  let memory;

  const importObject = {
    a: {
      // _emscripten_resize_heap
      a: (requestedSize) => {
        const PAGE_SIZE = 65536;
        const maxPages = 2147483648 / PAGE_SIZE;
        requestedSize = requestedSize >>> 0;
        if (requestedSize > maxPages * PAGE_SIZE) return false;
        const oldSize = memory.buffer.byteLength;
        const newPages = Math.min(
          maxPages,
          Math.max(oldSize * 2 / PAGE_SIZE, Math.ceil(requestedSize / PAGE_SIZE)),
        );
        try {
          memory.grow(newPages - memory.buffer.byteLength / PAGE_SIZE);
          HEAPU8 = new Uint8Array(memory.buffer);
          return true;
        } catch {
          return false;
        }
      },
      // _emscripten_memcpy_js
      b: (dest, src, num) => {
        HEAPU8.copyWithin(dest, src, src + num);
      },
    },
  };

  const result = await WebAssembly.instantiate(wasmBytes, importObject);
  const exports = result.instance.exports;

  memory = exports.c;
  HEAPU8 = new Uint8Array(memory.buffer);

  oozInstance = {
    _malloc: exports.e,
    _free: exports.f,
    _Kraken_Decompress: exports.g,
    get HEAPU8() {
      return HEAPU8;
    },
    refreshMemory() {
      HEAPU8 = new Uint8Array(memory.buffer);
    },
  };
  return oozInstance;
}

export async function decompress(data, rawSize) {
  const inst = await initOoz();
  inst.refreshMemory();

  const compressedPtr = inst._malloc(data.byteLength);
  inst.refreshMemory();
  inst.HEAPU8.set(data, compressedPtr);

  const decompressedPtr = inst._malloc(rawSize + OOZ_SAFE_SPACE);
  inst.refreshMemory();
  inst.HEAPU8.set(data, compressedPtr);

  const res = inst._Kraken_Decompress(compressedPtr, data.byteLength, decompressedPtr, rawSize);
  inst._free(compressedPtr);

  if (res < 0) throw new Error("Oodle decompression failed (code " + res + ")");
  if (res !== rawSize) {
    throw new Error("Oodle size mismatch: expected " + rawSize + ", got " + res);
  }

  inst.refreshMemory();
  const out = new Uint8Array(rawSize);
  out.set(inst.HEAPU8.subarray(decompressedPtr, decompressedPtr + rawSize));
  inst._free(decompressedPtr);
  return out;
}
