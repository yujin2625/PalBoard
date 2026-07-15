"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// A useState drop-in that survives tab navigation by mirroring its value to
// localStorage. Search pages (path/sim/owned) are separate routes, so leaving
// and coming back unmounts them; without this every search input resets.
//
// The stored value lives inside a `{ v }` wrapper so `undefined` round-trips
// cleanly (a bare `JSON.stringify(undefined)` can't be parsed back). Loading
// happens in an effect (not a lazy initializer) so the statically prerendered
// HTML and the first client render always match — no hydration mismatch.
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue((JSON.parse(raw) as { v: T }).v);
    } catch {}
    setHydrated(true);
    // Re-loading is keyed only on `key`; value changes persist via the effect
    // below, so we intentionally don't re-read on every render.
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ v: value }));
    } catch {}
  }, [key, value, hydrated]);

  return [value, setValue];
}
