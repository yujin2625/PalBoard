import type { NextConfig } from "next";

const isElectronBuild = process.env.BUILD_TARGET === "electron";

const nextConfig: NextConfig = {
  // Switch to fully static export when packaging into Electron. The exported
  // /out directory is bundled into the desktop app and loaded via file://.
  ...(isElectronBuild
    ? {
        output: "export",
        // next/image's optimizer service isn't available in a static export.
        images: { unoptimized: true },
        // Trailing-slash URLs (/board/index.html) resolve cleanly when the
        // exported bundle is served by Electron's embedded static server.
        trailingSlash: true,
      }
    : {}),

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
