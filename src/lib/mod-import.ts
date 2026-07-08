import passiveCodes from "@/data/passive-codes.json";
import { PALS, palByInternal } from "./pal-data";
import type { Gender, OwnedPal } from "./types";

/**
 * Ingestion for the PalBoard UE4SS companion mod (`mod/PalBoardExport`).
 *
 * The mod runs inside the player's game client and dumps their party + palbox
 * to a JSON file using the game's *internal* codenames (CharacterID, passive
 * codes). It stays deliberately dumb — all human-readable mapping happens here
 * so the mod itself needs no data tables and survives game patches better.
 *
 * This works even when the player is a guest on someone else's server, because
 * their own pals are replicated to their client for the palbox UI to render.
 */

/** Internal passive code (e.g. "CraftSpeed_up3") → English display name
 * (e.g. "Remarkable Craftsmanship"), which matches passives.json `name`. */
const PASSIVE_CODE_TO_NAME = passiveCodes as Record<string, string>;

/** CharacterID prefixes for field/boss/quest variants. The suffix is the same
 * species for breeding purposes, so we strip these and match the base pal.
 * Order matters: longer/more-specific prefixes first. */
const VARIANT_PREFIXES = [
  /^Quest_[A-Za-z0-9]+_/,
  /^BOSS_/,
  /^PREDATOR_/,
  /^RAID_/,
  /^GYM_/,
  /^SUMMON_/,
];

/** One pal as emitted by the mod (all fields optional except characterId). */
export interface ModExportPal {
  characterId: string;
  gender?: string;
  level?: number;
  nickname?: string;
  passives?: string[];
  ivHp?: number;
  ivAtk?: number;
  /** Accepted as an alias for ivAtk (the save calls attack talent "Shot"). */
  ivShot?: number;
  ivDef?: number;
  /** Owner's PlayerUId (hex) — present in save/mod exports; used to keep only
   * your own pals when a save/world contains several players. */
  ownerUid?: string;
}

export interface ModExport {
  version?: number;
  source?: string;
  player?: string;
  world?: string;
  exportedAt?: string;
  pals?: ModExportPal[];
}

export interface ModImportResult {
  pals: Omit<OwnedPal, "id" | "createdAt">[];
  stats: {
    total: number;
    matched: number;
    /** CharacterIDs that could not be resolved to a known pal. */
    unmatchedSpecies: string[];
    /** Passive codes that had no display-name mapping (kept as raw code). */
    unmatchedPassives: string[];
  };
  player?: string;
  world?: string;
}

function normalizeGender(raw: string | undefined): Gender {
  if (!raw) return "Unknown";
  const g = raw.replace(/^EPalGenderType::/, "").toLowerCase();
  if (g.startsWith("male")) return "Male";
  if (g.startsWith("female")) return "Female";
  return "Unknown";
}

// Case-insensitive internal-name index. The save/mod can emit casing that
// differs from our data (e.g. "Sheepball" in a save vs "SheepBall" in pals.json).
const PAL_BY_INTERNAL_LC = new Map<string, string>(
  PALS.map((p) => [p.internal.toLowerCase(), p.key]),
);

function lookupInternal(name: string): string | null {
  return palByInternal(name)?.key ?? PAL_BY_INTERNAL_LC.get(name.toLowerCase()) ?? null;
}

/** Resolve a raw CharacterID to a PalBoard palKey, stripping boss/field
 * variant prefixes if a direct match fails. Returns null if unknown. */
function resolveSpecies(characterId: string): string | null {
  const direct = lookupInternal(characterId);
  if (direct) return direct;
  for (const prefix of VARIANT_PREFIXES) {
    if (prefix.test(characterId)) {
      const key = lookupInternal(characterId.replace(prefix, ""));
      if (key) return key;
    }
  }
  return null;
}

/** Clamp an IV/talent value to the 0..100 range, or undefined if absent. */
function iv(v: number | undefined): number | undefined {
  if (typeof v !== "number" || Number.isNaN(v)) return undefined;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Normalize a PlayerUId to lowercase hex (drops dashes/spaces) for comparison. */
export function normalizeUid(uid: string | undefined | null): string {
  return (uid ?? "").toLowerCase().replace(/[^0-9a-f]/g, "");
}

/** True if any pal in the list carries owner info (i.e. filtering is possible). */
export function hasOwnerData(rawPals: ModExportPal[]): boolean {
  return rawPals.some((p) => p && typeof p.ownerUid === "string" && p.ownerUid.length > 0);
}

/** Distinct owner UIDs present, with a pal count each (for a "pick your UID" preview). */
export function ownerCounts(rawPals: ModExportPal[]): { uid: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of rawPals) {
    const u = normalizeUid(p?.ownerUid);
    if (u) m.set(u, (m.get(u) ?? 0) + 1);
  }
  return [...m.entries()].map(([uid, count]) => ({ uid, count })).sort((a, b) => b.count - a.count);
}

/**
 * Map an array of raw pal records (from the mod export OR the save-file parser,
 * which share this shape) into fresh OwnedPal payloads for `worldId`.
 * Unknown species are skipped and reported rather than aborting.
 * When `filterUid` is given, only pals owned by that PlayerUId are kept.
 */
export function mapRawPals(
  rawPals: ModExportPal[],
  worldId: string,
  filterUid?: string,
): { pals: Omit<OwnedPal, "id" | "createdAt">[]; stats: ModImportResult["stats"] } {
  const out: Omit<OwnedPal, "id" | "createdAt">[] = [];
  const unmatchedSpecies = new Set<string>();
  const unmatchedPassives = new Set<string>();
  const want = filterUid ? normalizeUid(filterUid) : null;
  let considered = 0;

  for (const raw of rawPals) {
    if (!raw || typeof raw.characterId !== "string") continue;
    if (want && normalizeUid(raw.ownerUid) !== want) continue;
    considered++;
    const palKey = resolveSpecies(raw.characterId);
    if (!palKey) {
      unmatchedSpecies.add(raw.characterId);
      continue;
    }

    const passives = (raw.passives ?? [])
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .map((code) => {
        const name = PASSIVE_CODE_TO_NAME[code];
        if (!name) {
          unmatchedPassives.add(code);
          return code; // keep raw so it's still visible, just without a badge
        }
        return name;
      });

    out.push({
      palKey,
      gender: normalizeGender(raw.gender),
      level: typeof raw.level === "number" ? raw.level : undefined,
      nickname: raw.nickname || undefined,
      passives,
      ivHp: iv(raw.ivHp),
      ivAtk: iv(raw.ivAtk ?? raw.ivShot),
      ivDef: iv(raw.ivDef),
      worldId,
    });
  }

  return {
    pals: out,
    stats: {
      total: considered,
      matched: out.length,
      unmatchedSpecies: [...unmatchedSpecies],
      unmatchedPassives: [...unmatchedPassives],
    },
  };
}

/**
 * Parse a mod-export JSON string into fresh OwnedPal payloads for `worldId`.
 * Throws on structurally invalid input.
 */
export function parseModExport(json: string, worldId: string): ModImportResult {
  const parsed = JSON.parse(json) as ModExport;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.pals)) {
    throw new Error("Not a PalBoard mod export (missing pals array).");
  }
  const { pals, stats } = mapRawPals(parsed.pals, worldId);
  return { pals, stats, player: parsed.player, world: parsed.world };
}
