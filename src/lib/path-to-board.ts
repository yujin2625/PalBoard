import type { PathStep } from "./breeding";
import { uid, type BoardEdge, type BoardNode } from "./board-store";
import type { OwnedPal, PalKey } from "./types";

export interface PathBoardGraph {
  nodes: BoardNode[];
  edges: BoardEdge[];
  /** Child-node id created for each step, parallel to the input path array. */
  stepNodeIds: string[];
}

/**
 * Turns a single breeding path (as returned by `allShortestPaths`) into the
 * node/edge shape the whiteboard uses. Leaf species (parents not produced by
 * an earlier step in this same path) are backed by the user's actual owned
 * pals, picked by registration order; a species bred with itself (some pals
 * only breed same-species) gets a second distinct owned individual when one
 * exists. Species already produced earlier in the path are wired to that
 * step's child node instead of creating a duplicate.
 */
export function pathToBoardGraph(
  path: PathStep[],
  ownedPals: OwnedPal[],
  origin: { x: number; y: number } = { x: 0, y: 0 },
): PathBoardGraph {
  const nodes: BoardNode[] = [];
  const edges: BoardEdge[] = [];
  const stepNodeIds: string[] = [];

  const ownedBySpecies = new Map<PalKey, OwnedPal[]>();
  for (const op of ownedPals) {
    const list = ownedBySpecies.get(op.palKey);
    if (list) list.push(op);
    else ownedBySpecies.set(op.palKey, [op]);
  }

  const leafPrimaryNode = new Map<PalKey, string>();
  const leafSecondaryNode = new Map<PalKey, string>();
  const producedNode = new Map<PalKey, string>();
  const depthOf = new Map<string, number>();
  const countAtDepth = new Map<number, number>();

  function placeAt(depth: number): { x: number; y: number } {
    const n = countAtDepth.get(depth) ?? 0;
    countAtDepth.set(depth, n + 1);
    return { x: origin.x + depth * 260, y: origin.y + n * 130 };
  }

  function makeOwnedNode(speciesKey: PalKey, opIndex: number): string {
    const list = ownedBySpecies.get(speciesKey) ?? [];
    const op = list[opIndex] ?? list[0];
    const id = uid("n");
    nodes.push({
      id,
      type: "owned",
      ownedPalId: op ? op.id : "",
      position: placeAt(0),
    });
    depthOf.set(id, 0);
    return id;
  }

  function primaryLeaf(speciesKey: PalKey): string {
    let id = leafPrimaryNode.get(speciesKey);
    if (!id) {
      id = makeOwnedNode(speciesKey, 0);
      leafPrimaryNode.set(speciesKey, id);
    }
    return id;
  }
  function secondaryLeaf(speciesKey: PalKey): string {
    let id = leafSecondaryNode.get(speciesKey);
    if (!id) {
      id = makeOwnedNode(speciesKey, 1);
      leafSecondaryNode.set(speciesKey, id);
    }
    return id;
  }

  for (const step of path) {
    const aKey = step.parents[0].key;
    const bKey = step.parents[1].key;
    const aProduced = producedNode.get(aKey);
    const bProduced = producedNode.get(bKey);

    let aNodeId: string;
    let bNodeId: string;
    if (aProduced && bProduced) {
      aNodeId = aProduced;
      bNodeId = bProduced;
    } else if (aProduced && !bProduced) {
      aNodeId = aProduced;
      bNodeId = primaryLeaf(bKey);
    } else if (!aProduced && bProduced) {
      aNodeId = primaryLeaf(aKey);
      bNodeId = bProduced;
    } else if (aKey === bKey) {
      // Same-species leaf pair — needs two distinct owned individuals.
      aNodeId = primaryLeaf(aKey);
      bNodeId = secondaryLeaf(bKey);
    } else {
      aNodeId = primaryLeaf(aKey);
      bNodeId = primaryLeaf(bKey);
    }

    const childDepth = Math.max(depthOf.get(aNodeId) ?? 0, depthOf.get(bNodeId) ?? 0) + 1;
    const childId = uid("c");
    nodes.push({ id: childId, type: "child", position: placeAt(childDepth) });
    depthOf.set(childId, childDepth);

    edges.push({ id: uid("e"), source: aNodeId, target: childId });
    edges.push({ id: uid("e"), source: bNodeId, target: childId });

    producedNode.set(step.child.key, childId);
    stepNodeIds.push(childId);
  }

  return { nodes, edges, stepNodeIds };
}
