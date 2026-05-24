"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PALS, palDexLabel } from "@/lib/pal-data";
import type { Pal } from "@/lib/types";
import { PalAvatar } from "./PalAvatar";
import { PalInfoLink } from "./PalInfoLink";

interface Props {
  value?: string;
  onChange: (palKey: string) => void;
  placeholder?: string;
  excludeVariants?: boolean;
}

export function PalPicker({ value, onChange, placeholder = "팰 검색…", excludeVariants }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: readonly Pal[] = PALS;
    if (excludeVariants) list = list.filter((p) => !p.variant);
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameKo.includes(query) ||
        p.internal.toLowerCase().includes(q) ||
        String(p.dexNo) === q ||
        (p.paldeckId ?? "").toLowerCase().includes(q),
    );
  }, [query, excludeVariants]);

  const selected = value ? PALS.find((p) => p.key === value) : null;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm hover:border-chillet-400 flex items-center justify-between gap-2 transition-colors"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <PalAvatar pal={selected} size={28} />
            <span className="truncate">
              <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1.5">{palDexLabel(selected)}</span>
              {selected.nameKo}
              <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs ml-1">({selected.name})</span>
              {selected.variant && <span className="ml-1 text-berry-500 text-xs">variant</span>}
            </span>
            <PalInfoLink pal={selected} className="ml-auto" />
          </span>
        ) : (
          <span className="text-chillet-500/60 dark:text-chillet-300/40">{placeholder}</span>
        )}
        <span
          aria-hidden
          className={`text-chillet-500/60 dark:text-chillet-300/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 shadow-xl shadow-chillet-500/10">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름/넘버로 검색"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-chillet-900 border-b border-chillet-200/70 dark:border-chillet-800/60 outline-none"
          />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-chillet-500/70 dark:text-chillet-300/50 border-b border-chillet-100 dark:border-chillet-800/40">
            {filtered.length === PALS.length
              ? `전체 ${PALS.length}마리`
              : `${filtered.length}/${PALS.length}마리`}
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.key);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-chillet-50 dark:hover:bg-chillet-800/60 flex items-center gap-2"
                >
                  <PalAvatar pal={p} size={28} />
                  <span className="truncate flex-1 min-w-0">
                    <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1.5">{palDexLabel(p)}</span>
                    {p.nameKo}
                    <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs ml-1">({p.name})</span>
                    {p.variant && <span className="ml-1 text-berry-500 text-xs">variant</span>}
                  </span>
                  <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs shrink-0">BP {p.breedingPower}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-chillet-700/70 dark:text-chillet-200/60">결과 없음</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
