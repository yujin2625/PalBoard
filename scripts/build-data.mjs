// Processes palcalc db.json + breeding.json into compact JSON shipped with the app.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const dbPath = path.join(root, "tmp/palcalc-db.json");
const breedingPath = path.join(root, "tmp/palcalc-breeding.json");
const outDir = path.join(root, "src/data");
fs.mkdirSync(outDir, { recursive: true });

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const breeding = JSON.parse(fs.readFileSync(breedingPath, "utf8"));

// Optional wiki cross-reference: tmp/cargo-pal-full.json from palworld.wiki.gg
// Cargo API. Used to merge canonical Paldeck IDs (e.g. "005B" for variants).
const wikiPath = path.join(root, "tmp/cargo-pal-full.json");
const wikiByName = new Map();
if (fs.existsSync(wikiPath)) {
  const wiki = JSON.parse(fs.readFileSync(wikiPath, "utf8"));
  for (const row of wiki.cargoquery ?? []) {
    const t = row.title;
    if (t && t.palName) wikiByName.set(t.palName, t);
  }
}

const palKey = (id) => `${id.PalDexNo}${id.IsVariant ? "B" : "A"}`;

const pals = db.Pals.map((p) => ({
  key: palKey(p.Id),
  dexNo: p.Id.PalDexNo,
  variant: p.Id.IsVariant,
  internal: p.InternalName,
  index: p.InternalIndex,
  name: p.Name,
  nameKo: p.LocalizedNames?.ko ?? p.Name,
  breedingPower: p.BreedingPower,
  rarity: p.Rarity,
  size: p.Size,
  elements: (p.Elements ?? []).map((e) => (typeof e === "string" ? e : e.Name)),
  partnerSkill: p.PartnerSkill?.Name ?? null,
  guaranteedPassives: p.GuaranteedPassivesInternalIds ?? [],
  nocturnal: !!p.Nocturnal,
  hp: p.Hp,
  atk: p.Attack,
  def: p.Defense,
  workSuitability: p.WorkSuitability ?? {},
  genderProb: db.BreedingGenderProbability?.[p.InternalName]?.MALE ?? null,
  paldeckId: wikiByName.get(p.Name)?.paldeckNumber || null,
  palSize: wikiByName.get(p.Name)?.palSize || null,
}));

// Sort: dex asc, base before variant (so palIdx is stable)
pals.sort((a, b) => a.dexNo - b.dexNo || Number(a.variant) - Number(b.variant));

const idxByKey = new Map(pals.map((p, i) => [p.key, i]));

// Compact breeding table: int16 triplets [a, b, c]
// Plus optional gender constraint table for the few entries where parents have fixed gender.
const triples = new Int16Array(breeding.Breeding.length * 3);
const genderEntries = []; // [pairIndex, g1, g2]
breeding.Breeding.forEach((e, i) => {
  const a = idxByKey.get(palKey(e.Parent1ID));
  const b = idxByKey.get(palKey(e.Parent2ID));
  const c = idxByKey.get(palKey(e.ChildID));
  triples[i * 3] = a;
  triples[i * 3 + 1] = b;
  triples[i * 3 + 2] = c;
  if (e.Parent1Gender !== "WILDCARD" || e.Parent2Gender !== "WILDCARD") {
    genderEntries.push([i, e.Parent1Gender, e.Parent2Gender]);
  }
});

// We'll store the breeding table as a base64-encoded Int16Array (little-endian)
const buf = Buffer.from(triples.buffer);
const breedingB64 = buf.toString("base64");

const minSteps = breeding.MinBreedingSteps; // keyed by InternalName

const meta = {
  source: "tylercamp/palcalc (db.json + breeding.json) + palworld.wiki.gg Palpedia cross-ref",
  palcalcDbVersion: db.Version,
  fetchedAt: new Date().toISOString().slice(0, 10),
  palCount: pals.length,
  pairCount: breeding.Breeding.length,
  genderConstrainedPairs: genderEntries.length,
  paldeckMatchedFromWiki: pals.filter((p) => p.paldeckId).length,
  wikiReference: "https://palworld.wiki.gg/wiki/Breeding",
  palpediaReference: "https://palworld.wiki.gg/wiki/Palpedia",
  breedingMechanic: {
    formula:
      "child = pal with BreedingPower closest to floor((p1.BP + p2.BP + 1) / 2). Tiebreaker: lower InternalIndex. Special/Tower-boss/variant pairs override this rule.",
    passives: {
      // X = inherited passives from parents' combined unique pool
      // Y = random new passives added
      slotPmf: [0.4, 0.3, 0.2, 0.1], // P(=1), P(=2), P(=3), P(=4)
      randomPmf: [0.4, 0.3, 0.2, 0.1],
    },
    activeSkill: "50% chance to inherit one move from a parent's full learnset (exclusives blocked).",
    ivs: "Each of HP/ATK/DEF: 30% father / 30% mother / 40% random mutation.",
    wikiVersion: "Mechanic introduced 0.1.2.0; wiki page reflects through 0.3.1.0.",
  },
};

fs.writeFileSync(path.join(outDir, "pals.json"), JSON.stringify(pals));
fs.writeFileSync(
  path.join(outDir, "breeding.json"),
  JSON.stringify({ pairs: breedingB64, genders: genderEntries })
);
fs.writeFileSync(path.join(outDir, "min-steps.json"), JSON.stringify(minSteps));
fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

console.log("pals:", pals.length, "pairs:", breeding.Breeding.length, "genderEntries:", genderEntries.length);
for (const f of ["pals.json", "breeding.json", "min-steps.json", "meta.json"]) {
  const s = fs.statSync(path.join(outDir, f));
  console.log("  ", f, (s.size / 1024).toFixed(1), "KB");
}
