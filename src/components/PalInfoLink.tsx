"use client";

import { palWikiUrl } from "@/lib/pal-data";
import type { Pal } from "@/lib/types";
import { palName, useLang, useT } from "@/lib/i18n";

interface Props {
  pal: Pal;
  variant?: "icon" | "button";
  className?: string;
}

export function PalInfoLink({ pal, variant = "icon", className = "" }: Props) {
  const t = useT();
  const { lang } = useLang();
  const tip = `${palName(pal, lang)} — ${t("common.openWiki")}`;

  if (variant === "button") {
    return (
      <a
        href={palWikiUrl(pal)}
        target="_blank"
        rel="noopener noreferrer"
        title={tip}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-chillet-200 dark:border-chillet-700/70 text-chillet-700 dark:text-chillet-200 hover:bg-chillet-50 dark:hover:bg-chillet-800/60 transition-colors ${className}`}
      >
        <span>{t("common.openWiki")}</span>
        <span aria-hidden>↗</span>
      </a>
    );
  }
  return (
    <a
      href={palWikiUrl(pal)}
      target="_blank"
      rel="noopener noreferrer"
      title={tip}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-chillet-500 hover:text-chillet-700 dark:text-chillet-300 dark:hover:text-chillet-100 hover:bg-chillet-100 dark:hover:bg-chillet-800/60 transition-colors ${className}`}
    >
      <span aria-hidden className="text-sm">↗</span>
      <span className="sr-only">{t("common.openWiki")}</span>
    </a>
  );
}
