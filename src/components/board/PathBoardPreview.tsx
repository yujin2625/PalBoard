"use client";

import { useMemo } from "react";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { resolveBoard } from "@/lib/board-compute";
import type { BoardEdge, BoardNode } from "@/lib/board-store";
import type { OwnedPal } from "@/lib/types";
import { OwnedNode } from "./OwnedNode";
import { ChildNode } from "./ChildNode";

const nodeTypes: NodeTypes = { owned: OwnedNode, child: ChildNode };

interface Props {
  nodes: BoardNode[];
  edges: BoardEdge[];
  ownedById: Map<string, OwnedPal>;
  topN?: number;
}

/** Read-only miniature whiteboard render for a single breeding path — reuses
 * the real board node components so the preview looks identical to the
 * actual whiteboard. */
export function PathBoardPreview({ nodes, edges, ownedById, topN = 4 }: Props) {
  const resolutions = useMemo(
    () => resolveBoard(nodes, edges, ownedById),
    [nodes, edges, ownedById],
  );

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === "owned") {
          return {
            id: n.id,
            type: "owned",
            position: n.position,
            data: { ownedPal: ownedById.get(n.ownedPalId) ?? null },
            draggable: false,
          };
        }
        const r = resolutions.get(n.id) ?? null;
        return {
          id: n.id,
          type: "child",
          position: n.position,
          data: { resolution: r, topN, committed: false, onCommit: undefined },
          draggable: false,
        };
      }),
    [nodes, resolutions, ownedById, topN],
  );
  const rfEdges: Edge[] = useMemo(
    () => edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    [edges],
  );

  return (
    <div className="h-72 rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 overflow-hidden bg-white/50 dark:bg-chillet-950/30">
      <ReactFlowProvider>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#cfe3f3" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
