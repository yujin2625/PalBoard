// Processes tmp/passives.json (palworld.wiki.gg Cargo dump) into a compact list.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const src = path.join(root, "tmp/passives.json");
const outFile = path.join(root, "src/data/passives.json");

const data = JSON.parse(fs.readFileSync(src, "utf8"));
const rows = data.cargoquery ?? [];

function stripWikitext(s) {
  if (!s) return "";
  // Strip <span class="link-icon"…> wrappers and File:… image markup
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

const passives = rows
  .map((r) => {
    const t = r.title;
    const rank = Number(t.rank);
    return {
      name: t.passiveSkillName || t.page,
      rank: Number.isFinite(rank) ? rank : 0,
      description: stripWikitext(t.description),
    };
  })
  .filter((p) => p.name)
  // Sort: positive ranks first (best → worst), then negatives (least bad → worst)
  .sort((a, b) => {
    const ag = a.rank > 0 ? -a.rank : 1000 + a.rank; // positives sort by descending rank, negatives last by descending (closer to 0 first)
    const bg = b.rank > 0 ? -b.rank : 1000 + b.rank;
    if (ag !== bg) return ag - bg;
    return a.name.localeCompare(b.name);
  });

fs.writeFileSync(outFile, JSON.stringify(passives));
console.log("passives:", passives.length, "size:", (fs.statSync(outFile).size / 1024).toFixed(1), "KB");
console.log("sample:", passives.slice(0, 3));
