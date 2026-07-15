import palsJson from "@/data/pals.json";
import breedingJson from "@/data/breeding.json";
import metaJson from "@/data/meta.json";
import type { BreedingMeta, Pal, PalKey } from "./types";
import { assetPath } from "./assets";

export const PALS: readonly Pal[] = palsJson as Pal[];
export const META: BreedingMeta = metaJson as BreedingMeta;

const PAL_BY_KEY = new Map<PalKey, Pal>(PALS.map((p) => [p.key, p]));
const PAL_BY_INTERNAL = new Map<string, Pal>(PALS.map((p) => [p.internal, p]));
const KEY_BY_INDEX: PalKey[] = PALS.map((p) => p.key);
const INDEX_BY_KEY = new Map<PalKey, number>(PALS.map((p, i) => [p.key, i]));

export function palByKey(key: PalKey): Pal | undefined {
  return PAL_BY_KEY.get(key);
}
export function palByInternal(name: string): Pal | undefined {
  return PAL_BY_INTERNAL.get(name);
}

/** Local icon path served from /public/pals/. */
export function palIconUrl(pal: Pal): string {
  return assetPath(`/pals/${pal.name.replace(/ /g, "_")}.png`);
}

/** "#005B" if the wiki has a Paldeck ID, otherwise "#13" using palcalc dexNo. */
export function palDexLabel(pal: Pal): string {
  return pal.paldeckId ? `#${pal.paldeckId}` : `#${pal.dexNo}`;
}

/** palworld.wiki.gg page for the pal — shown as the "팰 정보" link. */
export function palWikiUrl(pal: Pal): string {
  return `https://palworld.wiki.gg/wiki/${encodeURIComponent(pal.name.replace(/ /g, "_"))}`;
}

/**
 * Decode the compact breeding pair table. Returns a Map<pairKey, childIndex>
 * where pairKey = `${min(a,b)}-${max(a,b)}` (gender-agnostic).
 */
let _table: Map<string, number> | null = null;

export function breedingTable(): Map<string, number> {
  if (_table) return _table;
  const raw = breedingJson as { pairs: string; genders: [number, string, string][] };
  // Decode base64 → Int16Array
  const binary = atob(raw.pairs);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const arr = new Int16Array(bytes.buffer);
  const t = new Map<string, number>();
  for (let i = 0; i < arr.length; i += 3) {
    const a = arr[i];
    const b = arr[i + 1];
    const c = arr[i + 2];
    const key = pairKeyIdx(a, b);
    // First write wins for duplicates (mostly gender variants); good enough for MVP.
    if (!t.has(key)) t.set(key, c);
  }
  _table = t;
  return t;
}

export function pairKeyIdx(a: number, b: number): string {
  return a <= b ? `${a}-${b}` : `${b}-${a}`;
}

export function indexOfKey(k: PalKey): number {
  return INDEX_BY_KEY.get(k) ?? -1;
}
export function keyOfIndex(i: number): PalKey {
  return KEY_BY_INDEX[i];
}
