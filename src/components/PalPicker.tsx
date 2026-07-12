"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PALS, palDexLabel } from "@/lib/pal-data";
import type { Pal } from "@/lib/types";
import { PalAvatar } from "./PalAvatar";
import { PalInfoLink } from "./PalInfoLink";
import { palName, useLang, useT } from "@/lib/i18n";

interface Props {
  value?: string;
  onChange: (palKey: string) => void;
  placeholder?: string;
  excludeVariants?: boolean;
}

export function PalPicker({ value, onChange, placeholder, excludeVariants }: Props) {
  const { lang } = useLang();
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // The `autoFocus` attribute can miss its window in the packaged desktop
  // app (Electron's renderer isn't always considered focus-ready in the
  // same tick as the triggering click), so grab focus explicitly instead.
  // A macrotask (not requestAnimationFrame, which browsers throttle/skip
  // entirely for an unfocused window) reliably runs after the commit.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => searchInput.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    let list: readonly Pal[] = PALS;
    if (excludeVariants) list = list.filter((p) => !p.variant);
    if (!q) return list;
    const ql = q.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(ql) ||
        p.nameKo.includes(q) ||
        p.internal.toLowerCase().includes(ql) ||
        String(p.dexNo) === q ||
        (p.paldeckId ?? "").toLowerCase().includes(ql),
    );
  }, [query, excludeVariants]);

  const selected = value ? PALS.find((p) => p.key === value) : null;
  const triggerPlaceholder = placeholder ?? t("picker.pal.placeholder");

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
              {palName(selected, lang)}
              {lang === "ko" && (
                <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs ml-1">({selected.name})</span>
              )}
              {selected.variant && <span className="ml-1 text-berry-500 text-xs">{t("common.variant")}</span>}
            </span>
            <PalInfoLink pal={selected} className="ml-auto" />
          </span>
        ) : (
          <span className="text-chillet-500/60 dark:text-chillet-300/40">{triggerPlaceholder}</span>
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
            ref={searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("picker.pal.searchPlaceholder")}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-chillet-900 border-b border-chillet-200/70 dark:border-chillet-800/60 outline-none"
          />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-chillet-500/70 dark:text-chillet-300/50 border-b border-chillet-100 dark:border-chillet-800/40">
            {filtered.length === PALS.length
              ? t("picker.pal.totalAll", { n: PALS.length })
              : t("picker.pal.totalPart", { shown: filtered.length, total: PALS.length })}
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
                    {palName(p, lang)}
                    {lang === "ko" && (
                      <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs ml-1">({p.name})</span>
                    )}
                    {p.variant && <span className="ml-1 text-berry-500 text-xs">{t("common.variant")}</span>}
                  </span>
                  <span className="text-chillet-500/60 dark:text-chillet-300/40 text-xs shrink-0">BP {p.breedingPower}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-chillet-700/70 dark:text-chillet-200/60">{t("common.results.none")}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
