"use client";

import { useLang } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      className="inline-flex rounded-full border border-chillet-200/70 dark:border-chillet-700/60 overflow-hidden text-[11px] font-medium"
    >
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 transition-colors ${
            lang === l
              ? "bg-chillet-500 text-white"
              : "text-chillet-700/70 dark:text-chillet-200/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          }`}
        >
          {l === "ko" ? "한국어" : "EN"}
        </button>
      ))}
    </div>
  );
}
