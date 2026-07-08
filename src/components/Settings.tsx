"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { getMyUid, setMyUid, clearMyUid } from "@/lib/settings";
import { normalizeUid } from "@/lib/mod-import";
import { clearAllData } from "@/lib/storage";

export function Settings() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");

  function openModal() {
    setUid(getMyUid());
    setOpen(true);
  }

  function saveUid() {
    const v = uid.trim();
    if (v) setMyUid(v);
    else clearMyUid();
  }

  function clearUid() {
    clearMyUid();
    setUid("");
  }

  function resetAll() {
    if (!confirm(t("settings.reset.confirm"))) return;
    clearAllData();
    window.location.reload();
  }

  const normalized = normalizeUid(uid);

  return (
    <>
      <button
        onClick={openModal}
        aria-label={t("settings.title")}
        title={t("settings.title")}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-chillet-200/70 dark:border-chillet-700/60 text-chillet-700/80 dark:text-chillet-200/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50 transition-colors"
      >
        ⚙
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 shadow-xl p-5 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">{t("settings.title")}</div>
              <button
                onClick={() => setOpen(false)}
                className="text-chillet-700/70 dark:text-chillet-200/60 hover:text-berry-500"
              >
                ✕
              </button>
            </div>

            {/* My Player UID */}
            <section className="space-y-2">
              <div className="text-sm font-medium">{t("settings.uid.label")}</div>
              <p className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
                {t("settings.uid.help")}
              </p>
              <div className="flex gap-2">
                <input
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="6BC6DB07000000000000000000000000"
                  className="flex-1 rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-1.5 text-sm font-mono"
                />
                <button
                  onClick={saveUid}
                  className="px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={clearUid}
                  className="px-3 py-1.5 rounded-md text-sm border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
                >
                  {t("settings.uid.clear")}
                </button>
              </div>
              {uid.trim() && (
                <div className="text-[11px] text-chillet-700/60 dark:text-chillet-200/50 font-mono break-all">
                  → {normalized || "?"}
                </div>
              )}
            </section>

            {/* Data */}
            <section className="space-y-2 border-t border-chillet-200/70 dark:border-chillet-800/60 pt-4">
              <div className="text-sm font-medium">{t("settings.data.label")}</div>
              <p className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
                {t("settings.data.help")}
              </p>
              <button
                onClick={resetAll}
                className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
              >
                {t("settings.data.reset")}
              </button>
            </section>

            <div className="text-[11px] text-chillet-700/50 dark:text-chillet-200/40 text-right">
              PalBoard v0.1.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
