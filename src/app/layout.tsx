import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { SiteChrome } from "@/components/SiteChrome";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PalBoard — 팰월드 교배 시뮬레이터",
  description: "팰월드 보유 팰 관리, 교배 시뮬레이션, 유전 정보 도구.",
};

// On a base-path build (GitHub Pages), re-base the passive-badge art that
// globals.css references via url() — Next's basePath rewrites <Link>/next-image
// but not CSS url()s. `:root:root` outranks globals.css's `:root` regardless of
// stylesheet order. Empty (no override) for Electron/dev/root deployments.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PASSIVE_ICONS: Record<string, string> = {
  "--pw-passive-bg": "Background_Title",
  "--pw-passive-triangle": "Background_Triangle_Single",
  "--pw-passive-pos4-icon": "Passive_Positive_4_icon",
  "--pw-passive-pos3-icon": "Passive_Positive_3_icon",
  "--pw-passive-pos2-icon": "Passive_Positive_2_icon",
  "--pw-passive-pos1-icon": "Passive_Positive_1_icon",
  "--pw-passive-neg1-icon": "Passive_Negative_1_icon",
  "--pw-passive-neg2-icon": "Passive_Negative_2_icon",
  "--pw-passive-neg3-icon": "Passive_Negative_3_icon",
};
const passiveBaseCss = basePath
  ? `:root:root{${Object.entries(PASSIVE_ICONS)
      .map(([v, name]) => `${v}:url(${basePath}/passives/${name}.png)`)
      .join(";")}}`
  : "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {passiveBaseCss && <style dangerouslySetInnerHTML={{ __html: passiveBaseCss }} />}
        <LangProvider>
          <SiteChrome>{children}</SiteChrome>
        </LangProvider>
      </body>
    </html>
  );
}
