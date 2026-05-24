import {
  PALS,
  breedingTable,
  indexOfKey,
  keyOfIndex,
  palByKey,
  META,
} from "./pal-data";
import type { Pal, PalKey } from "./types";

/** Look up the deterministic offspring of two parent species. */
export function combine(parentA: PalKey, parentB: PalKey): Pal | null {
  const ai = indexOfKey(parentA);
  const bi = indexOfKey(parentB);
  if (ai < 0 || bi < 0) return null;
  const t = breedingTable();
  const k = ai <= bi ? `${ai}-${bi}` : `${bi}-${ai}`;
  const childIdx = t.get(k);
  if (childIdx == null) return null;
  return palByKey(keyOfIndex(childIdx)) ?? null;
}

/** All parent pairs that produce the given child. */
export function parentsOf(childKey: PalKey): Array<[Pal, Pal]> {
  const target = indexOfKey(childKey);
  if (target < 0) return [];
  const t = breedingTable();
  const out: Array<[Pal, Pal]> = [];
  for (const [k, c] of t) {
    if (c !== target) continue;
    const [a, b] = k.split("-").map(Number);
    const pa = palByKey(keyOfIndex(a));
    const pb = palByKey(keyOfIndex(b));
    if (pa && pb) out.push([pa, pb]);
  }
  return out;
}

/** Probability of a male child (0..1). The wiki and palcalc per-species value. */
export function maleProbability(child: Pal): number {
  return child.genderProb ?? 0.5;
}

// --- Passive inheritance probabilities -------------------------------------

const SLOT_PMF = META.breedingMechanic.passives.slotPmf;
const RAND_PMF = META.breedingMechanic.passives.randomPmf;

/**
 * Given the unique parental passive pool size N and a target subset S of those
 * passives, returns P(child ends up with exactly the passives in S among its
 * inherited slots — random additions ignored).
 *
 * Wiki rule: child draws X from {1..4} with given PMF. If X <= N, X random
 * passives are drawn uniformly from the parental pool (without replacement).
 * If X > N, all N are inherited. We compute P(S ⊆ inherited).
 */
export function pInheritSubset(parentalPoolSize: number, subsetSize: number): number {
  if (subsetSize === 0) return 1;
  if (subsetSize > parentalPoolSize) return 0;
  let p = 0;
  for (let x = 1; x <= 4; x++) {
    const pmf = SLOT_PMF[x - 1] ?? 0;
    if (pmf === 0) continue;
    if (x > parentalPoolSize) {
      // All N inherited deterministically — subset always included.
      p += pmf;
    } else {
      // C(N - subset, x - subset) / C(N, x)
      const num = binom(parentalPoolSize - subsetSize, x - subsetSize);
      const den = binom(parentalPoolSize, x);
      if (den > 0) p += pmf * (num / den);
    }
  }
  return p;
}

/** Probability the child inherits a specific named passive given parental pool. */
export function pInheritOne(parentalPool: string[], passive: string): number {
  if (!parentalPool.includes(passive)) return 0;
  return pInheritSubset(parentalPool.length, 1);
}

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1;
  for (let i = 1; i <= k; i++) num = (num * (n - k + i)) / i;
  return num;
}

// --- Shortest breeding path ------------------------------------------------

export interface PathStep {
  parents: [Pal, Pal];
  child: Pal;
}

/**
 * BFS over the breeding graph: given a set of currently-owned species (keys),
 * find the shortest sequence of breedings that produces `target`.
 * Returns null if not reachable within maxDepth.
 */
export function shortestPath(
  ownedKeys: Set<PalKey>,
  targetKey: PalKey,
  maxDepth = 4,
): PathStep[] | null {
  if (ownedKeys.has(targetKey)) return [];
  const t = breedingTable();
  const targetIdx = indexOfKey(targetKey);
  if (targetIdx < 0) return null;

  // Layered BFS on species-set frontier. To keep tractable, we treat each
  // species independently — the "set of producible keys" grows monotonically.
  let producible = new Set<number>(
    [...ownedKeys].map(indexOfKey).filter((i) => i >= 0),
  );
  if (producible.has(targetIdx)) return [];

  // Track who produced each new key (for path reconstruction).
  const parentOf = new Map<number, [number, number]>();

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = new Set<number>(producible);
    for (const [pairKey, child] of t) {
      if (next.has(child)) continue;
      const [a, b] = pairKey.split("-").map(Number);
      if (producible.has(a) && producible.has(b)) {
        next.add(child);
        parentOf.set(child, [a, b]);
        if (child === targetIdx) {
          // Reconstruct.
          return reconstruct(parentOf, child, ownedKeys);
        }
      }
    }
    if (next.size === producible.size) break; // fixed point
    producible = next;
  }
  return null;
}

function reconstruct(
  parentOf: Map<number, [number, number]>,
  goal: number,
  owned: Set<PalKey>,
): PathStep[] {
  const steps: PathStep[] = [];
  const seen = new Set<number>();
  function walk(node: number) {
    if (owned.has(keyOfIndex(node))) return;
    if (seen.has(node)) return;
    seen.add(node);
    const pp = parentOf.get(node);
    if (!pp) return;
    walk(pp[0]);
    walk(pp[1]);
    const pa = palByKey(keyOfIndex(pp[0]));
    const pb = palByKey(keyOfIndex(pp[1]));
    const child = palByKey(keyOfIndex(node));
    if (pa && pb && child) steps.push({ parents: [pa, pb], child });
  }
  walk(goal);
  return steps;
}

/**
 * Suggest pals to acquire that would unlock the target within `maxDepth`.
 * Returns species keys; ranked by how many missing dependencies they cover.
 */
export function suggestAcquisitions(
  ownedKeys: Set<PalKey>,
  targetKey: PalKey,
  maxDepth = 3,
): Pal[] {
  const candidates = new Map<PalKey, number>();
  for (const p of PALS) {
    if (ownedKeys.has(p.key)) continue;
    const augmented = new Set(ownedKeys);
    augmented.add(p.key);
    const path = shortestPath(augmented, targetKey, maxDepth);
    if (path && path.length > 0) {
      candidates.set(p.key, path.length);
    }
  }
  const sorted = [...candidates.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 12)
    .map(([k]) => palByKey(k)!)
    .filter(Boolean);
  return sorted;
}
