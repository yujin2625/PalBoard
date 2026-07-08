// Palworld save → owned pals, grouped by owner. Runs in the Electron main
// process (Node). Pipeline:
//   .sav bytes → decompress (PlZ zlib / PlM oodle) → WASM GVAS deserialize →
//   locate CharacterSaveParameterMap raw bytes → parseCharacterMap → group.
//
// Output uses the same per-pal shape as the UE4SS mod export, so the renderer
// maps both through src/lib/mod-import.ts identically.

import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCharacterMap, saveParamOf } from "./vendor/gvas-pals.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(__dirname, "vendor");

const MAGIC_PLZ = 0x5a6c50; // "PlZ" zlib
const MAGIC_PLM = 0x4d6c50; // "PlM" oodle

let _wasm = null;
async function getWasm() {
  if (_wasm) return _wasm;
  const mod = await import(pathToFileURL(path.join(VENDOR, "uesave", "uesave_wasm.js")).href);
  mod.initSync(fs.readFileSync(path.join(VENDOR, "uesave", "uesave_wasm_bg.wasm")));
  _wasm = mod;
  return mod;
}

async function decompress(raw) {
  const lenDecompressed = raw.readInt32LE(0);
  const lenCompressed = raw.readInt32LE(4);
  const magic = raw.readInt32LE(8);
  const magicBytes = magic & 0x00ffffff;
  const saveType = (magic >> 24) & 0xff;
  const body = raw.subarray(12, 12 + lenCompressed);

  if (magicBytes === MAGIC_PLM) {
    const { decompress: ooz } = await import(
      pathToFileURL(path.join(VENDOR, "ooz-node.mjs")).href
    );
    return Buffer.from(await ooz(new Uint8Array(body), lenDecompressed));
  }
  if (magicBytes !== MAGIC_PLZ) {
    throw new Error("Not a Palworld save (bad magic).");
  }
  let d = body;
  if (saveType === 0x32) d = zlib.inflateSync(d); // double zlib
  d = zlib.inflateSync(d);
  return d;
}

const TYPE_MAP = new Map([
  [".worldSaveData.CharacterSaveParameterMap.Key", "Struct"],
  [".worldSaveData.FoliageGridSaveDataMap.Key", "Struct"],
  [".worldSaveData.FoliageGridSaveDataMap.ModelMap.InstanceDataMap.Key", "Struct"],
  [".worldSaveData.MapObjectSpawnerInStageSaveData.Key", "Struct"],
  [".worldSaveData.ItemContainerSaveData.Key", "Struct"],
  [".worldSaveData.CharacterContainerSaveData.Key", "Struct"],
]);

function findKeyLike(root, re) {
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== "object" || seen.has(n)) continue;
    seen.add(n);
    if (!Array.isArray(n)) {
      for (const k of Object.keys(n)) if (re.test(k)) return n[k];
    }
    for (const v of Array.isArray(n) ? n : Object.values(n)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

function normGuid(v) {
  return typeof v === "string" ? v.toLowerCase() : null;
}

/** Parse a Level.sav file into pals grouped by owning player. */
export async function parseSave(filePath) {
  const raw = fs.readFileSync(filePath);
  const decompressed = await decompress(raw);
  const wasm = await getWasm();
  const jsonStr = wasm.deserialize(new Uint8Array(decompressed), TYPE_MAP);
  const gvas = JSON.parse(jsonStr);
  const csp = findKeyLike(gvas.root?.properties ?? gvas, /^CharacterSaveParameterMap/i);
  if (!csp || !Array.isArray(csp)) {
    throw new Error("CharacterSaveParameterMap not found in save.");
  }

  const { count, entries } = parseCharacterMap(csp);

  const players = new Map(); // uid -> { uid, name, pals: [] }
  const palsByOwner = new Map(); // ownerUid -> [ModExportPal]
  let skipped = 0;

  const getPlayer = (uid) => {
    if (!players.has(uid)) players.set(uid, { uid, name: null, pals: [] });
    return players.get(uid);
  };

  for (const e of entries) {
    const sp = e.pal ? saveParamOf(e.pal) : null;
    if (!sp) {
      skipped++;
      continue;
    }
    if (sp.IsPlayer) {
      const uid = normGuid(e.key?.PlayerUId);
      if (uid) getPlayer(uid).name = sp.NickName || null;
      continue;
    }
    if (typeof sp.CharacterID !== "string") {
      skipped++;
      continue;
    }
    const pal = {
      characterId: sp.CharacterID,
      gender: sp.Gender,
      level: typeof sp.Level === "number" ? sp.Level : undefined,
      nickname: sp.NickName || undefined,
      passives: Array.isArray(sp.PassiveSkillList) ? sp.PassiveSkillList : [],
      ivHp: sp.Talent_HP,
      ivAtk: sp.Talent_Shot,
      ivDef: sp.Talent_Defense,
    };
    const owner = normGuid(sp.OwnerPlayerUId) ?? "__unowned__";
    if (!palsByOwner.has(owner)) palsByOwner.set(owner, []);
    palsByOwner.get(owner).push(pal);
  }

  // Attach pals to players; unmatched owners become their own group.
  for (const [owner, pals] of palsByOwner) {
    const p = getPlayer(owner);
    p.pals = pals;
  }

  const playerList = [...players.values()]
    .filter((p) => p.pals.length > 0)
    .sort((a, b) => b.pals.length - a.pals.length);

  return {
    version: 1,
    source: "save-file",
    fileName: path.basename(filePath),
    mapCount: count,
    skipped,
    players: playerList.map((p) => ({
      uid: p.uid,
      name: p.name,
      count: p.pals.length,
      pals: p.pals,
    })),
  };
}
