// Downloads pal icon PNGs from palworld.wiki.gg into public/pals/.
// File naming on the wiki is `<English name with spaces → underscores>_icon.png`.
// The wiki lags behind new game updates (no page for freshly-added pals yet),
// so we fall back to paldb.cc's CDN, keyed by the palcalc InternalName:
// https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_<internal>_icon_normal.webp
// Those come back as WebP and are converted to PNG (via sharp) to match the
// existing file naming/extension. Pals missing from both sources are recorded
// in the manifest.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const pals = JSON.parse(fs.readFileSync(path.join(root, "src/data/pals.json"), "utf8"));
const outDir = path.join(root, "public/pals");
fs.mkdirSync(outDir, { recursive: true });

const slug = (name) => name.replace(/ /g, "_");

const missing = [];
const ok = [];

async function fetchWiki(p) {
  const url = `https://palworld.wiki.gg/images/${slug(p.name)}_icon.png`;
  let attempt = 0;
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
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, buf: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return { ok: false, status: "exhausted" };
}

async function fetchPaldb(p) {
  const url = `https://cdn.paldb.cc/image/Pal/Texture/PalIcon/Normal/T_${p.internal}_icon_normal.webp`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { ok: false, status: res.status };
    const webp = Buffer.from(await res.arrayBuffer());
    const png = await sharp(webp).png().toBuffer();
    return { ok: true, buf: png };
  } catch (e) {
    return { ok: false, status: e.message };
  }
}

let i = 0;
for (const p of pals) {
  i++;
  const dest = path.join(outDir, `${slug(p.name)}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    ok.push(p.name);
    continue;
  }
  process.stdout.write(`[${i}/${pals.length}] ${p.name} … `);

  let result = await fetchWiki(p);
  let source = "wiki";
  if (!result.ok) {
    result = await fetchPaldb(p);
    source = "paldb";
  }

  if (result.ok) {
    fs.writeFileSync(dest, result.buf);
    console.log(`ok (${source}) ${(result.buf.length / 1024).toFixed(0)} KB`);
    ok.push(p.name);
  } else {
    console.log(`MISS ${result.status}`);
    missing.push({ name: p.name, status: result.status });
  }
  await new Promise((r) => setTimeout(r, 400));
}

fs.writeFileSync(
  path.join(outDir, "_manifest.json"),
  JSON.stringify({ ok, missing, fetchedAt: new Date().toISOString() }, null, 2),
);
console.log(`\nDone. ok=${ok.length} missing=${missing.length}`);
if (missing.length) console.log("Missing:", missing.slice(0, 20));
