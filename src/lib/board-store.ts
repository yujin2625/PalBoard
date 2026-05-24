"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type BoardNodeKind = "owned" | "child";

export interface OwnedBoardNode {
  id: string;
  type: "owned";
  ownedPalId: string;
  position: { x: number; y: number };
}

export interface ChildBoardNode {
  id: string;
  type: "child";
  /** Resolved at render time from the connected parents. Cached for save/load. */
  childPalKey?: string | null;
  /** Optional override for the passive pool. Empty = use computed pool from parents. */
  passiveOverride?: string[];
  /** Nickname when the child has been committed to owned pals. */
  committedOwnedPalId?: string;
  position: { x: number; y: number };
}

export type BoardNode = OwnedBoardNode | ChildBoardNode;

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
}

export interface Board {
  id: string;
  name: string;
  /** Top-N passives to display on child nodes (1-8). */
  topN: number;
  /** World filter for the palette (null = all). */
  paletteWorldId: string | null;
  nodes: BoardNode[];
  edges: BoardEdge[];
  createdAt: number;
}

const KEY_BOARDS = "palboard.boards.v1";
const KEY_ACTIVE = "palboard.activeBoardId.v1";

function load<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(k, JSON.stringify(v));
}

export function uid(prefix = "n"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

/** Serialize a single board for sharing. Embeds owned-pal snapshots so the
 * recipient can still see node contents even if they don't have the same
 * owned pal IDs. */
export function exportBoardJson(
  board: Board,
  ownedById: Map<string, unknown>,
): string {
  const referenced = new Set<string>();
  for (const n of board.nodes) if (n.type === "owned") referenced.add(n.ownedPalId);
  const palSnapshots: Record<string, unknown> = {};
  for (const id of referenced) {
    const op = ownedById.get(id);
    if (op) palSnapshots[id] = op;
  }
  return JSON.stringify(
    {
      version: 1,
      kind: "palboard-board",
      exportedAt: new Date().toISOString(),
      board,
      ownedPalSnapshots: palSnapshots,
    },
    null,
    2,
  );
}

/** Parse a board export. Returns the board and any embedded owned-pal
 * snapshots so the caller can decide whether to also import those. */
export function parseBoardJson(json: string): {
  board: Board;
  ownedPalSnapshots: Record<string, unknown>;
} {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || parsed.kind !== "palboard-board" || !parsed.board) {
    throw new Error("Invalid board file");
  }
  return {
    board: parsed.board as Board,
    ownedPalSnapshots:
      parsed.ownedPalSnapshots && typeof parsed.ownedPalSnapshots === "object"
        ? (parsed.ownedPalSnapshots as Record<string, unknown>)
        : {},
  };
}

function makeBoard(name: string): Board {
  return {
    id: uid("b"),
    name,
    topN: 4,
    paletteWorldId: null,
    nodes: [],
    edges: [],
    createdAt: Date.now(),
  };
}

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeId, setActiveIdState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let bs = load<Board[]>(KEY_BOARDS, []);
    if (bs.length === 0) {
      bs = [makeBoard("Board 1")];
      save(KEY_BOARDS, bs);
    }
    setBoards(bs);
    const stored = load<string>(KEY_ACTIVE, bs[0].id);
    setActiveIdState(bs.some((b) => b.id === stored) ? stored : bs[0].id);
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Board[]) => {
    setBoards(next);
    save(KEY_BOARDS, next);
  }, []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    save(KEY_ACTIVE, id);
  }, []);

  const createBoard = useCallback(
    (name: string) => {
      const b = makeBoard(name);
      persist([...boards, b]);
      setActiveId(b.id);
      return b;
    },
    [boards, persist, setActiveId],
  );

  const renameBoard = useCallback(
    (id: string, name: string) => {
      persist(boards.map((b) => (b.id === id ? { ...b, name } : b)));
    },
    [boards, persist],
  );

  const deleteBoard = useCallback(
    (id: string) => {
      if (boards.length <= 1) return;
      const next = boards.filter((b) => b.id !== id);
      persist(next);
      if (activeId === id) setActiveId(next[0].id);
    },
    [boards, persist, activeId, setActiveId],
  );

  const updateBoard = useCallback(
    (id: string, patch: Partial<Board>) => {
      persist(boards.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [boards, persist],
  );

  const active = useMemo(
    () => boards.find((b) => b.id === activeId) ?? null,
    [boards, activeId],
  );

  const importBoard = useCallback(
    (b: Board) => {
      // Rebuild IDs to avoid clashes with existing local boards/nodes/edges.
      const oldToNew = new Map<string, string>();
      const newNodes: BoardNode[] = b.nodes.map((n) => {
        const newId = uid(n.type === "owned" ? "n" : "c");
        oldToNew.set(n.id, newId);
        return { ...n, id: newId };
      });
      const newEdges: BoardEdge[] = b.edges
        .map((e) => ({
          id: uid("e"),
          source: oldToNew.get(e.source) ?? e.source,
          target: oldToNew.get(e.target) ?? e.target,
        }))
        // Drop edges whose endpoints weren't remapped (shouldn't happen but be safe).
        .filter((e) => newNodes.some((n) => n.id === e.source) && newNodes.some((n) => n.id === e.target));
      const next: Board = {
        ...b,
        id: uid("b"),
        name: b.name + " (imported)",
        nodes: newNodes,
        edges: newEdges,
        createdAt: Date.now(),
      };
      persist([...boards, next]);
      setActiveId(next.id);
      return next;
    },
    [boards, persist, setActiveId],
  );

  return {
    boards,
    activeId,
    active,
    loaded,
    setActiveId,
    createBoard,
    renameBoard,
    deleteBoard,
    updateBoard,
    importBoard,
  };
}
