"use client";

import { useCallback, useEffect, useState } from "react";
import { getPalboard, type DetectedSave, type SaveParseResult } from "@/lib/electron";
import { mapRawPals } from "@/lib/mod-import";
import { useT } from "@/lib/i18n";
import type { OwnedPal } from "@/lib/types";

interface Props {
  worldId: string;
  onClose: () => void;
  onAdd: (pals: Omit<OwnedPal, "id" | "createdAt">[]) => number;
}

export function SaveImport({ worldId, onClose, onAdd }: Props) {
  const t = useT();
  const bridge = getPalboard();
  const [detected, setDetected] = useState<DetectedSave[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaveParseResult | null>(null);

  useEffect(() => {
    if (!bridge) return;
    bridge.detectSaves().then(setDetected).catch(() => setDetected([]));
  }, [bridge]);

  const parse = useCallback(
    async (savePath: string) => {
      if (!bridge) return;
      setBusy(true);
      try {
        const res = await bridge.parseSaveFile(savePath);
        if (res.error || !res.players) {
          alert(t("save.error") + (res.error ? `\n\n${res.error}` : ""));
          return;
        }
        if (res.players.length === 0) {
          alert(t("save.noPals"));
          return;
        }
        setResult(res);
      } finally {
        setBusy(false);
      }
    },
    [bridge, t],
  );

  const pickFile = useCallback(async () => {
    if (!bridge) return;
    const p = await bridge.pickSaveFile();
    if (p) parse(p);
  }, [bridge, parse]);

  function importPlayer(uid: string) {
    if (!result) return;
    const player = result.players.find((p) => p.uid === uid);
    if (!player) return;
    const { pals, stats } = mapRawPals(player.pals, worldId);
    if (pals.length > 0) onAdd(pals);
    const extra =
      stats.unmatchedSpecies.length > 0
        ? t("modImport.unmatchedNote", { n: stats.unmatchedSpecies.length })
        : "";
    alert(t("modImport.success", { matched: stats.matched, total: stats.total, extra }));
    onClose();
  }

  function fmtDate(ms: number) {
    return new Date(ms).toLocaleString();
  }

  return (
    <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{t("save.title")}</div>
        <button
          onClick={onClose}
          className="text-xs text-chillet-700/70 dark:text-chillet-200/60 hover:text-berry-500"
        >
          ✕
        </button>
      </div>

      {!result && (
        <>
          <p className="text-xs text-chillet-700/70 dark:text-chillet-200/60">{t("save.intro")}</p>

          {detected === null && (
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {t("save.detecting")}
            </div>
          )}

          {detected && detected.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
                {t("save.detected")}
              </div>
              {detected.map((d) => (
                <button
                  key={d.path}
                  disabled={busy}
                  onClick={() => parse(d.path)}
                  className="w-full text-left px-3 py-2 rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50 disabled:opacity-50"
                >
                  <div className="text-sm font-mono truncate">{d.world}</div>
                  <div className="text-[11px] text-chillet-700/60 dark:text-chillet-200/50">
                    {fmtDate(d.mtime)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {detected && detected.length === 0 && (
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {t("save.none")}
            </div>
          )}

          <button
            onClick={pickFile}
            disabled={busy}
            className="px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600 disabled:opacity-50"
          >
            {busy ? t("save.parsing") : t("save.pickFile")}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-2">
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
            {t("save.choosePlayer")}
          </div>
          {result.players.map((p) => (
            <button
              key={p.uid}
              onClick={() => importPlayer(p.uid)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
            >
              <span className="text-sm">{p.name || t("save.unnamed")}</span>
              <span className="text-xs text-chillet-700/60 dark:text-chillet-200/50">
                {t("save.palCount", { n: p.count })}
              </span>
            </button>
          ))}
          <button
            onClick={() => setResult(null)}
            className="text-xs text-chillet-700/70 dark:text-chillet-200/60 underline"
          >
            {t("common.back")}
          </button>
        </div>
      )}
    </div>
  );
}
