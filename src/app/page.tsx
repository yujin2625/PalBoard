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

const GENDERS: Gender[] = ["Male", "Female", "Unknown"];

export default function OwnedPalsPage() {
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
      const an = palByKey(a.palKey)?.nameKo ?? "";
      const bn = palByKey(b.palKey)?.nameKo ?? "";
      return an.localeCompare(bn);
    });
  }, [pals, activeId, filter, sortKey]);

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
      alert(`불러오기 완료: 월드 ${res.worlds}, 팰 ${res.pals}`);
      window.location.reload();
    } catch {
      alert("파일 형식이 올바르지 않습니다.");
    }
  }

  if (!loaded) return <div className="text-chillet-700/70 dark:text-chillet-200/60">불러오는 중…</div>;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-chillet-200/70 dark:border-chillet-800/60 bg-gradient-to-br from-chillet-100 via-white to-mint-300/30 dark:from-chillet-900/60 dark:via-chillet-950 dark:to-chillet-800/40 px-6 py-6 sm:px-8 sm:py-7 shadow-sm">
        <div className="absolute -right-6 -bottom-10 w-48 h-48 sm:w-60 sm:h-60 opacity-90 pointer-events-none">
          <Image
            src="/pals/chillet.png"
            alt=""
            fill
            sizes="240px"
            className="object-contain drop-shadow-[0_8px_22px_rgba(45,144,201,0.35)]"
          />
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-mint-300/20 blur-3xl" />
        <div className="relative max-w-xl">
          <div className="text-xs uppercase tracking-widest text-chillet-600 dark:text-chillet-300 mb-1">
            팰월드 보유 팰 관리
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-chillet-900 dark:text-chillet-50">
            나만의 팰 보드
          </h1>
          <p className="mt-2 text-sm text-chillet-700/80 dark:text-chillet-200/70">
            월드별로 팰을 등록하고, 교배 시뮬과 경로 찾기를 함께 활용하세요. 모든 데이터는 브라우저에만 저장됩니다.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-chillet-700/70 dark:text-chillet-200/60">
            <span>🥚 {pals.length}마리 등록됨</span>
            <span>·</span>
            <span>🌐 {worlds.length}개 월드</span>
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
            const name = prompt("새 월드 이름:");
            if (name) addWorld(name);
          }}
          className="px-2 py-1.5 rounded-md text-sm border border-dashed border-chillet-400/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
        >
          + 월드
        </button>
        <button
          onClick={() => {
            const cur = worlds.find((w) => w.id === activeId);
            if (!cur) return;
            const name = prompt("월드 이름 변경:", cur.name);
            if (name) renameWorld(cur.id, name);
          }}
          className="text-xs text-chillet-700/70 dark:text-chillet-200/60 underline ml-2"
        >
          이름 변경
        </button>
        <button
          onClick={() => {
            if (worlds.length <= 1) return alert("월드는 최소 1개 필요");
            if (confirm("이 월드를 삭제하시겠습니까?")) removeWorld(activeId);
          }}
          className="text-xs text-red-600 underline"
        >
          월드 삭제
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            내보내기
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="px-2 py-1.5 text-xs rounded-md border border-chillet-200 dark:border-chillet-700/70 hover:bg-chillet-100 dark:hover:bg-chillet-800/50"
          >
            불러오기
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
          placeholder="이름/별명/패시브 검색"
          className="rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-1.5 text-sm"
        />
        <Select<"createdAt" | "name" | "level">
          className="w-32"
          size="sm"
          value={sortKey}
          onChange={setSortKey}
          options={[
            { value: "createdAt", label: "등록순" },
            { value: "name", label: "이름순" },
            { value: "level", label: "레벨순" },
          ]}
        />
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-3 py-1.5 rounded-md text-sm bg-chillet-500 text-white hover:bg-chillet-600"
        >
          + 팰 등록
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => {
              if (confirm(`선택한 ${selected.size}마리를 삭제하시겠습니까?`)) {
                removePals([...selected]);
                setSelected(new Set());
              }
            }}
            className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
          >
            선택 삭제 ({selected.size})
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
              <th className="text-left px-3 py-2">팰</th>
              <th className="text-left px-3 py-2">별명</th>
              <th className="text-left px-3 py-2">성별</th>
              <th className="text-left px-3 py-2">레벨</th>
              <th className="text-left px-3 py-2">패시브</th>
              <th className="text-left px-3 py-2">IVs (H/A/D)</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-chillet-700/70 dark:text-chillet-200/60">
                  등록된 팰이 없습니다. 우측의{" "}
                  <span className="font-medium">+ 팰 등록</span> 버튼으로 추가하세요.
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
                            {pal.nameKo}
                          </div>
                          <div className="text-xs text-chillet-500/60 dark:text-chillet-300/40 truncate">
                            {pal.name}
                          </div>
                        </div>
                        <PalInfoLink pal={pal} />
                      </div>
                    ) : (
                      <span className="text-red-500">?</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{op.nickname || "-"}</td>
                  <td className="px-3 py-2">
                    {op.gender === "Male" ? "♂" : op.gender === "Female" ? "♀" : "?"}
                  </td>
                  <td className="px-3 py-2">{op.level ?? "-"}</td>
                  <td className="px-3 py-2">
                    {op.passives.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {op.passives.map((n) => (
                          <PassiveBadge key={n} name={n} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-chillet-700/70 dark:text-chillet-200/60">-</span>
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
                      수정
                    </button>
                    <button
                      className="text-xs text-chillet-700/70 dark:text-chillet-200/60 hover:text-berry-500 dark:hover:text-berry-300"
                      onClick={() => {
                        if (confirm("삭제하시겠습니까?")) removePals([op.id]);
                      }}
                    >
                      삭제
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
  const [palKey, setPalKey] = useState<string | undefined>(initial?.palKey);
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "Unknown");
  const [level, setLevel] = useState(initial?.level ? String(initial.level) : "");
  const [passives, setPassives] = useState<string[]>(initial?.passives ?? []);
  const [ivHp, setIvHp] = useState(initial?.ivHp ? String(initial.ivHp) : "");
  const [ivAtk, setIvAtk] = useState(initial?.ivAtk ? String(initial.ivAtk) : "");
  const [ivDef, setIvDef] = useState(initial?.ivDef ? String(initial.ivDef) : "");

  return (
    <div className="border border-chillet-200/70 dark:border-chillet-800/60 rounded-lg p-4 bg-white dark:bg-chillet-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {mode === "add" ? "새 팰 등록" : "팰 수정"}
        </div>
        {mode === "edit" && initial && (
          <div className="text-xs text-chillet-700/70 dark:text-chillet-200/60">
            등록일: {new Date(initial.createdAt).toLocaleString()}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">팰 종류 *</label>
          <PalPicker value={palKey} onChange={setPalKey} />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">별명</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">성별</label>
          <Select<Gender>
            value={gender}
            onChange={setGender}
            options={GENDERS.map((g) => ({
              value: g,
              label: g === "Male" ? "♂ 수컷" : g === "Female" ? "♀ 암컷" : "? 미상",
            }))}
          />
        </div>
        <div>
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">레벨</label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-md border border-chillet-200 dark:border-chillet-700/70 bg-white dark:bg-chillet-900 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-chillet-700/70 dark:text-chillet-200/60 mb-1">패시브 (최대 4개)</label>
          <PassivePicker value={passives} onChange={setPassives} max={4} />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
          {([
            ["HP IV", ivHp, setIvHp],
            ["ATK IV", ivAtk, setIvAtk],
            ["DEF IV", ivDef, setIvDef],
          ] as const).map(([label, val, set]) => (
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
          취소
        </button>
        <button
          onClick={() => {
            if (!palKey) return alert("팰을 선택해 주세요.");
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
          {mode === "add" ? "등록" : "저장"}
        </button>
      </div>
    </div>
  );
}
