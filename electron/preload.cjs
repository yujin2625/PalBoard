// Preload bridge: exposes a tiny, read-only save-import API to the renderer.
// Works under sandbox:true (contextBridge + ipcRenderer are always available).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("palboard", {
  isElectron: true,
  /** Auto-detect Palworld Level.sav files in the default local location.
   * Returns [{ path, world, steam, mtime }] sorted newest first ([] if none). */
  detectSaves: () => ipcRenderer.invoke("palboard:detect-saves"),
  /** Open a file dialog to pick a Level.sav manually. Returns path or null. */
  pickSaveFile: () => ipcRenderer.invoke("palboard:pick-save"),
  /** Parse a save file into { players: [{ uid, name, count, pals }] }.
   * Returns { error } on failure. */
  parseSaveFile: (path) => ipcRenderer.invoke("palboard:parse-save", path),
});
