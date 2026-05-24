"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  panelClassName?: string;
  size?: "sm" | "md";
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = "선택",
  className,
  panelClassName,
  size = "md",
}: Props<T>) {
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

  const current = options.find((o) => o.value === value);
  const py = size === "sm" ? "py-1.5" : "py-2";

  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 ${py} text-sm hover:border-chillet-400 flex items-center justify-between gap-2 transition-colors`}
      >
        <span className={current ? "" : "text-chillet-500/60 dark:text-chillet-300/40"}>
          {current ? current.label : placeholder}
        </span>
        <span
          aria-hidden
          className={`text-chillet-500/60 dark:text-chillet-300/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-1 w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 shadow-xl shadow-chillet-500/10 ${panelClassName ?? ""}`}
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-chillet-50 dark:hover:bg-chillet-800/60 ${
                      selected
                        ? "bg-chillet-100/70 dark:bg-chillet-800/60 text-chillet-800 dark:text-chillet-50 font-medium"
                        : ""
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.hint && (
                      <span className="text-xs text-chillet-500/60 dark:text-chillet-300/40">
                        {opt.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
