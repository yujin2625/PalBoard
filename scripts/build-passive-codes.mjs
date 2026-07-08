// Regenerates src/data/passive-codes.json — a map from Palworld's internal
// passive codes (e.g. "CraftSpeed_up3") to the English display name
// (e.g. "Remarkable Craftsmanship"), which matches passives.json `name`.
//
// The PalBoard companion mod dumps raw internal passive codes; this table is
// how the app turns them into the human names it stores on owned pals.
//
// Source: KrisCris/Palworld-Pal-Editor (assets/data/pal_passives.json), whose
// English names are cross-checked to be a 1:1 match with our passives.json.
//
// Usage:
//   curl -L -o tmp/kriscris-passives.json \
//     "https://raw.githubusercontent.com/KrisCris/Palworld-Pal-Editor/develop/src/palworld_pal_editor/assets/data/pal_passives.json"
//   node scripts/build-passive-codes.mjs

import { readFileSync, writeFileSync } from "node:fs";

const SRC = "tmp/kriscris-passives.json";
const OUT = "src/data/passive-codes.json";

const kc = JSON.parse(readFileSync(SRC, "utf8"));
const map = {};
for (const code of Object.keys(kc).sort()) {
  const en = kc[code]?.I18n?.en?.Name;
  if (en) map[code] = en;
}
writeFileSync(OUT, JSON.stringify(map) + "\n");
console.log(`Wrote ${OUT} with ${Object.keys(map).length} passive codes.`);
