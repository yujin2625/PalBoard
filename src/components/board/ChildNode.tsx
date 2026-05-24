"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PalAvatar } from "@/components/PalAvatar";
import { PassiveBadge } from "@/components/PassiveBadge";
import { palDexLabel } from "@/lib/pal-data";
import { palName, useLang, useT } from "@/lib/i18n";
import type { ChildResolution } from "@/lib/board-compute";

export interface ChildNodeData extends Record<string, unknown> {
  resolution: ChildResolution | null;
  topN: number;
  committed: boolean;
  onCommit?: () => void;
}

function ChildNodeBase({ data }: NodeProps) {
  const { lang } = useLang();
  const t = useT();
  const d = data as ChildNodeData;
  const r = d.resolution;
  const child = r?.child ?? null;
  const top = (r?.perPassiveProb ?? []).slice(0, d.topN);

  return (
    <div className="rounded-xl border-2 border-dashed border-mint-500/70 bg-mint-300/15 dark:bg-mint-700/15 backdrop-blur-sm px-3 py-2 min-w-[220px] max-w-[280px] shadow-md shadow-mint-500/20">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-mint-500 !border-2 !border-white dark:!border-chillet-900 hover:!bg-mint-400 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-mint-500 !border-2 !border-white dark:!border-chillet-900 hover:!bg-mint-400 transition-colors"
      />
      <div className="text-[10px] uppercase tracking-wider text-mint-700 dark:text-mint-300 mb-1 flex items-center justify-between">
        <span>{t("board.node.child")}</span>
        {d.committed && (
          <span className="text-[10px] text-chillet-700/70 dark:text-chillet-200/60">✓</span>
        )}
      </div>
      {child ? (
        <>
          <div className="flex items-center gap-2">
            <PalAvatar pal={child} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {palDexLabel(child)} {palName(child, lang)}
              </div>
              <div className="text-[11px] text-chillet-700/70 dark:text-chillet-200/60 truncate">
                BP {child.breedingPower}
                {r?.malePct != null &&
                  ` · ${t("board.node.maleProb", { p: r.malePct.toFixed(0) })} / ${t("board.node.femaleProb", { p: (100 - r.malePct).toFixed(0) })}`}
              </div>
            </div>
          </div>
          {top.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] text-chillet-700/70 dark:text-chillet-200/60 mb-1">
                {t("board.node.passivesHeader", { n: d.topN })}
              </div>
              <div className="flex flex-col gap-1">
                {top.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <PassiveBadge name={p.name} className="shrink-0" />
                    <span className="text-[11px] text-chillet-700/80 dark:text-chillet-200/70 ml-auto">
                      {(p.prob * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {d.onCommit && !d.committed && (
            <button
              type="button"
              onClick={d.onCommit}
              className="mt-2 w-full text-xs px-2 py-1 rounded-md bg-chillet-500 text-white hover:bg-chillet-600"
            >
              {t("board.commit")}
            </button>
          )}
        </>
      ) : (
        <div
          className={`text-xs py-2 ${
            r?.sameSex
              ? "text-berry-500 dark:text-berry-300 font-medium"
              : "text-chillet-700/70 dark:text-chillet-200/60"
          }`}
        >
          {r?.sameSex
            ? t("board.node.sameSex")
            : r?.parentNodeIds
              ? t("board.node.unknown")
              : t("board.node.needTwoParents")}
        </div>
      )}
    </div>
  );
}

export const ChildNode = memo(ChildNodeBase, (prev, next) => {
  const a = prev.data as ChildNodeData;
  const b = next.data as ChildNodeData;
  if (a.topN !== b.topN) return false;
  if (a.committed !== b.committed) return false;
  if (!!a.onCommit !== !!b.onCommit) return false;
  if (prev.selected !== next.selected || prev.dragging !== next.dragging) return false;
  const ra = a.resolution;
  const rb = b.resolution;
  if (!ra && !rb) return true;
  if (!ra || !rb) return false;
  if (ra.child?.key !== rb.child?.key) return false;
  if (ra.malePct !== rb.malePct) return false;
  if (ra.sameSex !== rb.sameSex) return false;
  if (ra.perPassiveProb.length !== rb.perPassiveProb.length) return false;
  for (let i = 0; i < ra.perPassiveProb.length; i++) {
    const x = ra.perPassiveProb[i];
    const y = rb.perPassiveProb[i];
    if (x.name !== y.name || x.prob !== y.prob) return false;
  }
  return true;
});
