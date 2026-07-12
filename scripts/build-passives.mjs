// Processes tmp/palcalc-db.json's PassiveSkills into a compact list.
// palcalc bundles every language's official in-game text (including Korean)
// per skill, so this no longer needs a separate wiki/paldb.cc scrape — and
// stays in sync with new-patch passives as soon as palcalc's DB does.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const dbPath = path.join(root, "tmp/palcalc-db.json");
const outFile = path.join(root, "src/data/passives.json");

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const passives = db.PassiveSkills
  .filter((p) => p.IsStandardPassiveSkill && p.Name)
  .map((p) => ({
    name: p.Name,
    nameKo: p.LocalizedNames?.ko || p.Name,
    rank: p.Rank ?? 0,
    description: (p.Description || "").replace(/\r?\n/g, " · ").trim(),
  }))
  .sort((a, b) => {
    const ag = a.rank > 0 ? -a.rank : 1000 + a.rank;
    const bg = b.rank > 0 ? -b.rank : 1000 + b.rank;
    if (ag !== bg) return ag - bg;
    return a.name.localeCompare(b.name);
  });

fs.writeFileSync(outFile, JSON.stringify(passives));
const translated = passives.filter((p) => p.nameKo && p.nameKo !== p.name).length;
console.log("passives:", passives.length, "translated:", translated, "size:", (fs.statSync(outFile).size / 1024).toFixed(1), "KB");
const missing = passives.filter((p) => p.nameKo === p.name);
if (missing.length) console.log("missing translations:", missing.map((p) => p.name));
