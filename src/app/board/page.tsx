"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Connection,
  type NodeTypes,
  type FinalConnectionState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useOwnedPals, useWorlds } from "@/lib/storage";
import {
  exportBoardJson,
  parseBoardJson,
  uid,
  useBoards,
  type BoardEdge,
  type BoardNode,
} from "@/lib/board-store";
import { resolveBoard } from "@/lib/board-compute";
import { Palette } from "@/components/board/Palette";
import { OwnedNode } from "@/components/board/OwnedNode";
import { ChildNode } from "@/components/board/ChildNode";
import { Select } from "@/components/Select";
import { useTextPrompt } from "@/components/TextPromptDialog";
import { useT } from "@/lib/i18n";
import type { OwnedPal } from "@/lib/types";

const nodeTypes: NodeTypes = {
  owned: OwnedNode,
  child: ChildNode,
};

export default function BoardPage() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  );
}

function BoardInner() {
  const t = useT();
  const { worlds, activeId: activeWorldId } = useWorlds();
  const { pals, addPal, bulkAdd } = useOwnedPals();
  const {
    boards,
    active,
    activeId,
    loaded,
    setActiveId,
    createBoard,
    renameBoard,
    deleteBoard,
    updateBoard,
    importBoard,
  } = useBoards();

  const rf = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { ask: askText, dialog: textPromptDialog } = useTextPrompt();

  const ownedById = useMemo(() => {
    const m = new Map<string, OwnedPal>();
    for (const p of pals) m.set(p.id, p);
    return m;
  }, [pals]);

  // Local React Flow state, synced to active board.
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Load only when the user switches boards. Re-running on every `active`
  // reference change would clobber local edits and form a loop with persist.
  const lastLoadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active) return;
    if (lastLoadedIdRef.current === active.id) return;
    lastLoadedIdRef.current = active.id;
    setNodes(boardNodesToRf(active.nodes));
    setEdges(boardEdgesToRf(active.edges));
  }, [activeId, active]);

  // Persist on change (debounced). Keep `updateBoard` in a ref so its
  // identity churn (it depends on `boards`) doesn't retrigger this effect.
  const updateBoardRef = useRef(updateBoard);
  useEffect(() => {
    updateBoardRef.current = updateBoard;
  }, [updateBoard]);

  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!activeId) return;
    if (lastLoadedIdRef.current !== activeId) return; // skip until initial load lands
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const ns: BoardNode[] = nodes.map((n) => {
        if (n.type === "owned") {
          return {
            id: n.id,
            type: "owned",
            ownedPalId: (n.data as { ownedPalId: string }).ownedPalId,
            position: n.position,
          };
        }
        const d = n.data as { passiveOverride?: string[]; committedOwnedPalId?: string };
        return {
          id: n.id,
          type: "child",
          passiveOverride: d.passiveOverride,
          committedOwnedPalId: d.committedOwnedPalId,
          position: n.position,
        };
      });
      const es: BoardEdge[] = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
      updateBoardRef.current(activeId, { nodes: ns, edges: es });
    }, 150);
    return () => {
      if (persistTimer.current != null) window.clearTimeout(persistTimer.current);
    };
  }, [nodes, edges, activeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  );

  // Enforce max-2 incoming edges on child nodes.
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((es) => {
        if (!params.source || !params.target) return es;
        const target = nodes.find((n) => n.id === params.target);
        if (target?.type === "owned") return es;
        const incoming = es.filter((e) => e.target === params.target);
        if (incoming.length >= 2) return es;
        if (params.source === params.target) return es;
        if (es.some((e) => e.source === params.source && e.target === params.target)) return es;
        return addEdge({ ...params, id: uid("e") }, es);
      });
    },
    [nodes],
  );

  // When the user drags a connection into empty space, spawn a new ChildNode
  // at the drop point and wire the source into it. This is the primary way
  // to "breed" two parents in a fluid UX.
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid) return; // a real target was found
      const sourceId = state.fromNode?.id;
      if (!sourceId) return;
      const point =
        "changedTouches" in event
          ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
          : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
      const flow = rf.screenToFlowPosition(point);
      const newChildId = uid("c");
      const newChild: Node = {
        id: newChildId,
        type: "child",
        position: { x: flow.x, y: flow.y - 40 },
        data: { passiveOverride: undefined, committedOwnedPalId: undefined } as Record<string, unknown>,
      };
      setNodes((ns) => [...ns, newChild]);
      setEdges((es) =>
        addEdge({ id: uid("e"), source: sourceId, target: newChildId }, es),
      );
    },
    [rf],
  );

  // Drag-from-palette drop.
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const ownedId = e.dataTransfer.getData("application/x-palboard-owned");
      if (!ownedId) return;
      const op = ownedById.get(ownedId);
      if (!op) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newNode: Node = {
        id: uid("n"),
        type: "owned",
        position: pos,
        data: { ownedPalId: ownedId, ownedPal: op } as Record<string, unknown>,
      };
      setNodes((ns) => [...ns, newNode]);
    },
    [ownedById, rf],
  );

  // Auto-create child node when two parents are connected to a shared sink.
  // The UX is: user drags from one parent to empty space → React Flow doesn't
  // create an edge to nothing. Instead we let users connect into existing
  // child nodes. For the very first child node we provide an explicit button.

  function addChildNode() {
    const view = rf.getViewport();
    const center = rf.screenToFlowPosition({
      x: (wrapRef.current?.clientWidth ?? 800) / 2,
      y: (wrapRef.current?.clientHeight ?? 600) / 2,
    });
    const offset = nodes.filter((n) => n.type === "child").length;
    const newNode: Node = {
      id: uid("c"),
      type: "child",
      position: { x: center.x + offset * 30, y: center.y + offset * 30 },
      data: { passiveOverride: undefined, committedOwnedPalId: undefined } as Record<string, unknown>,
    };
    setNodes((ns) => [...ns, newNode]);
    void view;
  }

  // Export the currently active board to JSON file. The export embeds
  // snapshots of any owned pals the board references so that someone
  // importing it without the same local data still sees populated nodes.
  function handleExportBoard() {
    if (!active) return;
    // Use the latest in-memory board state (nodes/edges from React Flow).
    const liveBoard = {
      ...active,
      nodes: nodes.map((n) => {
        if (n.type === "owned") {
          return {
            id: n.id,
            type: "owned" as const,
            ownedPalId: (n.data as { ownedPalId: string }).ownedPalId,
            position: n.position,
          };
        }
        const d = n.data as { passiveOverride?: string[]; committedOwnedPalId?: string };
        return {
          id: n.id,
          type: "child" as const,
          passiveOverride: d.passiveOverride,
          committedOwnedPalId: d.committedOwnedPalId,
          position: n.position,
        };
      }),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const text = exportBoardJson(liveBoard, ownedById as unknown as Map<string, unknown>);
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safe = active.name.replace(/[^\w\-가-힣]+/g, "_").slice(0, 32) || "board";
    a.download = `palboard-${safe}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImportBoard(file: File) {
    const text = await file.text();
    try {
      const { board, ownedPalSnapshots } = parseBoardJson(text);
      // Inject any referenced owned pals that aren't already present locally
      // so the imported board's nodes resolve to real data.
      const incoming = Object.values(ownedPalSnapshots) as OwnedPal[];
      const added = incoming.length > 0 ? bulkAdd(incoming) : 0;
      importBoard(board);
      alert(t("board.import.success", { p: added }));
    } catch {
      alert(t("board.import.error"));
    }
  }

  // Resolve children every render with current edges/nodes.
  const resolutions = useMemo(() => {
    const bn: BoardNode[] = nodes.map((n) => {
      if (n.type === "owned") {
        return {
          id: n.id,
          type: "owned",
          ownedPalId: (n.data as { ownedPalId: string }).ownedPalId,
          position: n.position,
        };
      }
      const d = n.data as { passiveOverride?: string[]; committedOwnedPalId?: string };
      return {
        id: n.id,
        type: "child",
        passiveOverride: d.passiveOverride,
        committedOwnedPalId: d.committedOwnedPalId,
        position: n.position,
      };
    });
    const be: BoardEdge[] = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    return resolveBoard(bn, be, ownedById);
  }, [nodes, edges, ownedById]);

  const handleCommitChild = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== "child") return;
      const r = resolutions.get(nodeId);
      if (!r || !r.child) return;
      const data = node.data as { committedOwnedPalId?: string };
      if (data.committedOwnedPalId) {
        alert(t("board.commit.alreadyDone"));
        return;
      }
      const worldName = worlds.find((w) => w.id === activeWorldId)?.name ?? "";
      if (!confirm(t("board.commit.confirm", { world: worldName }))) return;
      const passives = r.passivePool.slice(0, 4);
      const op = addPal({
        palKey: r.child.key,
        nickname: undefined,
        gender: "Unknown",
        passives,
        worldId: activeWorldId,
      });
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data as object), committedOwnedPalId: op.id } } : n,
        ),
      );
    },
    [nodes, resolutions, worlds, activeWorldId, addPal, t],
  );

  // Build display nodes with computed data injected.
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === "owned") {
          const op = ownedById.get((n.data as { ownedPalId: string }).ownedPalId);
          return { ...n, data: { ...(n.data as object), ownedPal: op } };
        }
        const r = resolutions.get(n.id) ?? null;
        const d = n.data as { committedOwnedPalId?: string };
        return {
          ...n,
          data: {
            ...n.data,
            resolution: r,
            topN: active?.topN ?? 4,
            committed: !!d.committedOwnedPalId,
            onCommit: r?.child ? () => handleCommitChild(n.id) : undefined,
          },
        };
      }),
    [nodes, ownedById, resolutions, active?.topN, handleCommitChild],
  );

  if (!loaded || !active) {
    return <div className="text-chillet-700/70 dark:text-chillet-200/60">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{t("board.title")}</h1>
          <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">{t("board.subtitle")}</p>
        </div>
      </header>

      {/* Board tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveId(b.id)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
              activeId === b.id
                ? "bg-gradient-to-br from-chillet-500 to-chillet-700 text-white border-transparent shadow-sm shadow-chillet-500/40"
                : "border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          onClick={async () => {
            const name = await askText(t("board.promptNew"));
            if (name) createBoard(name);
          }}
          className="px-2 py-1.5 rounded-md text-sm border border-dashed border-chillet-400/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
        >
          {t("board.new")}
        </button>
        <button
          onClick={async () => {
            const name = await askText(t("board.promptRename"), active.name);
            if (name) renameBoard(active.id, name);
          }}
          className="text-xs text-chillet-700/70 dark:text-chillet-200/60 underline ml-2"
        >
          {t("common.rename")}
        </button>
        <button
          onClick={() => {
            if (boards.length <= 1) return alert(t("board.deleteLast"));
            if (confirm(t("board.confirmDelete"))) deleteBoard(active.id);
          }}
          className="text-xs text-red-600 underline"
        >
          {t("board.delete")}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-chillet-700/70 dark:text-chillet-200/60">{t("board.topN")}</label>
          <Select<number>
            size="sm"
            className="w-20"
            value={active.topN}
            onChange={(n) => updateBoard(active.id, { topN: n })}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }))}
          />
          <button
            onClick={addChildNode}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            + Child
          </button>
          <button
            onClick={() => {
              if (confirm(t("board.clear.confirm"))) {
                setNodes([]);
                setEdges([]);
              }
            }}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            {t("board.clear")}
          </button>
          <button
            onClick={handleExportBoard}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            {t("board.export")}
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            {t("board.import")}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportBoard(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div
        ref={wrapRef}
        className="h-[calc(100vh-220px)] min-h-[480px] flex border border-chillet-200/70 dark:border-chillet-800/60 rounded-2xl overflow-hidden bg-white/50 dark:bg-chillet-950/30"
      >
        <Palette
          pals={pals}
          worlds={worlds}
          worldId={active.paletteWorldId}
          onChangeWorld={(id) => updateBoard(active.id, { paletteWorldId: id })}
        />
        <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: false,
              style: { strokeWidth: 2 },
              interactionWidth: 32,
            }}
            onNodeClick={(e, node) => {
              if (e.altKey) {
                setNodes((ns) => ns.filter((n) => n.id !== node.id));
                setEdges((es) => es.filter((ed) => ed.source !== node.id && ed.target !== node.id));
              }
            }}
            onEdgeClick={(e, edge) => {
              if (e.altKey) setEdges((es) => es.filter((ed) => ed.id !== edge.id));
            }}
          >
            <Background gap={20} color="#cfe3f3" />
            <Controls className="!shadow-md" />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(45, 144, 201, 0.1)"
              nodeColor={(n) => (n.type === "child" ? "#2dc4be" : "#2d90c9")}
            />
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-sm text-chillet-700/60 dark:text-chillet-200/50">
                {t("board.empty")}
              </div>
            </div>
          )}
        </div>
      </div>
      {textPromptDialog}
    </div>
  );
}

function boardNodesToRf(ns: BoardNode[]): Node[] {
  return ns.map((n) => {
    if (n.type === "owned") {
      return {
        id: n.id,
        type: "owned",
        position: n.position,
        data: { ownedPalId: n.ownedPalId } as Record<string, unknown>,
      };
    }
    return {
      id: n.id,
      type: "child",
      position: n.position,
      data: {
        passiveOverride: n.passiveOverride,
        committedOwnedPalId: n.committedOwnedPalId,
      } as Record<string, unknown>,
    };
  });
}

function boardEdgesToRf(es: BoardEdge[]): Edge[] {
  return es.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}
