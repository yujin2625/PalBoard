"use client";

import { useEffect, useState, useCallback } from "react";
import type { OwnedPal, World } from "./types";

const KEY_PALS = "palboard.ownedPals.v1";
const KEY_WORLDS = "palboard.worlds.v1";
const KEY_ACTIVE_WORLD = "palboard.activeWorldId.v1";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const DEFAULT_WORLD: World = {
  id: "world-default",
  name: "기본 월드",
  createdAt: Date.now(),
};

export function useWorlds() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeId, setActiveId] = useState<string>(DEFAULT_WORLD.id);

  useEffect(() => {
    let loaded = loadJSON<World[]>(KEY_WORLDS, []);
    if (loaded.length === 0) {
      loaded = [DEFAULT_WORLD];
      saveJSON(KEY_WORLDS, loaded);
    }
    setWorlds(loaded);
    const storedActiveId = loadJSON<string>(KEY_ACTIVE_WORLD, loaded[0].id);
    const nextActiveId = loaded.some((w) => w.id === storedActiveId)
      ? storedActiveId
      : loaded[0].id;
    setActiveId(nextActiveId);
    saveJSON(KEY_ACTIVE_WORLD, nextActiveId);
  }, []);

  const persist = useCallback((next: World[]) => {
    setWorlds(next);
    saveJSON(KEY_WORLDS, next);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    saveJSON(KEY_ACTIVE_WORLD, id);
  }, []);

  const addWorld = useCallback(
    (name: string) => {
      const w: World = { id: "w-" + uid(), name, createdAt: Date.now() };
      persist([...worlds, w]);
      setActive(w.id);
      return w;
    },
    [worlds, persist, setActive],
  );

  const renameWorld = useCallback(
    (id: string, name: string) => {
      persist(worlds.map((w) => (w.id === id ? { ...w, name } : w)));
    },
    [worlds, persist],
  );

  const removeWorld = useCallback(
    (id: string) => {
      if (worlds.length <= 1) return;
      const next = worlds.filter((w) => w.id !== id);
      persist(next);
      if (!next.some((w) => w.id === activeId)) setActive(next[0].id);
    },
    [worlds, persist, activeId, setActive],
  );

  return { worlds, activeId, setActive, addWorld, renameWorld, removeWorld };
}

export function useOwnedPals() {
  const [pals, setPals] = useState<OwnedPal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPals(loadJSON<OwnedPal[]>(KEY_PALS, []));
    setLoaded(true);
  }, []);

  const persist = useCallback((next: OwnedPal[]) => {
    setPals(next);
    saveJSON(KEY_PALS, next);
  }, []);

  const addPal = useCallback(
    (p: Omit<OwnedPal, "id" | "createdAt">) => {
      const np: OwnedPal = { ...p, id: "p-" + uid(), createdAt: Date.now() };
      persist([np, ...pals]);
      return np;
    },
    [pals, persist],
  );

  const updatePal = useCallback(
    (id: string, patch: Partial<OwnedPal>) => {
      persist(pals.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [pals, persist],
  );

  const removePals = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      persist(pals.filter((p) => !set.has(p.id)));
    },
    [pals, persist],
  );

  const replaceAll = useCallback(
    (next: OwnedPal[]) => persist(next),
    [persist],
  );

  /** Insert pals preserving their original ids, skipping any whose id already
   * exists locally. Returns the number of new pals inserted. */
  const bulkAdd = useCallback(
    (incoming: OwnedPal[]) => {
      const have = new Set(pals.map((p) => p.id));
      const fresh = incoming.filter((p) => !have.has(p.id));
      if (fresh.length === 0) return 0;
      persist([...fresh, ...pals]);
      return fresh.length;
    },
    [pals, persist],
  );

  /** Insert several new pals at once (assigns fresh ids). Necessary because
   * looping over addPal would persist the same stale snapshot N times and
   * only the last entry survives. */
  const bulkAddFresh = useCallback(
    (incoming: Omit<OwnedPal, "id" | "createdAt">[]) => {
      if (incoming.length === 0) return 0;
      const now = Date.now();
      const fresh = incoming.map<OwnedPal>((p) => ({
        ...p,
        id: "p-" + uid(),
        createdAt: now,
      }));
      persist([...fresh, ...pals]);
      return fresh.length;
    },
    [pals, persist],
  );

  return { pals, loaded, addPal, updatePal, removePals, replaceAll, bulkAdd, bulkAddFresh };
}

const KEY_BOARDS_EXTERNAL = "palboard.boards.v1";

export function exportAll(): string {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    worlds: loadJSON<World[]>(KEY_WORLDS, []),
    ownedPals: loadJSON<OwnedPal[]>(KEY_PALS, []),
    boards: loadJSON<unknown[]>(KEY_BOARDS_EXTERNAL, []),
  };
  return JSON.stringify(data, null, 2);
}

export function importAll(
  json: string,
): { worlds: number; pals: number; boards: number } {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
  const worlds = Array.isArray(parsed.worlds) ? parsed.worlds : [];
  const ownedPals = Array.isArray(parsed.ownedPals) ? parsed.ownedPals : [];
  const boards = Array.isArray(parsed.boards) ? parsed.boards : [];
  if (worlds.length > 0) saveJSON(KEY_WORLDS, worlds);
  saveJSON(KEY_PALS, ownedPals);
  if (boards.length > 0) saveJSON(KEY_BOARDS_EXTERNAL, boards);
  return { worlds: worlds.length, pals: ownedPals.length, boards: boards.length };
}
