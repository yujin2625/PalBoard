// Regenerates src/data/passive-codes.json — a map from Palworld's internal
// passive codes (e.g. "CraftSpeed_up3") to the English display name
// (e.g. "Remarkable Craftsmanship"), which matches passives.json `name`.
//
// The PalBoard companion mod dumps raw internal passive codes; this table is
// how the app turns them into the human names it stores on owned pals.
//
// Source: tmp/palcalc-db.json's PassiveSkills (InternalName -> Name), the
// same file build-passives.mjs reads — so the two never drift out of sync,
// and both stay current as soon as palcalc's DB picks up a new patch.

import { readFileSync, writeFileSync } from "node:fs";

const SRC = "tmp/palcalc-db.json";
const OUT = "src/data/passive-codes.json";

const db = JSON.parse(readFileSync(SRC, "utf8"));
const map = {};
for (const p of db.PassiveSkills) {
  if (!p.IsStandardPassiveSkill || !p.InternalName || !p.Name) continue;
  map[p.InternalName] = p.Name;
}
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
writeFileSync(OUT, JSON.stringify(sorted) + "\n");
console.log(`Wrote ${OUT} with ${Object.keys(sorted).length} passive codes.`);
