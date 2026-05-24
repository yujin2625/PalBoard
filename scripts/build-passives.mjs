// Processes tmp/passives.json (palworld.wiki.gg Cargo dump) into a compact list,
// optionally enriched with Korean names scraped from tmp/paldb-passives.html /
// tmp/paldb-passives-en.html (paldb.cc).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const src = path.join(root, "tmp/passives.json");
const outFile = path.join(root, "src/data/passives.json");

const data = JSON.parse(fs.readFileSync(src, "utf8"));
const rows = data.cargoquery ?? [];

function stripWikitext(s) {
  if (!s) return "";
  return s
    .replace(/<span class="link-icon"[^>]*>[\s\S]*?<span class="display-text">\[\[[^|\]]+\|([^\]]+)\]\]<\/span><\/span>/g, "$1")
    .replace(/\[\[File:[^\]]+\]\]/g, "")
    .replace(/<span[^>]*>/g, "")
    .replace(/<\/span>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Build en→ko map from paldb.cc dumps when available.
const enKoMap = new Map();
const enHtmlPath = path.join(root, "tmp/paldb-passives-en.html");
const koHtmlPath = path.join(root, "tmp/paldb-passives.html");
if (fs.existsSync(enHtmlPath) && fs.existsSync(koHtmlPath)) {
  const re = /class="passive-rank-?\d+ ps-2 py-1">([^<]+)<\/div>/g;
  const ens = [];
  const kos = [];
  const enH = fs.readFileSync(enHtmlPath, "utf8");
  const koH = fs.readFileSync(koHtmlPath, "utf8");
  let m;
  while ((m = re.exec(enH)) !== null) ens.push(m[1].trim());
  re.lastIndex = 0;
  while ((m = re.exec(koH)) !== null) kos.push(m[1].trim());
  if (ens.length === kos.length) {
    for (let i = 0; i < ens.length; i++) enKoMap.set(ens[i], kos[i]);
    console.log(`paldb.cc: ${enKoMap.size} en→ko mappings`);
  } else {
    console.warn(`paldb.cc count mismatch: en=${ens.length} ko=${kos.length} — skipping translation merge`);
  }
}

const passives = rows
  .map((r) => {
    const t = r.title;
    const rank = Number(t.rank);
    const name = t.passiveSkillName || t.page;
    return {
      name,
      nameKo: enKoMap.get(name) || name,
      rank: Number.isFinite(rank) ? rank : 0,
      description: stripWikitext(t.description),
    };
  })
  .filter((p) => p.name && p.name !== "Test")
  .sort((a, b) => {
    const ag = a.rank > 0 ? -a.rank : 1000 + a.rank;
    const bg = b.rank > 0 ? -b.rank : 1000 + b.rank;
    if (ag !== bg) return ag - bg;
    return a.name.localeCompare(b.name);
  });

fs.writeFileSync(outFile, JSON.stringify(passives));
const translated = passives.filter((p) => p.nameKo && p.nameKo !== p.name).length;
console.log("passives:", passives.length, "translated:", translated, "size:", (fs.statSync(outFile).size / 1024).toFixed(1), "KB");
console.log("sample:", passives.slice(0, 5).map((p) => `${p.name} → ${p.nameKo}`));
const missing = passives.filter((p) => p.nameKo === p.name);
if (missing.length) console.log("missing translations:", missing.map((p) => p.name));
