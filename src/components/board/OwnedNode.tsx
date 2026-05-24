"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { PalAvatar } from "@/components/PalAvatar";
import { PassiveBadge } from "@/components/PassiveBadge";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { palName, useLang } from "@/lib/i18n";
import type { OwnedPal } from "@/lib/types";

export interface OwnedNodeData extends Record<string, unknown> {
  ownedPal: OwnedPal;
}

function OwnedNodeBase({ data }: NodeProps) {
  const { lang } = useLang();
  const op = (data as OwnedNodeData).ownedPal;
  const pal = palByKey(op.palKey);
  return (
    <div className="rounded-xl border border-chillet-300 dark:border-chillet-700 bg-white dark:bg-chillet-900 shadow-md shadow-chillet-500/15 px-3 py-2 min-w-[200px] max-w-[260px]">
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-chillet-500 !border-2 !border-white dark:!border-chillet-900 hover:!bg-chillet-400 transition-colors"
      />
      <div className="flex items-center gap-2">
        {pal && <PalAvatar pal={pal} size={36} />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {op.nickname || (pal ? palName(pal, lang) : "?")}
          </div>
          <div className="text-[11px] text-chillet-700/70 dark:text-chillet-200/60 truncate">
            {pal ? `${palDexLabel(pal)} ${palName(pal, lang)}` : "?"}
            {" · "}
            {op.gender === "Male" ? "♂" : op.gender === "Female" ? "♀" : "?"}
            {op.level ? ` · Lv ${op.level}` : ""}
          </div>
        </div>
      </div>
      {op.passives.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {op.passives.map((n) => (
            <PassiveBadge key={n} name={n} />
          ))}
        </div>
      )}
    </div>
  );
}

export const OwnedNode = memo(OwnedNodeBase, (prev, next) => {
  const a = (prev.data as OwnedNodeData).ownedPal;
  const b = (next.data as OwnedNodeData).ownedPal;
  if (!a || !b) return a === b;
  // Cheap field-by-field equality. Passives compared by stringified value.
  return (
    a.id === b.id &&
    a.palKey === b.palKey &&
    a.nickname === b.nickname &&
    a.gender === b.gender &&
    a.level === b.level &&
    a.passives.length === b.passives.length &&
    a.passives.every((p, i) => p === b.passives[i]) &&
    prev.selected === next.selected &&
    prev.dragging === next.dragging
  );
});
