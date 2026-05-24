// Electron main process — boots a desktop window that serves the static
// Next.js export from /out via an embedded loopback HTTP server. We avoid
// loading file:// directly because next/image's preload tags use absolute
// "/" paths that don't resolve on the file scheme.
//
// In dev mode (ELECTRON_DEV=1) we point straight at the running Next.js
// dev server instead so changes hot-reload normally.

const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { extname } = require("node:path");

const isDev = process.env.ELECTRON_DEV === "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

/**
 * Serve the exported Next.js /out directory on localhost. Returns the URL.
 * Picks a free ephemeral port automatically (port 0).
 */
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        let rel = decodeURIComponent(url.pathname);
        if (rel.endsWith("/")) rel += "index.html";

        // Try the exact path first, then a directory's index.html, then
        // append .html for Next.js' route-without-extension layout.
        const candidates = [
          path.join(rootDir, rel),
          path.join(rootDir, rel, "index.html"),
          path.join(rootDir, rel + ".html"),
          path.join(rootDir, "404.html"),
        ];
        const file = candidates.find((p) => {
          try {
            return fs.statSync(p).isFile();
          } catch {
            return false;
          }
        });
        if (!file) {
          res.writeHead(404).end("Not found");
          return;
        }
        const ext = extname(file).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] ?? "application/octet-stream",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(file).pipe(res);
      } catch (e) {
        res.writeHead(500).end(String(e));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#f5fbfe",
    show: false,
    autoHideMenuBar: true,
    title: "PalBoard",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://localhost:3000/");
  } else {
    // In a packaged app electron-builder unpacks /out to resources/app/out
    // (via asarUnpack). __dirname points at electron/, so out is ../out.
    const outDir = path.join(__dirname, "..", "out");
    const { url } = await startStaticServer(outDir);
    win.loadURL(url);
  }
}

function installMenu() {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "appMenu" },
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
      ]),
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

app.whenReady().then(() => {
  installMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
