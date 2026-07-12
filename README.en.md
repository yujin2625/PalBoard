# PalBoard

[🇰🇷 한국어](README.md) | 🇺🇸 English

🥚 Palworld owned-pal tracker + breeding simulator desktop app

A personal pal-management tool that **runs without installation** on Windows / macOS / Linux. All data stays on your own PC — no internet connection required.

> Built with Next.js + TypeScript + Tailwind + React Flow + Electron.

---

## 📥 Download & run

Grab the file for your OS from the [**Releases page**](https://github.com/yujin2625/PalBoard/releases).

### Windows

Pick whichever you prefer:

| File | Install | Usage |
| --- | --- | --- |
| `PalBoard.Setup.x.y.z.exe` | Install wizard | Creates Start Menu / Desktop shortcuts automatically |
| `PalBoard.x.y.z.exe` (portable) | No install | Double-click to run instantly (fine on a USB stick too) |

> GitHub Release uploads automatically replace spaces in filenames with periods (the raw build output in the `release/` folder keeps the spaces).

### macOS / Linux

| OS | File | Usage |
| --- | --- | --- |
| Linux | `PalBoard-x.y.z.AppImage` | Grant execute permission, then double-click (`chmod +x` once) |
| macOS | `PalBoard-x.y.z.dmg` | Drag & drop into Applications |

> ℹ️ No need to install Node.js or any other dependency. Download → run, that's it.

> ⚠️ This is an unsigned build, so Windows/Mac may show an "unknown publisher" warning on first launch. (Windows: More info → Run anyway / macOS: right-click → Open)

---

## ✨ Features

### 1. Owned pal tracking
- **Grouped per world (server)**, with quick tabs to switch between them
- Register/edit/delete species, nickname, sex, level, passives (up to 4), IVs
- Bulk delete via multi-select
- Search by name/nickname/passive, sort (recently added / name / level)
- JSON export/import for backup and sharing

#### Bulk pal import (no manual entry needed)
- 💾 **From a save file** — for single-player or a server you host, reads the Palworld save (`Level.sav`) and registers **species, sex, level, passives, IVs, and nickname** all at once. Auto-detects saves (Windows), and lets you pick a player when the save has several. *(Desktop app only)*
- 🎮 **From the game (UE4SS mod)** — when you're a **guest on someone else's server**, the save lives on the host and can't be read directly. Installing the mod ([`mod/PalBoardExport`](mod/)) on your own client lets you pull your pals from in-game instead. On servers with mixed players it **auto-filters by your player UID**. See [`mod/README.md`](mod/README.md) for setup and usage.
- 🖼 **From an image** — recognizes icons (species/sex) from a pal-box screenshot

### 2. Breeding simulator
- Pick two parents → instantly computes the **child species**, **sex odds**, and **passive inheritance odds**
- **Reverse lookup**: pick a target pal and see every parent combo that produces it (instant even for thousands of results)

### 3. Path finder
- Computes the **shortest breeding route to a target pal** using only your owned pals (BFS, up to 10 steps)
- Computes and shows the **passive inheritance odds** for every breeding step along the way
- **Pick the passives you actually want** and rank/filter paths by the odds of landing that exact combo (paths that can't produce it are dropped automatically)
- **Require a specific pal** to appear somewhere in the route (required-pal filter)
- **Preview a path as a whiteboard** and add it straight into the whiteboard
- If unreachable → suggests which pal to catch to unlock it
- Even if reachable → suggests which pal to catch to shorten the route

### 4. Breeding-tree whiteboard
- Drag & drop owned pals from the left palette onto the board
- Drag a parent node's connector into empty space to **auto-create and wire up a child node**
- Stack two-parents-to-one-child trees multiple levels deep (3+ steps)
- Adjust how many top passives are shown (1–8)
- Same-sex parent pairs are flagged as **unbreedable**
- Commit a child node **straight to your owned pals**
- Export/import a whole board as JSON (embeds referenced pal data too)
- Alt + click to quickly delete a node or edge

### 5. Genetics info
- Wiki-sourced rules: BP-average formula, same-species-only pals, tower-boss overrides, etc.
- PMF tables for passive / active-skill / IV inheritance
- Shows the current game version and the date the data was fetched

### Other
- **Korean / English toggle** — switch instantly from the top-right button; pal names and passive names follow along
- **⚙ Settings (top right)** — manage your player UID (used to filter imports), full data reset
- Passive badges use the wiki's own style (rank-tiered gradient + icon)

---

## 💾 Data location / backup

All data lives in the **app's in-browser storage (localStorage)** — it never leaves this PC.

To move it to another computer or back it up:
1. **Owned pals page**, top right → `Export` → download a JSON file (includes worlds + pals + boards)
2. On the new PC, run the same app → `Import` → pick the downloaded JSON

To share just a whiteboard, use `Export board` on the whiteboard page.

---

## 🛠 For developers

To build it yourself or modify the code:

```bash
git clone https://github.com/yujin2625/PalBoard.git
cd PalBoard
npm install
```

### Development

```bash
npm run dev              # http://localhost:3000  (browser)
npm run electron:dev     # open as a desktop window to check
```

### Build

```bash
# Static web build (lands in out/)
npm run export

# Desktop app package (lands in release/)
npm run dist:win         # Windows: NSIS installer + portable EXE
npm run dist:linux       # Linux: AppImage
npm run dist:mac         # macOS: .dmg (only works on a Mac machine)
npm run dist             # win + linux together
```

### Refreshing data

When a game patch changes the pal roster or breeding table, re-fetch and rebuild with:

```bash
# Pal metadata + breeding pair mapping + all passive data (palcalc — Korean translations included, updated same-day as patches)
curl -L -o tmp/palcalc-db.json       https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/db.json
curl -L -o tmp/palcalc-breeding.json https://raw.githubusercontent.com/tylercamp/palcalc/master/PalCalc.Model/breeding.json

# The wiki's official Paldeck labels (the wiki lags days-to-weeks behind for new pals — falls back to dexNo when missing)
curl -L -A "PalBoard/1.0" -o tmp/cargo-pal-full.json \
  "https://palworld.wiki.gg/api.php?action=cargoquery&tables=Pal&fields=_pageName=page,palName,paldeckNumber,palSize&limit=500&order_by=paldeckNumber&format=json"

# Build
node scripts/build-data.mjs           # pals.json + breeding.json
node scripts/build-passives.mjs       # passives.json (uses palcalc's own Korean translations)
node scripts/build-passive-codes.mjs  # passive-codes.json (internal code -> name, for save/mod import; also sourced from palcalc)
node scripts/download-icons.mjs       # refreshes public/pals/ icons — wiki first, falls back to the paldb.cc CDN (incremental)
```

### Directory layout

```
src/
  app/                    # Next.js App Router pages (/, /sim, /path, /board, /info)
  components/             # shared UI (PalPicker, PassiveBadge, Settings, ...)
    SaveImport.tsx        # save-file import UI
    board/                # whiteboard node components
  lib/                    # business logic
    breeding.ts           # combine, parentsOf, shortestPath, passive inheritance odds
    pal-data.ts           # pal data loading & indexing
    mod-import.ts         # save/mod -> owned-pal mapping (species/passives/sex/IVs, UID filter)
    electron.ts           # renderer-side Electron bridge types
    settings.ts           # stored settings (player UID)
    board-store.ts        # whiteboard persistence
    board-compute.ts      # board tree -> child resolution
    i18n.tsx              # KO/EN dictionary + toggle
    passives.ts, storage.ts, types.ts
  data/                   # built static data (pals, breeding, passives, passive-codes, meta)
electron/
  main.cjs                # desktop shell (fixed-port static server + BrowserWindow)
  preload.cjs             # renderer <-> main IPC bridge
  save-parse.mjs          # save parsing (main process, Node)
  vendor/                 # save parser — uesave WASM + ooz + gvas-pals (pal-map decoding)
mod/
  PalBoardExport/         # UE4SS pal-export mod (for guest servers)
public/
  pals/                   # 299 pal icons
  passives/               # passive badge assets (wiki mirror)
scripts/                  # data refresh + parse-save.mjs (save-parser CLI test)
```

---

## 📊 Data sources

This app uses the following public sources. Rights to in-game graphical assets (pal icons, etc.) belong to Pocketpair Inc.

| Source | Purpose |
| --- | --- |
| [tylercamp/palcalc](https://github.com/tylercamp/palcalc) | Pal metadata + breeding pair mapping (44,851 entries) + passive data (Korean translations included) |
| [palworld.wiki.gg](https://palworld.wiki.gg) | Genetics rules, Paldeck, pal icons (primary), badge style |
| [paldb.cc](https://paldb.cc) | Pal icons — fallback for new pals not yet on the wiki |
| [iebb/PalworldSaveEditor](https://github.com/iebb/PalworldSaveEditor) | Save parser (uesave WASM + ooz decompression) — MIT |
| [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS) | Runtime the in-game import mod is built on |

The data version and fetch date can be checked in [src/data/meta.json](src/data/meta.json) and on the in-app `Genetics` page.

---

## 📜 License

This project's code is freely available under the MIT license. The external data/assets listed above are each subject to their own license.

Palworld is a registered trademark of Pocketpair Inc. This project is an unofficial fan tool.
