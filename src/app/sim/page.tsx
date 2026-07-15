"use client";

import { useMemo } from "react";
import { PalPicker } from "@/components/PalPicker";
import {
  combine,
  maleProbability,
  pInheritSubset,
  partnerParentsFor,
  parentsOf,
} from "@/lib/breeding";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { PassivePicker } from "@/components/PassivePicker";
import { PassiveBadge } from "@/components/PassiveBadge";
import { palName, passiveName, useLang, useT } from "@/lib/i18n";
import { passiveByName } from "@/lib/passives";
import { usePersistentState } from "@/lib/persistent-state";

export default function SimPage() {
  const t = useT();
  const { lang } = useLang();
  const [aKey, setAKey] = usePersistentState<string | undefined>("palboard.ui.sim.aKey", undefined);
  const [bKey, setBKey] = usePersistentState<string | undefined>("palboard.ui.sim.bKey", undefined);
  const [aPassives, setAPassives] = usePersistentState<string[]>("palboard.ui.sim.aPassives", []);
  const [bPassives, setBPassives] = usePersistentState<string[]>("palboard.ui.sim.bPassives", []);
  const [partnerParent, setPartnerParent] = usePersistentState<string | undefined>("palboard.ui.sim.partnerParent", undefined);
  const [partnerChild, setPartnerChild] = usePersistentState<string | undefined>("palboard.ui.sim.partnerChild", undefined);
  const [reverseTarget, setReverseTarget] = usePersistentState<string | undefined>("palboard.ui.sim.reverseTarget", undefined);

  const child = useMemo(() => (aKey && bKey ? combine(aKey, bKey) : null), [aKey, bKey]);

  const parentalPool = useMemo(
    () => Array.from(new Set([...aPassives, ...bPassives])),
    [aPassives, bPassives],
  );

  const passiveTable = useMemo(() => {
    const N = parentalPool.length;
    const rows: { k: number; pmf: number }[] = [];
    for (let k = 1; k <= Math.min(4, N); k++) {
      rows.push({ k, pmf: probExactInherited(N, k) });
    }
    return { N, rows };
  }, [parentalPool.length]);

  const reverseParents = useMemo(
    () => (reverseTarget ? parentsOf(reverseTarget) : []),
    [reverseTarget],
  );
  const partnerParents = useMemo(
    () => (partnerParent && partnerChild ? partnerParentsFor(partnerParent, partnerChild) : []),
    [partnerParent, partnerChild],
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">{t("sim.title")}</h1>
        <p className="text-sm text-chillet-700/70 dark:text-chillet-200/60">{t("sim.subtitle")}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <ParentCard
            label={t("sim.parentA")}
            palKey={aKey}
            onChange={setAKey}
            passives={aPassives}
            setPassives={setAPassives}
          />
          <ParentCard
            label={t("sim.parentB")}
            palKey={bKey}
            onChange={setBKey}
            passives={bPassives}
            setPassives={setBPassives}
          />
        </div>

        <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("sim.result")}</div>
          {child ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <PalAvatar pal={child} size={56} />
                <div>
                  <div className="text-2xl font-semibold flex items-center gap-2">
                    {palDexLabel(child)} {palName(child, lang)}
                    <PalInfoLink pal={child} variant="button" />
                  </div>
                  <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
                    {lang === "ko" ? `${child.name} · ` : ""}
                    {t("sim.bp")} {child.breedingPower} · {t("sim.rarity")} {child.rarity}
                    {child.variant && ` · ${t("common.variant")}`}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div>{t("sim.male", { p: (maleProbability(child) * 100).toFixed(1) })}</div>
                <div>{t("sim.female", { p: ((1 - maleProbability(child)) * 100).toFixed(1) })}</div>
              </div>
            </div>
          ) : (
            <div className="text-chillet-700/70 dark:text-chillet-200/60 text-sm">{t("sim.pickBoth")}</div>
          )}
        </div>

        {child && parentalPool.length > 0 && (
          <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
            <div className="text-sm font-medium mb-2">{t("sim.passive.title")}</div>
            <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>{t("sim.passive.pool", { n: parentalPool.length })}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-2">
                {parentalPool.map((p) => (
                  <PassiveBadge key={p} name={p} />
                ))}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-chillet-700/70 dark:text-chillet-200/60">
                <tr>
                  <th className="text-left py-1">{t("sim.passive.event")}</th>
                  <th className="text-right py-1">{t("sim.passive.prob")}</th>
                </tr>
              </thead>
              <tbody>
                {passiveTable.rows.map((r) => (
                  <tr key={r.k} className="border-t border-chillet-100 dark:border-chillet-800/40">
                    <td className="py-1.5">{t("sim.passive.exactly", { k: r.k })}</td>
                    <td className="text-right py-1.5">{(r.pmf * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {parentalPool.map((p) => (
                  <tr key={p} className="border-t border-chillet-100 dark:border-chillet-800/40">
                    <td className="py-1.5">
                      <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1">└</span>
                      {t("sim.passive.inheritOne", { name: passiveName(passiveByName(p), lang, p) })}
                    </td>
                    <td className="text-right py-1.5">
                      {(pInheritSubset(parentalPool.length, 1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-xs text-chillet-700/70 dark:text-chillet-200/60">
              {t("sim.passive.note")}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("sim.partner.title")}</h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          <div>
            <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">
              {t("sim.partner.parent")}
            </label>
            <PalPicker
              value={partnerParent}
              onChange={setPartnerParent}
              placeholder={t("sim.partner.parent")}
            />
          </div>
          <div>
            <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">
              {t("sim.partner.child")}
            </label>
            <PalPicker
              value={partnerChild}
              onChange={setPartnerChild}
              placeholder={t("sim.partner.child")}
            />
          </div>
        </div>

        {(partnerParent || partnerChild) && !(partnerParent && partnerChild) && (
          <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
            {t("sim.partner.pickBoth")}
          </div>
        )}

        {partnerParent && partnerChild && (
          <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
            {partnerParents.length > 0 ? (
              <>
                <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60 mb-2">
                  {t("sim.partner.count", { n: partnerParents.length })}
                </div>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1 text-sm max-h-96 overflow-y-auto">
                  {partnerParents.slice(0, 200).map((p) => (
                    <li
                      key={p.key}
                      className="px-2 py-1 rounded hover:bg-chillet-100 dark:hover:bg-chillet-800/50 flex items-center gap-1.5 min-w-0"
                    >
                      <PalAvatar pal={p} size={20} />
                      <span className="truncate min-w-0 flex-1">
                        <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1">
                          {palDexLabel(p)}
                        </span>
                        {palName(p, lang)}
                      </span>
                      <span className="text-xs text-chillet-500/70 dark:text-chillet-300/50 shrink-0">
                        BP {p.breedingPower}
                      </span>
                      <PalInfoLink pal={p} />
                    </li>
                  ))}
                </ul>
                {partnerParents.length > 200 && (
                  <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mt-2">
                    {t("sim.partner.cap")}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60">
                {t("sim.partner.none")}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("sim.reverse.title")}</h2>
        <div className="max-w-sm">
          <PalPicker
            value={reverseTarget}
            onChange={setReverseTarget}
            placeholder={t("sim.reverse.target")}
          />
        </div>
        {reverseTarget && (
          <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4">
            <div className="text-sm text-chillet-700/70 dark:text-chillet-200/60 mb-2">
              {t("sim.reverse.count", { n: reverseParents.length })}
            </div>
            <ul className="grid sm:grid-cols-2 gap-1 text-sm max-h-96 overflow-y-auto">
              {reverseParents.slice(0, 200).map(([a, b], i) => (
                <li
                  key={i}
                  className="px-2 py-1 rounded hover:bg-chillet-100 dark:hover:bg-chillet-800/50 flex items-center gap-1.5"
                >
                  <PalAvatar pal={a} size={20} />
                  <span className="text-chillet-700/70 dark:text-chillet-200/60">{palName(a, lang)}</span>
                  <span className="text-chillet-500/60 dark:text-chillet-300/40">×</span>
                  <PalAvatar pal={b} size={20} />
                  <span className="text-chillet-700/70 dark:text-chillet-200/60">{palName(b, lang)}</span>
                </li>
              ))}
            </ul>
            {reverseParents.length > 200 && (
              <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60 mt-2">{t("sim.reverse.cap")}</div>
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
  const t = useT();
  const pal = palKey ? palByKey(palKey) : null;
  return (
    <div className="rounded-lg border border-chillet-200/70 dark:border-chillet-800/60 bg-white dark:bg-chillet-900 p-4 space-y-2">
      <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">{label}</div>
      <PalPicker value={palKey} onChange={onChange} />
      {pal && (
        <div className="flex items-center justify-between gap-2 text-xs text-chillet-700/70 dark:text-chillet-200/60">
          <span>
            {t("sim.bp")} {pal.breedingPower} · {pal.elements.join("/") || "—"}
          </span>
          <PalInfoLink pal={pal} variant="button" />
        </div>
      )}
      <PassivePicker value={passives} onChange={setPassives} max={4} />
    </div>
  );
}

const SLOT_PMF = [0.4, 0.3, 0.2, 0.1];
function probExactInherited(N: number, k: number): number {
  if (k > N) return 0;
  if (k === N) {
    let p = SLOT_PMF[k - 1] ?? 0;
    for (let x = N + 1; x <= 4; x++) p += SLOT_PMF[x - 1] ?? 0;
    return p;
  }
  return SLOT_PMF[k - 1] ?? 0;
}
