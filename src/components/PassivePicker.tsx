"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PASSIVES } from "@/lib/passives";
import { PassiveBadge } from "./PassiveBadge";
import { passiveName, useLang, useT } from "@/lib/i18n";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  className?: string;
}

export function PassivePicker({
  value,
  onChange,
  max = 4,
  placeholder,
  className,
}: Props) {
  const { lang } = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const atMax = value.length >= max;
  const ph = placeholder ?? t("picker.passive.placeholder");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return PASSIVES;
    const ql = q.toLowerCase();
    return PASSIVES.filter(
      (p) =>
        p.name.toLowerCase().includes(ql) ||
        p.nameKo.includes(q) ||
        p.description.toLowerCase().includes(ql),
    );
  }, [query]);

  function toggle(name: string) {
    if (selectedSet.has(name)) onChange(value.filter((n) => n !== name));
    else if (!atMax) onChange([...value, name]);
  }
  function remove(name: string) {
    onChange(value.filter((n) => n !== name));
  }

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <div
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-2.5 hover:border-chillet-400 cursor-text transition-colors"
      >
        {value.map((n) => (
          <PassiveBadge key={n} name={n} onRemove={() => remove(n)} />
        ))}
        {value.length === 0 && (
          <span className="text-chillet-500/60 dark:text-chillet-300/40 px-1">{ph}</span>
        )}
        <span className="ml-auto text-xs text-chillet-500/60 dark:text-chillet-300/50 pr-1">
          {value.length}/{max}
        </span>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 shadow-xl shadow-chillet-500/10">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("picker.passive.searchPlaceholder")}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-chillet-900 border-b border-chillet-200/70 dark:border-chillet-800/60 outline-none"
          />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-chillet-500/70 dark:text-chillet-300/50 border-b border-chillet-100 dark:border-chillet-800/40 flex justify-between">
            <span>{t("picker.passive.countAll", { shown: filtered.length, total: PASSIVES.length })}</span>
            {atMax && <span className="text-berry-500">{t("picker.passive.max", { n: max })}</span>}
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.map((p) => {
              const selected = selectedSet.has(p.name);
              const disabled = !selected && atMax;
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(p.name)}
                    className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 ${
                      selected
                        ? "bg-chillet-100/70 dark:bg-chillet-800/60"
                        : disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-chillet-50 dark:hover:bg-chillet-800/60"
                    }`}
                  >
                    <PassiveBadge name={p.name} rank={p.rank} className="shrink-0" />
                    <span className="flex-1 min-w-0 ml-1">
                      {lang === "ko" && p.nameKo !== p.name && (
                        <span className="block text-[11px] text-chillet-500/60 dark:text-chillet-300/40 truncate">
                          {p.name}
                        </span>
                      )}
                      <span className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 truncate">
                        {p.description}
                      </span>
                    </span>
                    {selected && (
                      <span className="text-chillet-500 dark:text-chillet-300 text-sm shrink-0">✓</span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-chillet-700/70 dark:text-chillet-200/60">{t("common.results.none")}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// re-export so consumer can do `import { passiveName } from "@/components/PassivePicker"` if useful
export { passiveName };
