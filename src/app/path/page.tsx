"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PalPicker } from "@/components/PalPicker";
import { Select } from "@/components/Select";
import { shortestPath, suggestAcquisitions, type PathStep } from "@/lib/breeding";
import { palDexLabel } from "@/lib/pal-data";
import { useOwnedPals } from "@/lib/storage";
import type { Pal, PalKey } from "@/lib/types";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { palName, useLang, useT } from "@/lib/i18n";

type Result = {
  path: PathStep[] | null;
  unlockSuggestions: Pal[];
  easierSuggestions: Pal[];
} | null;

export default function PathPage() {
  const t = useT();
  const { lang } = useLang();
  const { pals, loaded } = useOwnedPals();
  const [target, setTarget] = useState<string | undefined>();
  const [maxDepth, setMaxDepth] = useState(3);

  const ownedKeys = useMemo<Set<PalKey>>(
    () => new Set(pals.map((p) => p.palKey)),
    [pals],
  );

  const [result, setResult] = useState<Result>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!target) {
      setResult(null);
      return;
    }
    setResult(null);
    const handle = setTimeout(() => {
      startTransition(() => {
        const path = shortestPath(ownedKeys, target, maxDepth);
        let unlockSuggestions: Pal[] = [];
        let easierSuggestions: Pal[] = [];
        if (!path || path.length === 0) {
          if (path === null) {
            unlockSuggestions = suggestAcquisitions(ownedKeys, target, maxDepth);
          }
        } else {
          easierSuggestions = suggestAcquisitions(ownedKeys, target, path.length).filter(
            (p) => !ownedKeys.has(p.key),
          );
        }
        setResult({ path, unlockSuggestions, easierSuggestions });
      });
    }, 0);
    return () => clearTimeout(handle);
  }, [ownedKeys, target, maxDepth]);

  const computing = isPending || (target !== undefined && result === null);

  if (!loaded) return <div className="text-chillet-700/70 dark:text-chillet-200/60">{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("path.title")}</h1>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        {t("path.subtitle", { n: maxDepth })}
      </p>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-72">
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("path.target")}</label>
          <PalPicker value={target} onChange={setTarget} />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("path.maxDepth")}</label>
          <Select<number>
            className="w-28"
            size="sm"
            value={maxDepth}
            onChange={setMaxDepth}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: t("path.step.suffix", { n }) }))}
          />
        </div>
        <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
          {t("path.ownedCount", { n: ownedKeys.size })}
        </div>
      </div>

      {target && computing && (
        <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-6 flex items-center gap-3">
          <Spinner />
          <div>
            <div className="text-sm font-medium">{t("path.computing")}</div>
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {ownedKeys.size === 0
                ? t("path.computing.empty")
                : t("path.computing.normal", { n: ownedKeys.size, d: maxDepth })}
            </div>
          </div>
        </div>
      )}

      {target && !computing && result && (
        <div className="space-y-4">
          {result.path === null ? (
            <div className="rounded-lg border border-berry-300 bg-berry-300/15 dark:bg-berry-500/15 dark:border-berry-500/40 p-4 text-sm">
              {t("path.unreachable", { n: maxDepth })}
            </div>
          ) : result.path.length === 0 ? (
            <div className="rounded-lg border border-mint-300 bg-mint-300/15 dark:bg-mint-700/20 dark:border-mint-700/60 p-4 text-sm">
              {t("path.alreadyOwn")}
            </div>
          ) : (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-3">{t("path.stepHeader", { n: result.path.length })}</div>
              <ol className="space-y-2">
                {result.path.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center flex-wrap gap-1.5 text-sm border-l-2 border-mint-500 pl-3"
                  >
                    <span className="text-chillet-700/70 dark:text-chillet-200/60 w-6">{i + 1}.</span>
                    <PalAvatar pal={s.parents[0]} size={24} />
                    <span className="text-chillet-800 dark:text-chillet-100">{palName(s.parents[0], lang)}</span>
                    <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                    <PalAvatar pal={s.parents[1]} size={24} />
                    <span className="text-chillet-800 dark:text-chillet-100">{palName(s.parents[1], lang)}</span>
                    <span className="text-chillet-500/60 dark:text-chillet-300/40 mx-1">→</span>
                    <PalAvatar pal={s.child} size={24} />
                    <span className="font-medium">{palName(s.child, lang)}</span>
                    <PalInfoLink pal={s.child} className="ml-1" />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.unlockSuggestions.length > 0 && (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-2">{t("path.unlock.title", { n: maxDepth })}</div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {result.unlockSuggestions.map((p) => (
                  <li
                    key={p.key}
                    className="px-2 py-1 rounded-md bg-chillet-50 dark:bg-chillet-800/40 flex items-center gap-1.5"
                  >
                    <PalAvatar pal={p} size={20} />
                    {palDexLabel(p)} {palName(p, lang)}
                    <PalInfoLink pal={p} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.easierSuggestions.length > 0 && (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-2">{t("path.easier.title")}</div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {result.easierSuggestions.map((p) => (
                  <li
                    key={p.key}
                    className="px-2 py-1 rounded-md bg-chillet-100/60 dark:bg-chillet-800/40 border border-chillet-300/60 dark:border-chillet-700/60 flex items-center gap-1.5"
                  >
                    <PalAvatar pal={p} size={20} />
                    {palDexLabel(p)} {palName(p, lang)}
                    <PalInfoLink pal={p} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 rounded-full border-2 border-chillet-200 border-t-chillet-500 dark:border-chillet-700/60 dark:border-t-chillet-300 animate-spin"
      aria-label="loading"
    />
  );
}
