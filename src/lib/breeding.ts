import {
  PALS,
  breedingTable,
  indexOfKey,
  keyOfIndex,
  palByKey,
  META,
} from "./pal-data";
import type { Gender, Pal, PalKey } from "./types";

/** Minimal owned-pal slice the path-finder needs: a species and a sex.
 * Genuine `OwnedPal` records satisfy this. */
export interface OwnedAtom {
  palKey: PalKey;
  gender: Gender;
}

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

/** Other parent species that can pair with `knownParentKey` to produce `childKey`. */
export function partnerParentsFor(knownParentKey: PalKey, childKey: PalKey): Pal[] {
  const known = indexOfKey(knownParentKey);
  const target = indexOfKey(childKey);
  if (known < 0 || target < 0) return [];

  const out = new Map<PalKey, Pal>();
  for (const [k, c] of breedingTable()) {
    if (c !== target) continue;
    const [a, b] = k.split("-").map(Number);
    let partnerIdx: number | null = null;
    if (a === known && b === known) partnerIdx = known;
    else if (a === known) partnerIdx = b;
    else if (b === known) partnerIdx = a;
    if (partnerIdx == null) continue;

    const partner = palByKey(keyOfIndex(partnerIdx));
    if (partner) out.set(partner.key, partner);
  }

  return [...out.values()].sort((a, b) => {
    if (a.dexNo !== b.dexNo) return a.dexNo - b.dexNo;
    return a.key.localeCompare(b.key);
  });
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

/**
 * Probability the child ends up with every passive in `desired` (a chosen
 * target set). Returns 0 if any of them isn't even in the parental pool —
 * pure inheritance can't produce it (a separate random-slot roll could in
 * principle, but that's not something the player can aim for).
 */
export function pInheritSet(parentalPool: string[], desired: string[]): number {
  if (desired.length === 0) return 1;
  const pool = new Set(parentalPool);
  if (!desired.every((d) => pool.has(d))) return 0;
  return pInheritSubset(parentalPool.length, desired.length);
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
 * Enumerate distinct breeding paths from `ownedKeys` to `targetKey`.
 *
 * Strategy:
 *   1. Layered BFS computes the minimum number of breeding steps required
 *      to produce every reachable species (`minSteps`).
 *   2. DFS down from the target: at each species, try every parent pair
 *      whose minSteps are both strictly less than the species', recursing
 *      into each parent's sub-paths and merging them (deduping shared
 *      intermediate steps).
 *
 * Paths are sorted by step count ascending and capped at `maxResults`
 * to keep enumeration cheap for popular targets that have hundreds of
 * parent combinations.
 */
export function allShortestPaths(
  owned: OwnedAtom[] | Set<PalKey>,
  targetKey: PalKey,
  maxDepth = 4,
  maxResults = 30,
  options: { ignoreGender?: boolean } = {},
): PathStep[][] {
  const targetIdx = indexOfKey(targetKey);
  if (targetIdx < 0) return [];

  // Normalise input: a Set<PalKey> means "treat every owned pal as Unknown
  // gender", which preserves backward-compatible behaviour (no constraint).
  const atoms: OwnedAtom[] =
    owned instanceof Set
      ? [...owned].map((k) => ({ palKey: k, gender: "Unknown" }))
      : owned;
  const ignoreGender = !!options.ignoreGender;

  // Even when the user already owns the target, we still want to enumerate
  // breeding routes that produce it (so they can breed more / pass on
  // passives). Pretend they don't own the target for the duration of this
  // search — every *other* owned species remains a valid starting point.
  const effectiveAtoms = atoms.filter((a) => a.palKey !== targetKey);
  const effectiveOwned = new Set<PalKey>(effectiveAtoms.map((a) => a.palKey));

  // Per-species gender atoms — used to check leaf-pair feasibility cheaply.
  const atomsByKey = new Map<PalKey, OwnedAtom[]>();
  for (const a of effectiveAtoms) {
    const list = atomsByKey.get(a.palKey);
    if (list) list.push(a);
    else atomsByKey.set(a.palKey, [a]);
  }

  function leafPairBreedable(aKey: PalKey, bKey: PalKey): boolean {
    if (ignoreGender) return true;
    // If either side is intermediate (produced by an earlier step rather
    // than owned outright), gender is probabilistic in-game; we treat it
    // as flexible and let the user re-roll if needed.
    const aLeaf = effectiveOwned.has(aKey);
    const bLeaf = effectiveOwned.has(bKey);
    if (!aLeaf || !bLeaf) return true;

    const aList = atomsByKey.get(aKey) ?? [];
    const bList = atomsByKey.get(bKey) ?? [];

    if (aKey === bKey) {
      // Same species — need two different owned individuals whose genders
      // can resolve to one male + one female.
      for (let i = 0; i < aList.length; i++) {
        const gi = aList[i].gender;
        for (let j = i + 1; j < aList.length; j++) {
          const gj = aList[j].gender;
          if (pairFeasible(gi, gj)) return true;
        }
      }
      return false;
    }

    for (const a of aList) {
      for (const b of bList) {
        if (pairFeasible(a.gender, b.gender)) return true;
      }
    }
    return false;
  }

  const t = breedingTable();
  const minSteps = new Map<number, number>();
  for (const k of effectiveOwned) {
    const i = indexOfKey(k);
    if (i >= 0) minSteps.set(i, 0);
  }

  // Layered fixed-point: each pass adds species producible at exactly `depth`.
  for (let depth = 1; depth <= maxDepth; depth++) {
    let added = false;
    for (const [pairKey, child] of t) {
      if (minSteps.has(child)) continue;
      const [a, b] = pairKey.split("-").map(Number);
      const da = minSteps.get(a);
      const db = minSteps.get(b);
      if (da != null && db != null && Math.max(da, db) + 1 === depth) {
        // Gate by leaf-pair gender feasibility — skip combos that the user
        // physically cannot breed today.
        const aKey = keyOfIndex(a);
        const bKey = keyOfIndex(b);
        if (!leafPairBreedable(aKey, bKey)) continue;
        minSteps.set(child, depth);
        added = true;
      }
    }
    if (!added) break;
  }

  if (!minSteps.has(targetIdx)) return [];

  // Reverse index: child → list of parent pairs that produce it.
  const parentsByChild = new Map<number, Array<[number, number]>>();
  for (const [pairKey, child] of t) {
    const [a, b] = pairKey.split("-").map(Number);
    const list = parentsByChild.get(child);
    if (list) list.push([a, b]);
    else parentsByChild.set(child, [[a, b]]);
  }

  // Memoise sub-path enumeration. The cache key embeds the depth budget
  // because tighter budgets can yield fewer paths.
  const memo = new Map<string, PathStep[][]>();

  function pathsFor(idx: number, budget: number): PathStep[][] {
    if (effectiveOwned.has(keyOfIndex(idx))) return [[]];
    const d = minSteps.get(idx);
    if (d == null || d > budget) return [];
    const cacheKey = `${idx}:${budget}`;
    const cached = memo.get(cacheKey);
    if (cached) return cached;

    const childPal = palByKey(keyOfIndex(idx));
    if (!childPal) {
      memo.set(cacheKey, []);
      return [];
    }
    const pairs = parentsByChild.get(idx) ?? [];
    const results: PathStep[][] = [];
    outer: for (const [a, b] of pairs) {
      const da = minSteps.get(a);
      const db = minSteps.get(b);
      if (da == null || db == null) continue;
      if (Math.max(da, db) + 1 > budget) continue;
      // Skip pairs blocked by leaf-gender constraints.
      if (!leafPairBreedable(keyOfIndex(a), keyOfIndex(b))) continue;
      const aPaths = pathsFor(a, budget - 1);
      const bPaths = pathsFor(b, budget - 1);
      const pa = palByKey(keyOfIndex(a));
      const pb = palByKey(keyOfIndex(b));
      if (!pa || !pb) continue;
      const lastStep: PathStep = { parents: [pa, pb], child: childPal };
      for (const ap of aPaths) {
        for (const bp of bPaths) {
          const merged = mergeSteps(ap, bp);
          merged.push(lastStep);
          results.push(merged);
          // Hard cap to keep enumeration bounded for fan-out species.
          if (results.length >= maxResults * 4) break outer;
        }
      }
    }
    memo.set(cacheKey, results);
    return results;
  }

  const out = pathsFor(targetIdx, maxDepth);
  // Sort by total step count, then by smaller intermediate-species count.
  out.sort((x, y) => x.length - y.length);
  return dedupePaths(out).slice(0, maxResults);
}

/** Whether the two genders can resolve to one male + one female. Unknown
 * acts as a wildcard since the user hasn't filled the sex in yet. */
function pairFeasible(a: Gender, b: Gender): boolean {
  const aMaleOK = a === "Male" || a === "Unknown";
  const aFemOK = a === "Female" || a === "Unknown";
  const bMaleOK = b === "Male" || b === "Unknown";
  const bFemOK = b === "Female" || b === "Unknown";
  return (aMaleOK && bFemOK) || (aFemOK && bMaleOK);
}

function mergeSteps(a: PathStep[], b: PathStep[]): PathStep[] {
  const seen = new Set<string>();
  const out: PathStep[] = [];
  for (const s of a) {
    const k = stepKey(s);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  for (const s of b) {
    const k = stepKey(s);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

function stepKey(s: PathStep): string {
  const [a, b] = [s.parents[0].key, s.parents[1].key].sort();
  return `${a}+${b}=${s.child.key}`;
}

function dedupePaths(paths: PathStep[][]): PathStep[][] {
  const seen = new Set<string>();
  const out: PathStep[][] = [];
  for (const p of paths) {
    const sig = p
      .map(stepKey)
      .sort()
      .join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(p);
  }
  return out;
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
