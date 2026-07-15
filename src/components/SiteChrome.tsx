"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { assetPath } from "@/lib/assets";
import { LangToggle } from "./LangToggle";
import { Settings } from "./Settings";

const nav = [
  { href: "/", key: "nav.owned" },
  { href: "/sim", key: "nav.sim" },
  { href: "/path", key: "nav.path" },
  { href: "/board", key: "nav.board" },
  { href: "/info", key: "nav.info" },
];

export function SiteChrome({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const wide = pathname?.startsWith("/board");
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-chillet-200/70 dark:border-chillet-800/60 bg-white/70 dark:bg-chillet-950/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 min-h-16 py-2 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight shrink-0">
            <span className="relative inline-block h-9 w-9 animate-bob">
              <Image
                src={assetPath("/pals/Chillet.png")}
                alt="Chillet"
                fill
                sizes="36px"
                className="object-contain drop-shadow-[0_2px_6px_rgba(45,144,201,0.45)]"
                priority
              />
            </span>
            <span className="text-lg bg-gradient-to-r from-chillet-700 to-mint-500 bg-clip-text text-transparent dark:from-chillet-200 dark:to-mint-300">
              PalBoard
            </span>
          </Link>
          <nav className="order-last w-full sm:order-none sm:w-auto flex gap-1 text-sm overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-chillet-800/80 dark:text-chillet-100/80 hover:bg-chillet-100 dark:hover:bg-chillet-800/60 hover:text-chillet-900 dark:hover:text-white transition-colors"
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <LangToggle />
            <Settings />
          </div>
        </div>
      </header>
      <main
        className={`flex-1 w-full mx-auto ${
          wide ? "max-w-none px-4 py-4" : "max-w-6xl px-4 py-8"
        }`}
      >
        {children}
      </main>
      <footer className="border-t border-chillet-200/70 dark:border-chillet-800/60 py-5 text-center text-xs text-chillet-700/70 dark:text-chillet-200/60">
        {t("footer.source")}:{" "}
        <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://github.com/tylercamp/palcalc">
          palcalc
        </a>
        {" / "}
        <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://palworld.wiki.gg/wiki/Breeding">
          palworld.wiki.gg
        </a>
        {" · "}
        {t("footer.icon")}:{" "}
        <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://palworld.wiki.gg/wiki/Chillet">
          Chillet @ palworld.wiki.gg
        </a>
      </footer>
    </>
  );
}
