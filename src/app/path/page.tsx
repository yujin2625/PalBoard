"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PalPicker } from "@/components/PalPicker";
import { Select } from "@/components/Select";
import {
  allShortestPaths,
  pInheritSet,
  suggestAcquisitions,
  type OwnedAtom,
  type PathStep,
} from "@/lib/breeding";
import { resolveBoard } from "@/lib/board-compute";
import { pathToBoardGraph } from "@/lib/path-to-board";
import { useBoards } from "@/lib/board-store";
import { META, PALS, palDexLabel } from "@/lib/pal-data";
import { useOwnedPals } from "@/lib/storage";
import type { OwnedPal, Pal, PalKey } from "@/lib/types";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { PassiveBadge } from "@/components/PassiveBadge";
import { PassivePicker } from "@/components/PassivePicker";
import { PathBoardPreview } from "@/components/board/PathBoardPreview";
import { palName, useLang, useT } from "@/lib/i18n";

type Result = {
  paths: PathStep[][];
  unlockSuggestions: Pal[];
  easierSuggestions: Pal[];
  capped: boolean;
  /** Target is reachable, but no path within the searched pool used the
   * required pal — distinct from genuine unreachability. */
  requiredPalMiss: boolean;
} | null;

// When a required pal is set we can't just take the shortest N paths —
// the ones that happen to include it might be further down the list — so
// we pull a much larger pool first and filter, then cap for display.
const REQUIRED_POOL_SIZE = 300;

export default function PathPage() {
  const t = useT();
  const { lang } = useLang();
  const { pals, loaded } = useOwnedPals();
  const [target, setTarget] = useState<string | undefined>();
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxResults, setMaxResults] = useState(10);
  const [ignoreGender, setIgnoreGender] = useState(false);
  const [includeUnowned, setIncludeUnowned] = useState(false);
  const [desiredPassives, setDesiredPassives] = useState<string[]>([]);
  const [requiredPal, setRequiredPal] = useState<string | undefined>();

  const ownedKeys = useMemo<Set<PalKey>>(
    () => new Set(pals.map((p) => p.palKey)),
    [pals],
  );
  const ownedAtoms = useMemo<OwnedAtom[]>(
    () => pals.map((p) => ({ palKey: p.palKey, gender: p.gender })),
    [pals],
  );
  // With "include unowned" on, every species becomes a valid starting point
  // for the search — two Unknown-sex placeholders per species (so a
  // same-species-only pal can still pair with "itself") layered on top of
  // the real owned individuals, whose actual sex we keep using.
  const searchAtoms = useMemo<OwnedAtom[]>(() => {
    if (!includeUnowned) return ownedAtoms;
    const owned = ownedKeys;
    const extra: OwnedAtom[] = [];
    for (const p of PALS) {
      if (owned.has(p.key)) continue;
      extra.push({ palKey: p.key, gender: "Unknown" }, { palKey: p.key, gender: "Unknown" });
    }
    return [...ownedAtoms, ...extra];
  }, [includeUnowned, ownedAtoms, ownedKeys]);

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
        // Enumerate up to (maxResults + 1) so we can detect the "capped" case
        // — or a much larger pool when a required pal is set, since the
        // paths that happen to include it aren't necessarily the shortest
        // ones and could be missed by a small enumeration.
        const poolSize = requiredPal ? REQUIRED_POOL_SIZE : maxResults + 1;
        const rawPaths = allShortestPaths(searchAtoms, target, maxDepth, poolSize, {
          ignoreGender,
        });
        const paths = requiredPal
          ? rawPaths.filter((path) =>
              path.some((s) => s.parents[0].key === requiredPal || s.parents[1].key === requiredPal),
            )
          : rawPaths;
        const requiredPalMiss = !!requiredPal && rawPaths.length > 0 && paths.length === 0;
        const capped = paths.length > maxResults;
        const displayed = capped ? paths.slice(0, maxResults) : paths;

        // "Catch this pal" suggestions don't make sense once every species
        // is already being considered — if it's still unreachable there,
        // nothing left to catch would help.
        let unlockSuggestions: Pal[] = [];
        let easierSuggestions: Pal[] = [];
        if (!includeUnowned) {
          if (rawPaths.length === 0) {
            unlockSuggestions = suggestAcquisitions(ownedKeys, target, maxDepth);
          } else if (paths.length > 0 && paths[0].length > 0) {
            const shortest = paths[0].length;
            easierSuggestions = suggestAcquisitions(ownedKeys, target, shortest).filter(
              (p) => !ownedKeys.has(p.key),
            );
          }
        }
        setResult({ paths: displayed, unlockSuggestions, easierSuggestions, capped, requiredPalMiss });
      });
    }, 0);
    return () => clearTimeout(handle);
  }, [ownedKeys, searchAtoms, target, maxDepth, maxResults, ignoreGender, requiredPal, includeUnowned]);

  const computing = isPending || (target !== undefined && result === null);

  const ownedById = useMemo(() => {
    const m = new Map<string, OwnedPal>();
    for (const p of pals) m.set(p.id, p);
    return m;
  }, [pals]);

  // Per-path board graph (nodes/edges) + resolved passive/gender info, built
  // from the real owned pals so both the inline passive display and the
  // whiteboard preview/export share one computation.
  const pathGraphs = useMemo(
    () =>
      (result?.paths ?? []).map((path) => {
        if (path.length === 0) return null;
        const { nodes, edges, stepNodeIds } = pathToBoardGraph(path, pals);
        const resolutions = resolveBoard(nodes, edges, ownedById);
        return { nodes, edges, stepNodeIds, resolutions };
      }),
    [result, pals, ownedById],
  );

  // Probability the final target pal ends up with every passive the user
  // picked, using the last step's resolved passive pool. null when no
  // desired passives are selected (nothing to rank/report).
  const desiredProbs = useMemo(() => {
    if (desiredPassives.length === 0) return null;
    return (result?.paths ?? []).map((path, i) => {
      if (path.length === 0) return 0;
      const graph = pathGraphs[i];
      const r = graph?.resolutions.get(graph.stepNodeIds[path.length - 1]);
      return pInheritSet(r?.passivePool ?? [], desiredPassives);
    });
  }, [result, pathGraphs, desiredPassives]);

  // Display order: ranked by desired-passive odds (best first) when the
  // user picked a target passive combo, otherwise the original shortest-
  // path-first order. Paths that can't possibly produce the combo (0%) are
  // dropped rather than shown at the bottom — they're not a usable answer.
  const displayOrder = useMemo(() => {
    const n = result?.paths.length ?? 0;
    let order = Array.from({ length: n }, (_, i) => i);
    if (!desiredProbs) return order;
    order = order.filter((i) => desiredProbs[i] > 0);
    return order.sort((a, b) => {
      const d = desiredProbs[b] - desiredProbs[a];
      if (d !== 0) return d;
      return (result?.paths[a].length ?? 0) - (result?.paths[b].length ?? 0);
    });
  }, [result, desiredProbs]);

  const { active: activeBoard, updateBoard } = useBoards();
  const [expandedPaths, setExpandedPaths] = useState<Set<number>>(new Set());
  const [addedPaths, setAddedPaths] = useState<Set<number>>(new Set());

  function toggleExpanded(i: number) {
    setExpandedPaths((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAddToBoard(i: number, path: PathStep[]) {
    if (!activeBoard || path.length === 0) return;
    const maxY = activeBoard.nodes.reduce((m, n) => Math.max(m, n.position.y), -130);
    const minX = activeBoard.nodes.reduce(
      (m, n) => Math.min(m, n.position.x),
      activeBoard.nodes.length > 0 ? Infinity : 0,
    );
    const origin = { x: minX === Infinity ? 0 : minX, y: activeBoard.nodes.length > 0 ? maxY + 130 : 0 };
    const { nodes, edges } = pathToBoardGraph(path, pals, origin);
    updateBoard(activeBoard.id, {
      nodes: [...activeBoard.nodes, ...nodes],
      edges: [...activeBoard.edges, ...edges],
    });
    setAddedPaths((s) => new Set(s).add(i));
  }

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
        <div className="w-72">
          <label className="flex items-center justify-between text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">
            <span>{t("path.requiredPal")}</span>
            {requiredPal && (
              <button
                type="button"
                onClick={() => setRequiredPal(undefined)}
                className="underline hover:text-chillet-900 dark:hover:text-white"
              >
                {t("settings.uid.clear")}
              </button>
            )}
          </label>
          <PalPicker value={requiredPal} onChange={setRequiredPal} />
        </div>
        <div className="w-72">
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">
            {t("path.desiredPassives")}
          </label>
          <PassivePicker value={desiredPassives} onChange={setDesiredPassives} max={4} />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("path.maxDepth")}</label>
          <Select<number>
            className="w-28"
            size="sm"
            value={maxDepth}
            onChange={setMaxDepth}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: t("path.step.suffix", { n }) }))}
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
        <label className="flex items-center gap-1.5 text-xs text-chillet-700/80 dark:text-chillet-200/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeUnowned}
            onChange={(e) => setIncludeUnowned(e.target.checked)}
          />
          {t("path.includeUnowned")}
        </label>
        <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
          {includeUnowned
            ? t("path.ownedCount.all", { n: META.palCount })
            : t("path.ownedCount", { n: ownedKeys.size })}
        </div>
      </div>

      {target && computing && (
        <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-6 flex items-center gap-3">
          <Spinner />
          <div>
            <div className="text-sm font-medium">{t("path.computing")}</div>
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {includeUnowned
                ? t("path.computing.allSpecies", { n: META.palCount, d: maxDepth })
                : ownedKeys.size === 0
                  ? t("path.computing.empty", { n: META.palCount })
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
              {result.requiredPalMiss ? t("path.requiredMiss") : t("path.unreachable", { n: maxDepth })}
            </div>
          ) : displayOrder.length === 0 ? (
            <div className="rounded-lg border border-berry-300 bg-berry-300/15 dark:bg-berry-500/15 dark:border-berry-500/40 p-4 text-sm">
              {t("path.noPassiveMatch")}
            </div>
          ) : (
            <>
              <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
                {t("path.pathsFound", { n: displayOrder.length })}
                {result.capped && (
                  <span className="ml-2 text-berry-500">• {t("path.morePaths")}</span>
                )}
              </div>
              <div className="space-y-3">
                {displayOrder.map((i, rank) => {
                  const path = result.paths[i];
                  const graph = pathGraphs[i];
                  const expanded = expandedPaths.has(i);
                  const added = addedPaths.has(i);
                  const desiredProb = desiredProbs?.[i];
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="text-xs font-medium text-chillet-700 dark:text-chillet-200">
                          {t("path.pathHeader", { idx: rank + 1, n: path.length })}
                        </div>
                        {graph && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(i)}
                              className="text-xs px-2 py-1 rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
                            >
                              {expanded ? t("path.hideBoard") : t("path.viewBoard")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToBoard(i, path)}
                              disabled={added}
                              className="text-xs px-2 py-1 rounded-md bg-chillet-500 text-white hover:bg-chillet-600 disabled:opacity-60 disabled:cursor-default"
                            >
                              {added ? t("path.added") : t("path.addToBoard")}
                            </button>
                          </div>
                        )}
                      </div>
                      {desiredProb != null && (
                        <div
                          className={`mb-3 text-xs flex flex-wrap items-center gap-1.5 ${
                            desiredProb > 0
                              ? "text-mint-700 dark:text-mint-300"
                              : "text-berry-500 dark:text-berry-300"
                          }`}
                        >
                          <span className="font-medium">
                            {t("path.desiredProb", { p: (desiredProb * 100).toFixed(1) })}
                          </span>
                          <span className="flex flex-wrap gap-1">
                            {desiredPassives.map((p) => (
                              <PassiveBadge key={p} name={p} />
                            ))}
                          </span>
                        </div>
                      )}
                      <ol className="space-y-2">
                        {path.map((s, j) => {
                          const r = graph?.resolutions.get(graph.stepNodeIds[j]);
                          const top = (r?.perPassiveProb ?? []).slice(0, 4);
                          return (
                            <li key={j} className="border-l-2 border-mint-500 pl-3">
                              <div className="flex items-center flex-wrap gap-1.5 text-sm">
                                <span className="text-chillet-700/70 dark:text-chillet-200/60 w-6">{j + 1}.</span>
                                <ParentTag pal={s.parents[0]} lang={lang} highlighted={s.parents[0].key === requiredPal} />
                                <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                                <ParentTag pal={s.parents[1]} lang={lang} highlighted={s.parents[1].key === requiredPal} />
                                <span className="text-chillet-500/60 dark:text-chillet-300/40 mx-1">→</span>
                                <PalAvatar pal={s.child} size={24} />
                                <span className="font-medium">{palName(s.child, lang)}</span>
                                {j === path.length - 1 && (
                                  <PalInfoLink pal={s.child} className="ml-1" />
                                )}
                              </div>
                              {top.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  {top.map((p) => (
                                    <span key={p.name} className="flex items-center gap-1">
                                      <PassiveBadge
                                        name={p.name}
                                        className={
                                          desiredPassives.includes(p.name)
                                            ? "ring-2 ring-mint-500"
                                            : ""
                                        }
                                      />
                                      <span className="text-[11px] text-chillet-700/70 dark:text-chillet-200/60">
                                        {(p.prob * 100).toFixed(0)}%
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      {graph && expanded && (
                        <div className="mt-3">
                          <PathBoardPreview
                            nodes={graph.nodes}
                            edges={graph.edges}
                            ownedById={ownedById}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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

function ParentTag({ pal, lang, highlighted }: { pal: Pal; lang: ReturnType<typeof useLang>["lang"]; highlighted: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        highlighted ? "rounded-full ring-2 ring-chillet-500 pl-0.5 pr-2 py-0.5" : ""
      }`}
    >
      <PalAvatar pal={pal} size={24} />
      <span
        className={
          highlighted
            ? "font-semibold text-chillet-700 dark:text-chillet-200"
            : "text-chillet-800 dark:text-chillet-100"
        }
      >
        {palName(pal, lang)}
      </span>
    </span>
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
