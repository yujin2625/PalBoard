"use client";

import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import { PalPicker } from "@/components/PalPicker";
import { Select } from "@/components/Select";
import { PassivePicker } from "@/components/PassivePicker";
import { palByKey, palDexLabel } from "@/lib/pal-data";
import { PalAvatar } from "@/components/PalAvatar";
import { PalInfoLink } from "@/components/PalInfoLink";
import { PassiveBadge } from "@/components/PassiveBadge";
import {
  exportAll,
  importAll,
  useOwnedPals,
  useWorlds,
} from "@/lib/storage";
import type { Gender, OwnedPal } from "@/lib/types";
import { palName, useLang, useT } from "@/lib/i18n";

const GENDERS: Gender[] = ["Male", "Female", "Unknown"];

export default function OwnedPalsPage() {
  const t = useT();
  const { lang } = useLang();
  const { worlds, activeId, setActive, addWorld, renameWorld, removeWorld } = useWorlds();
  const { pals, loaded, addPal, updatePal, removePals } = useOwnedPals();

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<"createdAt" | "name" | "level">("createdAt");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? pals.find((p) => p.id === editingId) ?? null : null;

  const filtered = useMemo(() => {
    const list = pals.filter((p) => p.worldId === activeId);
    const q = filter.trim().toLowerCase();
    const matched = q
      ? list.filter((op) => {
          const pal = palByKey(op.palKey);
          return (
            pal?.nameKo.includes(filter) ||
            pal?.name.toLowerCase().includes(q) ||
            (op.nickname ?? "").toLowerCase().includes(q) ||
            op.passives.some((s) => s.toLowerCase().includes(q))
          );
        })
      : list;
    return [...matched].sort((a, b) => {
      if (sortKey === "createdAt") return b.createdAt - a.createdAt;
      if (sortKey === "level") return (b.level ?? 0) - (a.level ?? 0);
      const an = palName(palByKey(a.palKey), lang);
      const bn = palName(palByKey(b.palKey), lang);
      return an.localeCompare(bn);
    });
  }, [pals, activeId, filter, sortKey, lang]);

  const fileInput = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `palboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    try {
      const res = importAll(text);
      alert(t("home.import.success", { worlds: res.worlds, pals: res.pals, boards: res.boards }));
      window.location.reload();
    } catch {
      alert(t("home.import.error"));
    }
  }

  if (!loaded) return <div className="text-chillet-700/70 dark:text-chillet-200/60">{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-chillet-200/70 dark:border-chillet-800/60 bg-gradient-to-br from-chillet-100 via-white to-mint-300/30 dark:from-chillet-900/60 dark:via-chillet-950 dark:to-chillet-800/40 px-6 py-6 sm:px-8 sm:py-7 shadow-sm">
        <div className="absolute -right-6 -bottom-10 w-48 h-48 sm:w-60 sm:h-60 opacity-90 pointer-events-none">
          <Image
            src="/pals/Chillet.png"
            alt=""
            fill
            sizes="240px"
            className="object-contain drop-shadow-[0_8px_22px_rgba(45,144,201,0.35)]"
          />
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-mint-300/20 blur-3xl" />
        <div className="relative max-w-xl">
          <div className="text-xs uppercase tracking-widest text-chillet-600 dark:text-chillet-300 mb-1">
            {t("home.kicker")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-chillet-900 dark:text-chillet-50">
            {t("home.title")}
          </h1>
          <p className="mt-2 text-sm text-chillet-700/80 dark:text-chillet-200/70">
            {t("home.subtitle")}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-chillet-700/70 dark:text-chillet-200/60">
            <span>{t("home.stats.registered", { n: pals.length })}</span>
            <span>·</span>
            <span>{t("home.stats.worlds", { n: worlds.length })}</span>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        {worlds.map((w) => (
          <button
            key={w.id}
            onClick={() => setActive(w.id)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
              activeId === w.id
                ? "bg-gradient-to-br from-chillet-500 to-chillet-700 text-white border-transparent shadow-sm shadow-chillet-500/40"
                : "border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
            }`}
          >
            {w.name}
          </button>
        ))}
        <button
          onClick={() => {
            const name = prompt(t("home.world.promptNew"));
            if (name) addWorld(name);
          }}
          className="px-2 py-1.5 rounded-md text-sm border border-dashed border-chillet-400/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
        >
          {t("home.world.add")}
        </button>
        <button
          onClick={() => {
            const cur = worlds.find((w) => w.id === activeId);
            if (!cur) return;
            const name = prompt(t("home.world.promptRename"), cur.name);
            if (name) renameWorld(cur.id, name);
          }}
          className="text-xs text-chillet-700/70 dark:text-chillet-200/60 underline ml-2"
        >
          {t("common.rename")}
        </button>
        <button
          onClick={() => {
            if (worlds.length <= 1) return alert(t("home.world.deleteLast"));
            if (confirm(t("home.world.confirmDelete"))) removeWorld(activeId);
          }}
          className="text-xs text-red-600 underline"
        >
          {t("home.world.delete")}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            {t("common.export")}
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            {t("common.import")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("home.filter.placeholder")}
          className="rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-1.5 text-sm"
        />
        <Select<"createdAt" | "name" | "level">
          className="w-36"
          size="sm"
          value={sortKey}
          onChange={setSortKey}
          options={[
            { value: "createdAt", label: t("home.sort.registered") },
            { value: "name", label: t("home.sort.name") },
            { value: "level", label: t("home.sort.level") },
          ]}
        />
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600"
        >
          {t("home.add")}
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => {
              if (confirm(t("home.bulkDelete.confirm", { n: selected.size }))) {
                removePals([...selected]);
                setSelected(new Set());
              }
            }}
            className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
          >
            {t("home.bulkDelete", { n: selected.size })}
          </button>
        )}
      </div>

      {adding && (
        <PalForm
          mode="add"
          worldId={activeId}
          onCancel={() => setAdding(false)}
          onSubmit={(p) => {
            addPal(p);
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <PalForm
          mode="edit"
          worldId={editing.worldId}
          initial={editing}
          onCancel={() => setEditingId(null)}
          onSubmit={(patch) => {
            updatePal(editing.id, patch);
            setEditingId(null);
          }}
        />
      )}

      <div className="border border-chillet-200/70 dark:border-chillet-800/60 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-chillet-50/70 dark:bg-chillet-900/40 text-chillet-700 dark:text-chillet-200">
            <tr>
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((p) => p.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="text-left px-3 py-2">{t("home.col.pal")}</th>
              <th className="text-left px-3 py-2">{t("home.col.nickname")}</th>
              <th className="text-left px-3 py-2">{t("home.col.gender")}</th>
              <th className="text-left px-3 py-2">{t("home.col.level")}</th>
              <th className="text-left px-3 py-2">{t("home.col.passives")}</th>
              <th className="text-left px-3 py-2">{t("home.col.ivs")}</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-chillet-700/70 dark:text-chillet-200/60">
                  {t("home.empty")}
                </td>
              </tr>
            )}
            {filtered.map((op) => {
              const pal = palByKey(op.palKey);
              const isSel = selected.has(op.id);
              return (
                <tr
                  key={op.id}
                  className="border-t border-chillet-200/70 dark:border-chillet-800/60 hover:bg-chillet-50/60 dark:hover:bg-chillet-900/30"
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(op.id);
                        else next.delete(op.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {pal ? (
                      <div className="flex items-center gap-2">
                        <PalAvatar pal={pal} size={32} />
                        <div className="min-w-0">
                          <div className="truncate">
                            <span className="text-chillet-700/70 dark:text-chillet-200/60 mr-1">{palDexLabel(pal)}</span>
                            {palName(pal, lang)}
                          </div>
                          <div className="text-xs text-chillet-500/60 dark:text-chillet-300/40 truncate">
                            {lang === "ko" ? pal.name : pal.nameKo}
                          </div>
                        </div>
                        <PalInfoLink pal={pal} />
                      </div>
                    ) : (
                      <span className="text-red-500">?</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{op.nickname || t("common.none")}</td>
                  <td className="px-3 py-2">
                    {op.gender === "Male"
                      ? t("common.short.male")
                      : op.gender === "Female"
                        ? t("common.short.female")
                        : t("common.short.unknown")}
                  </td>
                  <td className="px-3 py-2">{op.level ?? t("common.none")}</td>
                  <td className="px-3 py-2">
                    {op.passives.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {op.passives.map((n) => (
                          <PassiveBadge key={n} name={n} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-chillet-700/70 dark:text-chillet-200/60">{t("common.none")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {op.ivHp ?? "-"}/{op.ivAtk ?? "-"}/{op.ivDef ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      className="text-xs text-chillet-700 dark:text-chillet-200 hover:text-chillet-600 dark:hover:text-chillet-100 mr-2"
                      onClick={() => setEditingId(op.id)}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      className="text-xs text-chillet-700/70 dark:text-chillet-200/60 hover:text-berry-500 dark:hover:text-berry-300"
                      onClick={() => {
                        if (confirm(t("home.delete.confirm"))) removePals([op.id]);
                      }}
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PalForm({
  mode,
  worldId,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "add" | "edit";
  worldId: string;
  initial?: OwnedPal;
  onSubmit: (p: Omit<OwnedPal, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [palKey, setPalKey] = useState<string | undefined>(initial?.palKey);
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "Unknown");
  const [level, setLevel] = useState(initial?.level ? String(initial.level) : "");
  const [passives, setPassives] = useState<string[]>(initial?.passives ?? []);
  const [ivHp, setIvHp] = useState(initial?.ivHp ? String(initial.ivHp) : "");
  const [ivAtk, setIvAtk] = useState(initial?.ivAtk ? String(initial.ivAtk) : "");
  const [ivDef, setIvDef] = useState(initial?.ivDef ? String(initial.ivDef) : "");

  const ivFields: [string, string, (v: string) => void][] = [
    [t("form.field.ivHp"), ivHp, setIvHp],
    [t("form.field.ivAtk"), ivAtk, setIvAtk],
    [t("form.field.ivDef"), ivDef, setIvDef],
  ];

  return (
    <div className="border border-chillet-200/70 dark:border-chillet-800/60 rounded-lg p-4 bg-white dark:bg-chillet-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {mode === "add" ? t("form.add.title") : t("form.edit.title")}
        </div>
        {mode === "edit" && initial && (
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
            {t("form.created")}: {new Date(initial.createdAt).toLocaleString()}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("form.field.pal")}</label>
          <PalPicker value={palKey} onChange={setPalKey} />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("form.field.nickname")}</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("form.field.gender")}</label>
          <Select<Gender>
            value={gender}
            onChange={setGender}
            options={GENDERS.map((g) => ({
              value: g,
              label:
                g === "Male"
                  ? t("common.male")
                  : g === "Female"
                    ? t("common.female")
                    : t("common.unknown"),
            }))}
          />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("form.field.level")}</label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{t("form.field.passives")}</label>
          <PassivePicker value={passives} onChange={setPassives} max={4} />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
          {ivFields.map(([label, val, set]) => (
            <div key={label}>
              <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-sm border border-chillet-200 dark:border-chillet-700/70"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={() => {
            if (!palKey) return alert(t("form.alert.pickPal"));
            onSubmit({
              palKey,
              nickname: nickname || undefined,
              gender,
              level: level ? Number(level) : undefined,
              passives,
              ivHp: ivHp ? Number(ivHp) : undefined,
              ivAtk: ivAtk ? Number(ivAtk) : undefined,
              ivDef: ivDef ? Number(ivDef) : undefined,
              worldId,
            });
          }}
          className="px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600"
        >
          {mode === "add" ? t("common.register") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
