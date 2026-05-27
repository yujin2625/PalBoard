"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

type PendingPrompt = {
  message: string;
  initial: string;
};

// Electron disables window.prompt() — it silently returns null. This hook
// gives the same Promise-style API backed by an in-app modal so the world /
// board rename + add flows keep working in the packaged desktop app.
export function useTextPrompt() {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const resolveRef = useRef<((value: string | null) => void) | null>(null);

  const ask = useCallback((message: string, initial = ""): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current?.(null);
      resolveRef.current = resolve;
      setPending({ message, initial });
    });
  }, []);

  const close = useCallback((value: string | null) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setPending(null);
    resolve?.(value);
  }, []);

  useEffect(() => {
    return () => {
      resolveRef.current?.(null);
      resolveRef.current = null;
    };
  }, []);

  const dialog = pending ? (
    <TextPromptDialog
      message={pending.message}
      initial={pending.initial}
      onCancel={() => close(null)}
      onSubmit={(v) => close(v)}
    />
  ) : null;

  return { ask, dialog };
}

function TextPromptDialog({
  message,
  initial,
  onCancel,
  onSubmit,
}: {
  message: string;
  initial: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    const trimmed = value.trim();
    if (!trimmed) return onCancel();
    onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4 shadow-xl space-y-3">
        <div className="text-sm text-chillet-700 dark:text-chillet-200">{message}</div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") onCancel();
          }}
          className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-sm border border-chillet-200 dark:border-chillet-700/70"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={commit}
            className="px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600"
          >
            {t("common.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
