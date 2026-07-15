"use client";

// Share a whiteboard as a self-contained link/code — no server involved.
// The board (with embedded owned-pal snapshots, same payload as the file
// export) is JSON-serialized, gzip-compressed, and base64url-encoded so it
// rides inside a URL hash. The recipient's app decodes it back and imports it.

import { exportBoardJson, parseBoardJson, type Board } from "./board-store";

const HASH_PREFIX = "b=";

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

/** Compressed, URL-safe code for the board (no `b=` prefix or URL around it). */
export async function encodeBoardCode(
  board: Board,
  ownedById: Map<string, unknown>,
): Promise<string> {
  const json = exportBoardJson(board, ownedById);
  return bytesToBase64url(await gzip(json));
}

/** Build a full shareable link for the current page pointing at this board. */
export async function buildShareLink(
  board: Board,
  ownedById: Map<string, unknown>,
): Promise<string> {
  const code = await encodeBoardCode(board, ownedById);
  // Strip any existing hash/query so re-sharing doesn't nest codes.
  const base = window.location.href.replace(/[?#].*$/, "");
  return `${base}#${HASH_PREFIX}${code}`;
}

/** Pull the raw code out of whatever the user pasted — a full share link, a
 * bare `#b=...`, or just the code itself. Returns null if nothing usable. */
export function extractCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const hashIdx = s.lastIndexOf(HASH_PREFIX);
  const code = hashIdx >= 0 ? s.slice(hashIdx + HASH_PREFIX.length) : s;
  return code.trim() || null;
}

/** Read a share code from the current URL hash, if present. */
export function shareCodeFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return hash.slice(HASH_PREFIX.length) || null;
}

/** Decode a share code (or a pasted link containing one) back into a board
 * plus its embedded owned-pal snapshots. */
export async function decodeBoardCode(
  input: string,
): Promise<{ board: Board; ownedPalSnapshots: Record<string, unknown> }> {
  const code = extractCode(input);
  if (!code) throw new Error("Empty share code");
  const json = await gunzip(base64urlToBytes(code));
  return parseBoardJson(json);
}
