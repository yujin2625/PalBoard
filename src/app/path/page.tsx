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

type Result = {
  path: PathStep[] | null;
  unlockSuggestions: Pal[];
  easierSuggestions: Pal[];
} | null;

export default function PathPage() {
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
    // Yield to the browser so the loading state can paint before the heavy
    // compute monopolises the main thread.
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

  if (!loaded) return <div className="text-chillet-700/70 dark:text-chillet-200/60">불러오는 중…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">교배 경로 찾기</h1>
      <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
        등록된 모든 보유 팰의 종을 기준으로 최단 경로를 계산합니다. 깊이 {maxDepth}까지 탐색합니다.
      </p>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-72">
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">목표 팰</label>
          <PalPicker value={target} onChange={setTarget} placeholder="목표 팰 선택" />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">최대 깊이</label>
          <Select<number>
            className="w-28"
            size="sm"
            value={maxDepth}
            onChange={setMaxDepth}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} 스텝` }))}
          />
        </div>
        <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">보유 종 수: {ownedKeys.size}종</div>
      </div>

      {target && computing && (
        <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-6 flex items-center gap-3">
          <Spinner />
          <div>
            <div className="text-sm font-medium">계산 중…</div>
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {ownedKeys.size === 0
                ? "보유 팰이 없어 모든 종(227종)에 대해 추천 경로를 탐색합니다. 잠시만 기다려 주세요."
                : `보유 ${ownedKeys.size}종을 기준으로 깊이 ${maxDepth}까지 BFS 탐색 중`}
            </div>
          </div>
        </div>
      )}

      {target && !computing && result && (
        <div className="space-y-4">
          {result.path === null ? (
            <div className="rounded-lg border border-berry-300 bg-berry-300/15 dark:bg-berry-500/15 dark:border-berry-500/40 p-4 text-sm">
              {maxDepth} 스텝 이내로 만들 수 없습니다. 깊이를 늘리거나 아래 추천 팰을 잡아 보세요.
            </div>
          ) : result.path.length === 0 ? (
            <div className="rounded-lg border border-mint-300 bg-mint-300/15 dark:bg-mint-700/20 dark:border-mint-700/60 p-4 text-sm">
              이미 보유 중입니다.
            </div>
          ) : (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-3">{result.path.length} 스텝 경로</div>
              <ol className="space-y-2">
                {result.path.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center flex-wrap gap-1.5 text-sm border-l-2 border-mint-500 pl-3"
                  >
                    <span className="text-chillet-700/70 dark:text-chillet-200/60 w-6">{i + 1}.</span>
                    <PalAvatar pal={s.parents[0]} size={24} />
                    <span className="text-chillet-800 dark:text-chillet-100">{s.parents[0].nameKo}</span>
                    <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                    <PalAvatar pal={s.parents[1]} size={24} />
                    <span className="text-chillet-800 dark:text-chillet-100">{s.parents[1].nameKo}</span>
                    <span className="text-chillet-500/60 dark:text-chillet-300/40 mx-1">→</span>
                    <PalAvatar pal={s.child} size={24} />
                    <span className="font-medium">{s.child.nameKo}</span>
                    <PalInfoLink pal={s.child} className="ml-1" />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.unlockSuggestions.length > 0 && (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-2">
                필요한 추가 팰 (잡으면 {maxDepth} 스텝 내 달성 가능)
              </div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {result.unlockSuggestions.map((p) => (
                  <li
                    key={p.key}
                    className="px-2 py-1 rounded-md bg-chillet-50 dark:bg-chillet-800/40 flex items-center gap-1.5"
                  >
                    <PalAvatar pal={p} size={20} />
                    {palDexLabel(p)} {p.nameKo}
                    <PalInfoLink pal={p} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.easierSuggestions.length > 0 && (
            <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
              <div className="text-sm font-medium mb-2">추가로 잡으면 경로가 더 짧아지는 팰</div>
              <ul className="flex flex-wrap gap-2 text-sm">
                {result.easierSuggestions.map((p) => (
                  <li
                    key={p.key}
                    className="px-2 py-1 rounded-md bg-chillet-100/60 dark:bg-chillet-800/40 border border-chillet-300/60 dark:border-chillet-700/60 flex items-center gap-1.5"
                  >
                    <PalAvatar pal={p} size={20} />
                    {palDexLabel(p)} {p.nameKo}
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
