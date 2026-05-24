import { combine, maleProbability, pInheritSubset } from "./breeding";
import { palByKey } from "./pal-data";
import type { Gender, OwnedPal, Pal } from "./types";
import type { BoardEdge, BoardNode } from "./board-store";

export interface ChildResolution {
  child: Pal | null;
  parentNodeIds: [string, string] | null;
  /** Combined unique parental passives (deduped) sourced from owned + child overrides. */
  passivePool: string[];
  /** Per-passive inheritance probability (0..1). */
  perPassiveProb: { name: string; prob: number }[];
  malePct: number | null;
  /** True when both parents are owned pals with the same explicit sex
   * (Male/Male or Female/Female) — Palworld requires one of each. */
  sameSex: boolean;
}

/**
 * For each child node, walk up the edge graph to find its two parents and
 * resolve the child species + passive distribution.
 *
 * Parents can themselves be child nodes (multi-step breeding). In that case
 * we recursively resolve their species and propagate their passive pool.
 */
export function resolveBoard(
  nodes: BoardNode[],
  edges: BoardEdge[],
  ownedById: Map<string, OwnedPal>,
): Map<string, ChildResolution> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // Edges represent parent -> child. For each child node collect parents.
  const parentsOfNode = new Map<string, string[]>();
  for (const e of edges) {
    const list = parentsOfNode.get(e.target) ?? [];
    list.push(e.source);
    parentsOfNode.set(e.target, list);
  }

  const results = new Map<string, ChildResolution>();
  type ResolveCache = {
    species: Pal | null;
    pool: string[];
    /** The sex of this node when known (only for owned pals). Child nodes
     * are probabilistic — sex is unknowable upstream. */
    sex: Gender | null;
  };
  const memo = new Map<string, ResolveCache>();

  function speciesAndPool(nodeId: string): ResolveCache {
    const cached = memo.get(nodeId);
    if (cached) return cached;
    const node = byId.get(nodeId);
    if (!node) {
      const v: ResolveCache = { species: null, pool: [], sex: null };
      memo.set(nodeId, v);
      return v;
    }
    if (node.type === "owned") {
      const op = ownedById.get(node.ownedPalId);
      const sp = op ? palByKey(op.palKey) ?? null : null;
      const v: ResolveCache = {
        species: sp,
        pool: op?.passives ? [...op.passives] : [],
        sex: op?.gender ?? null,
      };
      memo.set(nodeId, v);
      return v;
    }
    // child node — resolve from parents
    const parents = parentsOfNode.get(nodeId) ?? [];
    if (parents.length < 2) {
      const v: ResolveCache = { species: null, pool: node.passiveOverride ?? [], sex: null };
      memo.set(nodeId, v);
      return v;
    }
    const [a, b] = parents;
    const A = speciesAndPool(a);
    const B = speciesAndPool(b);
    let species: Pal | null = null;
    // Same-sex parents cannot breed; skip species lookup so the child shows
    // as infertile. (Sex is only known for owned-pal parents.)
    const sameSex =
      A.sex && B.sex && A.sex !== "Unknown" && A.sex === B.sex ? true : false;
    if (A.species && B.species && !sameSex) {
      species = combine(A.species.key, B.species.key) ?? null;
    }
    const combinedPool = node.passiveOverride
      ? [...node.passiveOverride]
      : Array.from(new Set([...A.pool, ...B.pool]));
    const v: ResolveCache = { species, pool: combinedPool, sex: null };
    memo.set(nodeId, v);
    return v;
  }

  for (const n of nodes) {
    if (n.type !== "child") continue;
    const parents = parentsOfNode.get(n.id) ?? [];
    const { species, pool } = speciesAndPool(n.id);
    // Compute sameSex directly from the immediate parents of this child.
    let sameSex = false;
    if (parents.length === 2) {
      const pa = byId.get(parents[0]);
      const pb = byId.get(parents[1]);
      const sa = pa?.type === "owned" ? ownedById.get(pa.ownedPalId)?.gender ?? null : null;
      const sb = pb?.type === "owned" ? ownedById.get(pb.ownedPalId)?.gender ?? null : null;
      sameSex = !!(sa && sb && sa !== "Unknown" && sa === sb);
    }
    const probPerOne = pool.length > 0 ? pInheritSubset(pool.length, 1) : 0;
    const perPassiveProb = pool
      .map((name) => ({ name, prob: probPerOne }))
      .sort((a, b) => b.prob - a.prob);
    results.set(n.id, {
      child: species,
      parentNodeIds: parents.length === 2 ? [parents[0], parents[1]] : null,
      passivePool: pool,
      perPassiveProb,
      malePct: species ? maleProbability(species) * 100 : null,
      sameSex,
    });
  }
  return results;
}
