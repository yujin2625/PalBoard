"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PalPicker } from "@/components/PalPicker";
import { Select } from "@/components/Select";
import {
  allShortestPaths,
  suggestAcquisitions,
  type OwnedAtom,
  type PathStep,
} from "@/lib/breeding";
import { palDexLabel } from "@/lib/pal-data";
import { useOwnedPals } from "@/lib/storage";
import type { Pal, PalKey } from "@/lib/types";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { palName, useLang, useT } from "@/lib/i18n";

type Result = {
  paths: PathStep[][];
  unlockSuggestions: Pal[];
  easierSuggestions: Pal[];
  capped: boolean;
} | null;

export default function PathPage() {
  const t = useT();
  const { lang } = useLang();
  const { pals, loaded } = useOwnedPals();
  const [target, setTarget] = useState<string | undefined>();
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxResults, setMaxResults] = useState(10);
  const [ignoreGender, setIgnoreGender] = useState(false);

  const ownedKeys = useMemo<Set<PalKey>>(
    () => new Set(pals.map((p) => p.palKey)),
    [pals],
  );
  const ownedAtoms = useMemo<OwnedAtom[]>(
    () => pals.map((p) => ({ palKey: p.palKey, gender: p.gender })),
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
        // Enumerate up to (maxResults + 1) so we can detect the "capped" case.
        const paths = allShortestPaths(ownedAtoms, target, maxDepth, maxResults + 1, {
          ignoreGender,
        });
        const capped = paths.length > maxResults;
        const displayed = capped ? paths.slice(0, maxResults) : paths;

        let unlockSuggestions: Pal[] = [];
        let easierSuggestions: Pal[] = [];
        if (paths.length === 0) {
          unlockSuggestions = suggestAcquisitions(ownedKeys, target, maxDepth);
        } else if (paths[0].length > 0) {
          const shortest = paths[0].length;
          easierSuggestions = suggestAcquisitions(ownedKeys, target, shortest).filter(
            (p) => !ownedKeys.has(p.key),
          );
        }
        setResult({ paths: displayed, unlockSuggestions, easierSuggestions, capped });
      });
    }, 0);
    return () => clearTimeout(handle);
  }, [ownedKeys, ownedAtoms, target, maxDepth, maxResults, ignoreGender]);

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
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("path.maxResults")}</label>
          <Select<number>
            className="w-24"
            size="sm"
            value={maxResults}
            onChange={setMaxResults}
            options={[5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-chillet-700/80 dark:text-chillet-200/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ignoreGender}
            onChange={(e) => setIgnoreGender(e.target.checked)}
          />
          {t("path.ignoreGender")}
        </label>
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
          {ownedKeys.has(target) && (
            <div className="rounded-lg border border-mint-300 bg-mint-300/15 dark:bg-mint-700/20 dark:border-mint-700/60 p-3 text-sm">
              {t("path.alreadyOwnInfo")}
            </div>
          )}
          {result.paths.length === 0 ? (
            <div className="rounded-lg border border-berry-300 bg-berry-300/15 dark:bg-berry-500/15 dark:border-berry-500/40 p-4 text-sm">
              {t("path.unreachable", { n: maxDepth })}
            </div>
          ) : (
            <>
              <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
                {t("path.pathsFound", { n: result.paths.length })}
                {result.capped && (
                  <span className="ml-2 text-berry-500">• {t("path.morePaths")}</span>
                )}
              </div>
              <div className="space-y-3">
                {result.paths.map((path, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4"
                  >
                    <div className="text-xs font-medium mb-3 text-chillet-700 dark:text-chillet-200">
                      {t("path.pathHeader", { idx: i + 1, n: path.length })}
                    </div>
                    <ol className="space-y-2">
                      {path.map((s, j) => (
                        <li
                          key={j}
                          className="flex items-center flex-wrap gap-1.5 text-sm border-l-2 border-mint-500 pl-3"
                        >
                          <span className="text-chillet-700/70 dark:text-chillet-200/60 w-6">{j + 1}.</span>
                          <PalAvatar pal={s.parents[0]} size={24} />
                          <span className="text-chillet-800 dark:text-chillet-100">{palName(s.parents[0], lang)}</span>
                          <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                          <PalAvatar pal={s.parents[1]} size={24} />
                          <span className="text-chillet-800 dark:text-chillet-100">{palName(s.parents[1], lang)}</span>
                          <span className="text-chillet-500/60 dark:text-chillet-300/40 mx-1">→</span>
                          <PalAvatar pal={s.child} size={24} />
                          <span className="font-medium">{palName(s.child, lang)}</span>
                          {j === path.length - 1 && (
                            <PalInfoLink pal={s.child} className="ml-1" />
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </>
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
