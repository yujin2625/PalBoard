import type { NextConfig } from "next";

const buildTarget = process.env.BUILD_TARGET; // "electron" | "pages" | undefined
const isStaticExport = buildTarget === "electron" || buildTarget === "pages";
// GitHub Pages serves a project repo under /<repo>/, so the web build needs a
// base path (set via NEXT_PUBLIC_BASE_PATH in the build script). Electron loads
// from file:// at the root and must NOT have one.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Fully static export for both the Electron bundle (loaded via file://) and
  // the GitHub Pages build (served as static files).
  ...(isStaticExport
    ? {
        output: "export",
        // next/image's optimizer service isn't available in a static export.
        images: { unoptimized: true },
        // Trailing-slash URLs (/board/index.html) resolve cleanly for both the
        // Electron static server and GitHub Pages.
        trailingSlash: true,
      }
    : {}),
  // basePath auto-prefixes routes, <Link>, and next/image. (globals.css's
  // /passives/ url()s aren't rewritten by it — the root layout re-bases those.)
  ...(basePath ? { basePath } : {}),

  // Next.js 15+ dev blocks cross-origin requests to dev-only assets
  // (next/font, _next/* HMR endpoints) with 403. List any LAN IPs / mDNS
  // hosts you reach the dev server through. Production is unaffected.
  allowedDevOrigins: [
    "172.30.1.56",
    "127.0.0.1",
    "localhost",
    // add more LAN hosts as needed, e.g. "192.168.0.42" or "*.local"
  ],
};

export default nextConfig;
