import type { ModExportPal } from "./mod-import";

/** Shape of the save-file parser result returned by the Electron main process. */
export interface SavePlayer {
  uid: string;
  name: string | null;
  count: number;
  pals: ModExportPal[];
}

export interface SaveParseResult {
  version: number;
  source: string;
  fileName: string;
  mapCount: number;
  skipped: number;
  players: SavePlayer[];
  error?: string;
}

export interface DetectedSave {
  path: string;
  world: string;
  steam: string;
  mtime: number;
}

/** The bridge exposed by electron/preload.cjs (undefined in a plain browser). */
export interface PalboardBridge {
  isElectron: true;
  detectSaves: () => Promise<DetectedSave[]>;
  pickSaveFile: () => Promise<string | null>;
  parseSaveFile: (path: string) => Promise<SaveParseResult>;
}

export function getPalboard(): PalboardBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { palboard?: PalboardBridge }).palboard ?? null;
}
