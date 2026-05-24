import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PalBoard — 팰월드 교배 시뮬레이터",
  description: "팰월드 보유 팰 관리, 교배 시뮬레이션, 유전 정보 도구.",
};

const nav = [
  { href: "/", label: "보유 팰" },
  { href: "/sim", label: "교배 시뮬" },
  { href: "/path", label: "경로 찾기" },
  { href: "/info", label: "유전 정보" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-chillet-200/70 dark:border-chillet-800/60 bg-white/70 dark:bg-chillet-950/70 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
              <span className="relative inline-block h-9 w-9 animate-bob">
                <Image
                  src="/pals/chillet.png"
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
            <nav className="flex gap-1 text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-1.5 rounded-full text-chillet-800/80 dark:text-chillet-100/80 hover:bg-chillet-100 dark:hover:bg-chillet-800/60 hover:text-chillet-900 dark:hover:text-white transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-chillet-700/70 dark:text-chillet-200/60">
              <span className="h-2 w-2 rounded-full bg-mint-500 shadow-[0_0_8px_var(--color-mint-500)]" />
              MVP
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-chillet-200/70 dark:border-chillet-800/60 py-5 text-center text-xs text-chillet-700/70 dark:text-chillet-200/60">
          데이터 출처:{" "}
          <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://github.com/tylercamp/palcalc">palcalc</a>
          {" / "}
          <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://palworld.wiki.gg/wiki/Breeding">palworld.wiki.gg</a>
          {" · 아이콘: "}
          <a className="underline hover:text-chillet-600 dark:hover:text-chillet-300" href="https://palworld.wiki.gg/wiki/Chillet">Chillet @ palworld.wiki.gg</a>
        </footer>
      </body>
    </html>
  );
}
