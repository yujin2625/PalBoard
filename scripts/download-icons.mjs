// Downloads pal icon PNGs from palworld.wiki.gg into public/pals/.
// File naming on the wiki is `<English name with spaces → underscores>_icon.png`.
// Some pals (esp. variants) may not exist — we record missing ones in a manifest.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const pals = JSON.parse(fs.readFileSync(path.join(root, "src/data/pals.json"), "utf8"));
const outDir = path.join(root, "public/pals");
fs.mkdirSync(outDir, { recursive: true });

const slug = (name) => name.replace(/ /g, "_");

const missing = [];
const ok = [];

let i = 0;
for (const p of pals) {
  i++;
  const dest = path.join(outDir, `${slug(p.name)}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    ok.push(p.name);
    continue;
  }
  const url = `https://palworld.wiki.gg/images/${slug(p.name)}_icon.png`;
  process.stdout.write(`[${i}/${pals.length}] ${p.name} … `);
  let attempt = 0;
  let success = false;
  while (attempt < 5) {
    attempt++;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "PalBoardIconFetcher/1.0 (https://github.com/local; for personal use)",
          "Accept": "image/png,image/*;q=0.9,*/*;q=0.5",
        },
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) || 5;
        process.stdout.write(`429 retry in ${retryAfter}s … `);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      if (!res.ok) {
        console.log(`MISS ${res.status}`);
        missing.push({ name: p.name, status: res.status });
        break;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`ok ${(buf.length / 1024).toFixed(0)} KB`);
      ok.push(p.name);
      success = true;
      break;
    } catch (e) {
      console.log("ERR", e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!success && attempt >= 5) {
    missing.push({ name: p.name, status: "exhausted" });
  }
  await new Promise((r) => setTimeout(r, 400));
}

fs.writeFileSync(
  path.join(outDir, "_manifest.json"),
  JSON.stringify({ ok, missing, fetchedAt: new Date().toISOString() }, null, 2),
);
console.log(`\nDone. ok=${ok.length} missing=${missing.length}`);
if (missing.length) console.log("Missing:", missing.slice(0, 20));
