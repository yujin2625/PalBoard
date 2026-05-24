import { palWikiUrl } from "@/lib/pal-data";
import type { Pal } from "@/lib/types";

interface Props {
  pal: Pal;
  /** "icon" → tiny icon-only; "button" → full pill */
  variant?: "icon" | "button";
  className?: string;
}

export function PalInfoLink({ pal, variant = "icon", className = "" }: Props) {
  if (variant === "button") {
    return (
      <a
        href={palWikiUrl(pal)}
        target="_blank"
        rel="noopener noreferrer"
        title={`${pal.name} 위키 페이지 열기`}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-chillet-200 dark:border-chillet-700/70 text-chillet-700 dark:text-chillet-200 hover:bg-chillet-50 dark:hover:bg-chillet-800/60 transition-colors ${className}`}
      >
        <span>팰 정보</span>
        <span aria-hidden>↗</span>
      </a>
    );
  }
  return (
    <a
      href={palWikiUrl(pal)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${pal.name} 위키 페이지 열기`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-chillet-500 hover:text-chillet-700 dark:text-chillet-300 dark:hover:text-chillet-100 hover:bg-chillet-100 dark:hover:bg-chillet-800/60 transition-colors ${className}`}
    >
      <span aria-hidden className="text-sm">↗</span>
      <span className="sr-only">팰 정보</span>
    </a>
  );
}
