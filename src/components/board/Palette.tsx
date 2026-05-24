"use client";

import { useMemo, useState } from "react";
import { PalAvatar } from "@/components/PalAvatar";
import { Select } from "@/components/Select";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { palName, useLang, useT } from "@/lib/i18n";
import type { OwnedPal, World } from "@/lib/types";

interface Props {
  pals: OwnedPal[];
  worlds: World[];
  worldId: string | null;
  onChangeWorld: (id: string | null) => void;
}

export function Palette({ pals, worlds, worldId, onChangeWorld }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = pals;
    if (worldId) list = list.filter((p) => p.worldId === worldId);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((op) => {
        const pal = palByKey(op.palKey);
        return (
          pal?.nameKo.includes(q) ||
          pal?.name.toLowerCase().includes(query) ||
          (op.nickname ?? "").toLowerCase().includes(query)
        );
      });
    }
    return list;
  }, [pals, worldId, q]);

  function onDragStart(e: React.DragEvent, op: OwnedPal) {
    e.dataTransfer.setData("application/x-palboard-owned", op.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <aside className="w-[300px] shrink-0 border-r border-chillet-200/70 dark:border-chillet-800/60 bg-white/60 dark:bg-chillet-950/40 flex flex-col h-full">
      <div className="p-3 space-y-2 border-b border-chillet-200/70 dark:border-chillet-800/60">
        <Select<string>
          size="sm"
          value={worldId ?? "__all"}
          onChange={(v) => onChangeWorld(v === "__all" ? null : v)}
          options={[
            { value: "__all", label: t("board.paletteFilter.all") },
            ...worlds.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("board.palette.search")}
          className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 && (
          <div className="px-2 py-4 text-xs text-chillet-700/70 dark:text-chillet-200/60 text-center">
            {t("board.palette.empty")}
          </div>
        )}
        {filtered.map((op) => {
          const pal = palByKey(op.palKey);
          return (
            <div
              key={op.id}
              draggable
              onDragStart={(e) => onDragStart(e, op)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-chillet-200/70 dark:border-chillet-800/60 bg-white/70 dark:bg-chillet-900/40 hover:border-chillet-400 hover:shadow-sm cursor-grab active:cursor-grabbing"
            >
              {pal && <PalAvatar pal={pal} size={28} />}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">
                  {op.nickname || (pal ? palName(pal, lang) : "?")}
                </div>
                <div className="text-[10px] text-chillet-700/70 dark:text-chillet-200/60 truncate">
                  {pal ? `${palDexLabel(pal)} ${palName(pal, lang)}` : ""}
                  {" · "}
                  {op.gender === "Male" ? "♂" : op.gender === "Female" ? "♀" : "?"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
