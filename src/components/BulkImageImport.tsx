"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PalAvatar } from "./PalAvatar";
import { PalPicker } from "./PalPicker";
import { Select } from "./Select";
import {
  ensureIconHashes,
  processedReferenceThumb,
  recognizeGrid,
  type Crop,
  type RecognizedCell,
} from "@/lib/recognize";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { palName, useLang, useT } from "@/lib/i18n";
import type { Gender, OwnedPal } from "@/lib/types";

interface Row {
  cell: RecognizedCell;
  palKey: string | null;
  gender: Gender;
  include: boolean;
  /** Data URL of the processed reference icon (same masking pipeline as
   * the cell thumb). Lets the user verify symmetric pre-processing. */
  refThumb: string | null;
}

interface Props {
  worldId: string;
  onClose: () => void;
  onAdd: (pals: Omit<OwnedPal, "id" | "createdAt">[]) => number;
}

export function BulkImageImport({ worldId, onClose, onAdd }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(5);
  const [gapX, setGapX] = useState(6);
  const [gapY, setGapY] = useState(6);
  const [rowsResult, setRowsResult] = useState<Row[] | null>(null);
  const [hashProgress, setHashProgress] = useState<{ done: number; total: number } | null>(null);
  const [cacheReady, setCacheReady] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-load icon hashes lazily. If the cache is already populated the
  // promise resolves immediately without firing onProgress — set cacheReady
  // from the promise itself so the 인식 button is always enabled when ready.
  useEffect(() => {
    let cancelled = false;
    ensureIconHashes((done, total) => {
      if (!cancelled) setHashProgress({ done, total });
    }).then(() => {
      if (!cancelled) setCacheReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render image + crop overlay whenever they change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const maxW = canvas.parentElement?.clientWidth ?? 800;
    const scale = Math.min(1, maxW / image.naturalWidth);
    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (crop) {
      const x = crop.x * scale;
      const y = crop.y * scale;
      const w = crop.w * scale;
      const h = crop.h * scale;
      ctx.strokeStyle = "#2d90c9";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(45, 144, 201, 0.12)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      // Draw individual cell rectangles (respecting gaps).
      const cellW = (crop.w - gapX * (cols - 1)) / cols;
      const cellH = (crop.h - gapY * (rows - 1)) / rows;
      ctx.strokeStyle = "rgba(45, 144, 201, 0.65)";
      ctx.lineWidth = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = (crop.x + c * (cellW + gapX)) * scale;
          const cy = (crop.y + r * (cellH + gapY)) * scale;
          ctx.strokeRect(cx, cy, cellW * scale, cellH * scale);
        }
      }
    }
  }, [image, crop, cols, rows, gapX, gapY]);

  // Default crop matches the in-game pal box screenshot at native resolution
  // (about 680×580 px with the grid starting at x=23 / y=19). The numbers are
  // clamped if the user drops a smaller image.
  const DEFAULT_CROP: Crop = { x: 23, y: 19, w: 636, h: 530 };

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const c: Crop = {
          x: Math.min(DEFAULT_CROP.x, img.naturalWidth - 10),
          y: Math.min(DEFAULT_CROP.y, img.naturalHeight - 10),
          w: Math.min(DEFAULT_CROP.w, img.naturalWidth - DEFAULT_CROP.x),
          h: Math.min(DEFAULT_CROP.h, img.naturalHeight - DEFAULT_CROP.y),
        };
        setCrop(c);
        setRowsResult(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    function paste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) handleFile(f);
        }
      }
    }
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, []);

  // Mouse drag for crop.
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!image || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = image.naturalWidth / rect.width;
      const x = (e.clientX - rect.left) * scale;
      const y = (e.clientY - rect.top) * scale;
      setDragging({ x, y });
      setCrop({ x, y, w: 0, h: 0 });
    },
    [image],
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !image || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = image.naturalWidth / rect.width;
      const x = (e.clientX - rect.left) * scale;
      const y = (e.clientY - rect.top) * scale;
      setCrop({
        x: Math.min(dragging.x, x),
        y: Math.min(dragging.y, y),
        w: Math.abs(x - dragging.x),
        h: Math.abs(y - dragging.y),
      });
    },
    [dragging, image],
  );
  const onMouseUp = useCallback(() => setDragging(null), []);

  async function recognize() {
    if (!image || !crop || crop.w < 10 || crop.h < 10) return;
    setRecognizing(true);
    try {
      const hashes = await ensureIconHashes();
      const cells = recognizeGrid(image, crop, cols, rows, hashes, { gapX, gapY });
      const filtered = cells.filter((c) => !c.empty);
      // Pre-fetch processed reference thumbs in parallel for the matched
      // palkeys so each result row can show cell ↔ reference side-by-side.
      const refThumbs = await Promise.all(
        filtered.map((c) => (c.palKey ? processedReferenceThumb(c.palKey) : Promise.resolve(null))),
      );
      const result: Row[] = filtered.map((c, i) => ({
        cell: c,
        palKey: c.palKey,
        gender: "Unknown",
        include: true,
        refThumb: refThumbs[i],
      }));
      setRowsResult(result);
    } finally {
      setRecognizing(false);
    }
  }

  function commit() {
    if (!rowsResult) return;
    const toAdd = rowsResult
      .filter((r) => r.include && r.palKey)
      .map<Omit<OwnedPal, "id" | "createdAt">>((r) => ({
        palKey: r.palKey!,
        gender: r.gender,
        passives: [],
        worldId,
      }));
    onAdd(toAdd);
    onClose();
  }

  // Helpers for the numeric inputs.
  function setCropField(field: keyof Crop, value: number) {
    if (!crop || !image) return;
    const next = { ...crop, [field]: value };
    // Clamp inside the image.
    next.x = Math.max(0, Math.min(image.naturalWidth, next.x));
    next.y = Math.max(0, Math.min(image.naturalHeight, next.y));
    next.w = Math.max(0, Math.min(image.naturalWidth - next.x, next.w));
    next.h = Math.max(0, Math.min(image.naturalHeight - next.y, next.h));
    setCrop(next);
  }

  return (
    <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{t("bulk.title")}</div>
        <button
          onClick={onClose}
          className="text-xs text-chillet-700/70 dark:text-chillet-200/60 hover:text-berry-500"
        >
          ✕
        </button>
      </div>

      {!image && (
        <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block"
          />
          <div>{t("bulk.pasteHint")}</div>
        </div>
      )}

      {image && crop && (
        <>
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
            {t("bulk.dragCrop")}
          </div>
          <div className="overflow-auto max-h-[55vh] border border-chillet-200/70 dark:border-chillet-800/60 rounded-md">
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className="select-none cursor-crosshair block"
            />
          </div>

          {/* Numeric crop inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["bulk.crop.x", "x", crop.x],
              ["bulk.crop.y", "y", crop.y],
              ["bulk.crop.w", "w", crop.w],
              ["bulk.crop.h", "h", crop.h],
            ] as const).map(([label, field, val]) => (
              <div key={field}>
                <label className="block text-[11px] text-chillet-700/70 dark:text-chillet-200/60 mb-0.5">
                  {t(label)}
                </label>
                <input
                  type="number"
                  value={Math.round(val)}
                  onChange={(e) => setCropField(field, Number(e.target.value))}
                  className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-2 py-1 text-sm tabular-nums"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-[11px] text-chillet-700/70 dark:text-chillet-200/60 mb-0.5">{t("bulk.cols")}</label>
              <Select<number>
                size="sm"
                value={cols}
                onChange={setCols}
                options={[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: String(n) }))}
              />
            </div>
            <div>
              <label className="block text-[11px] text-chillet-700/70 dark:text-chillet-200/60 mb-0.5">{t("bulk.rows")}</label>
              <Select<number>
                size="sm"
                value={rows}
                onChange={setRows}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map((n) => ({ value: n, label: String(n) }))}
              />
            </div>
            <div>
              <label className="block text-[11px] text-chillet-700/70 dark:text-chillet-200/60 mb-0.5">{t("bulk.gapX")}</label>
              <input
                type="number"
                value={Math.round(gapX)}
                onChange={(e) => setGapX(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-2 py-1 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-chillet-700/70 dark:text-chillet-200/60 mb-0.5">{t("bulk.gapY")}</label>
              <input
                type="number"
                value={Math.round(gapY)}
                onChange={(e) => setGapY(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-2 py-1 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setImage(null);
                setCrop(null);
                setRowsResult(null);
              }}
              className="px-3 py-1.5 rounded-md text-sm border border-chillet-200 dark:border-chillet-700/70"
            >
              {t("bulk.reset")}
            </button>
            <span className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {cacheReady
                ? t("bulk.cacheReady")
                : hashProgress
                  ? t("bulk.preparing", { done: hashProgress.done, total: hashProgress.total })
                  : t("bulk.preparingStart")}
            </span>
            <button
              onClick={recognize}
              disabled={!cacheReady || recognizing || !crop || crop.w < 10}
              className="ml-auto px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600 disabled:opacity-50"
            >
              {recognizing ? t("bulk.recognizing") : t("bulk.recognize")}
            </button>
          </div>
        </>
      )}

      {rowsResult && (
        <div className="border-t border-chillet-200/70 dark:border-chillet-800/60 pt-3 space-y-2">
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
            {t("bulk.resultHint", { n: rowsResult.length })}
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {rowsResult.map((r, i) => {
              const pal = r.palKey ? palByKey(r.palKey) : null;
              const lowConf = r.cell.distance > 40 || r.cell.margin < 4;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-md ${
                    lowConf
                      ? "bg-berry-300/15 dark:bg-berry-500/15"
                      : "bg-chillet-50 dark:bg-chillet-800/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) =>
                      setRowsResult((rs) =>
                        rs!.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)),
                      )
                    }
                  />
                  <img
                    src={r.cell.thumb}
                    alt=""
                    title={t("bulk.thumb.cell")}
                    className="w-9 h-9 rounded-md border border-chillet-200/70 dark:border-chillet-800/60"
                  />
                  <span className="text-chillet-500/70 dark:text-chillet-300/50 text-xs">vs</span>
                  {r.refThumb ? (
                    <img
                      src={r.refThumb}
                      alt=""
                      title={t("bulk.thumb.ref")}
                      className="w-9 h-9 rounded-md border border-mint-300 dark:border-mint-700"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-md border border-dashed border-chillet-300 dark:border-chillet-700/60" />
                  )}
                  <span className="text-chillet-500/70 dark:text-chillet-300/50 text-xs">→</span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {pal && <PalAvatar pal={pal} size={28} />}
                    <div className="flex-1 min-w-0">
                      <PalPicker
                        value={r.palKey ?? undefined}
                        onChange={(k) => {
                          setRowsResult((rs) =>
                            rs!.map((x, j) => (j === i ? { ...x, palKey: k } : x)),
                          );
                          // Refresh the side-by-side reference thumb for the new pick.
                          processedReferenceThumb(k).then((ref) =>
                            setRowsResult((rs) =>
                              rs!.map((x, j) => (j === i ? { ...x, refThumb: ref } : x)),
                            ),
                          );
                        }}
                      />
                    </div>
                  </div>
                  <Select<Gender>
                    size="sm"
                    className="w-24"
                    value={r.gender}
                    onChange={(g) =>
                      setRowsResult((rs) =>
                        rs!.map((x, j) => (j === i ? { ...x, gender: g } : x)),
                      )
                    }
                    options={[
                      { value: "Unknown", label: t("common.short.unknown") },
                      { value: "Male", label: t("common.short.male") },
                      { value: "Female", label: t("common.short.female") },
                    ]}
                  />
                  <span
                    className={`text-[10px] tabular-nums ${
                      lowConf
                        ? "text-berry-500"
                        : "text-chillet-700/60 dark:text-chillet-200/50"
                    }`}
                    title={`distance=${r.cell.distance} margin=${r.cell.margin}`}
                  >
                    d{r.cell.distance}
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const selected = rowsResult.filter((r) => r.include && r.palKey).length;
            return (
              <div className="flex justify-end">
                <button
                  onClick={commit}
                  disabled={selected === 0}
                  className="px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600 disabled:opacity-50"
                >
                  {t("bulk.addSelected", { n: selected })}
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

void palDexLabel;
void palName;
