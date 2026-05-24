"use client";

import { useMemo, useState } from "react";
import { PalPicker } from "@/components/PalPicker";
import {
  combine,
  maleProbability,
  pInheritSubset,
  parentsOf,
} from "@/lib/breeding";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { PassivePicker } from "@/components/PassivePicker";

export default function SimPage() {
  const [aKey, setAKey] = useState<string | undefined>();
  const [bKey, setBKey] = useState<string | undefined>();
  const [aPassives, setAPassives] = useState<string[]>([]);
  const [bPassives, setBPassives] = useState<string[]>([]);
  const [reverseTarget, setReverseTarget] = useState<string | undefined>();

  const child = useMemo(() => (aKey && bKey ? combine(aKey, bKey) : null), [aKey, bKey]);

  const parentalPool = useMemo(
    () => Array.from(new Set([...aPassives, ...bPassives])),
    [aPassives, bPassives],
  );

  const passiveTable = useMemo(() => {
    const N = parentalPool.length;
    const rows: { label: string; pmf: number }[] = [];
    for (let k = 1; k <= Math.min(4, N); k++) {
      rows.push({ label: `정확히 ${k}개 상속`, pmf: probExactInherited(N, k) });
    }
    return { N, rows };
  }, [parentalPool.length]);

  const reverseParents = useMemo(
    () => (reverseTarget ? parentsOf(reverseTarget) : []),
    [reverseTarget],
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">교배 시뮬레이션</h1>
        <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
          두 부모를 선택하면 자식 종 / 성별 확률 / 패시브 상속 확률을 계산합니다.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <ParentCard
            label="부모 A"
            palKey={aKey}
            onChange={setAKey}
            passives={aPassives}
            setPassives={setAPassives}
          />
          <ParentCard
            label="부모 B"
            palKey={bKey}
            onChange={setBKey}
            passives={bPassives}
            setPassives={setBPassives}
          />
        </div>

        <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">결과</div>
          {child ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <PalAvatar pal={child} size={56} />
                <div>
                  <div className="text-2xl font-semibold flex items-center gap-2">
                    {palDexLabel(child)} {child.nameKo}
                    <PalInfoLink pal={child} variant="button" />
                  </div>
                  <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
                    {child.name} · BP {child.breedingPower} · 희귀도 {child.rarity}
                    {child.variant && " · 변종"}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div>♂ 수컷 확률 {(maleProbability(child) * 100).toFixed(1)}%</div>
                <div>♀ 암컷 확률 {((1 - maleProbability(child)) * 100).toFixed(1)}%</div>
              </div>
            </div>
          ) : (
            <div className="text-chillet-700/70 dark:text-chillet-200/60 text-sm">두 부모를 선택하세요.</div>
          )}
        </div>

        {child && parentalPool.length > 0 && (
          <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
            <div className="text-sm font-medium mb-2">패시브 상속 확률</div>
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-3">
              부모의 합집합 패시브 풀: {parentalPool.length}개 — {parentalPool.join(", ")}
            </div>
            <table className="w-full text-sm">
              <thead className="text-chillet-700/70 dark:text-chillet-200/60">
                <tr>
                  <th className="text-left py-1">사건</th>
                  <th className="text-right py-1">확률</th>
                </tr>
              </thead>
              <tbody>
                {passiveTable.rows.map((r) => (
                  <tr key={r.label} className="border-t border-chillet-100 dark:border-chillet-800/40">
                    <td className="py-1.5">{r.label}</td>
                    <td className="text-right py-1.5">{(r.pmf * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {parentalPool.map((p) => (
                  <tr key={p} className="border-t border-chillet-100 dark:border-chillet-800/40">
                    <td className="py-1.5">
                      <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1">└</span>「{p}」 상속
                    </td>
                    <td className="text-right py-1.5">
                      {(pInheritSubset(parentalPool.length, 1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-xs text-chillet-700/70 dark:text-chillet-200/60">
              위 수치는 부모 풀에서 상속받는 슬롯에 한정합니다. 별도로 추가되는 무작위 패시브는
              포함하지 않으며, 「슬롯 PMF」: 1→40%, 2→30%, 3→20%, 4→10%.
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">역추적 — 어떤 부모 조합이 이 팰을 만드는가</h2>
        <div className="max-w-sm">
          <PalPicker value={reverseTarget} onChange={setReverseTarget} placeholder="목표 팰 선택" />
        </div>
        {reverseTarget && (
          <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
            <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60 mb-2">
              총 {reverseParents.length}개 조합으로 만들 수 있습니다.
            </div>
            <ul className="grid sm:grid-cols-2 gap-1 text-sm max-h-96 overflow-y-auto">
              {reverseParents.slice(0, 200).map(([a, b], i) => (
                <li
                  key={i}
                  className="px-2 py-1 rounded hover:bg-chillet-100 dark:hover:bg-chillet-800/50 flex items-center gap-1.5"
                >
                  <PalAvatar pal={a} size={20} />
                  <span className="text-chillet-700/70 dark:text-chillet-200/60">{a.nameKo}</span>
                  <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                  <PalAvatar pal={b} size={20} />
                  <span className="text-chillet-700/70 dark:text-chillet-200/60">{b.nameKo}</span>
                </li>
              ))}
            </ul>
            {reverseParents.length > 200 && (
              <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mt-2">처음 200개만 표시</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ParentCard({
  label,
  palKey,
  onChange,
  passives,
  setPassives,
}: {
  label: string;
  palKey: string | undefined;
  onChange: (k: string) => void;
  passives: string[];
  setPassives: (v: string[]) => void;
}) {
  const pal = palKey ? palByKey(palKey) : null;
  return (
    <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4 space-y-2">
      <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">{label}</div>
      <PalPicker value={palKey} onChange={onChange} />
      {pal && (
        <div className="flex items-center justify-between gap-2 text-xs text-chillet-700/70 dark:text-chillet-200/60">
          <span>BP {pal.breedingPower} · {pal.elements.join("/") || "—"}</span>
          <PalInfoLink pal={pal} variant="button" />
        </div>
      )}
      <PassivePicker value={passives} onChange={setPassives} max={4} />
    </div>
  );
}

const SLOT_PMF = [0.4, 0.3, 0.2, 0.1];
function probExactInherited(N: number, k: number): number {
  // P(X >= k and chosen subset of size k matches a specific subset?)
  // Here we report the marginal: P(child has exactly k passives from pool, ignoring random fills).
  // That is just P(X = k) when k <= N, plus PMF mass for X > N collapsing to N.
  if (k > N) return 0;
  if (k === N) {
    let p = SLOT_PMF[k - 1] ?? 0;
    for (let x = N + 1; x <= 4; x++) p += SLOT_PMF[x - 1] ?? 0;
    return p;
  }
  return SLOT_PMF[k - 1] ?? 0;
}
