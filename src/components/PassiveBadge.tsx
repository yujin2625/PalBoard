"use client";

import { passiveByName } from "@/lib/passives";
import { useLang } from "@/lib/i18n";

export function passiveRankClass(rank: number): string {
  if (rank >= 4) return "passive-skill-pos4";
  if (rank === 3) return "passive-skill-pos3";
  if (rank === 2) return "passive-skill-pos2";
  if (rank === 1) return "passive-skill-pos1";
  if (rank === -1) return "passive-skill-neg1";
  if (rank === -2) return "passive-skill-neg2";
  if (rank <= -3) return "passive-skill-neg3";
  return "passive-skill-pos1";
}

interface Props {
  name: string;
  rank?: number;
  onRemove?: () => void;
  className?: string;
  title?: string;
}

export function PassiveBadge({ name, rank, onRemove, className = "", title }: Props) {
  const { lang } = useLang();
  const p = passiveByName(name);
  const r = rank ?? p?.rank ?? 0;
  const cls = passiveRankClass(r);
  const display = p ? (lang === "ko" ? p.nameKo : p.name) : name;
  const altName = p && p.nameKo !== p.name ? (lang === "ko" ? p.name : p.nameKo) : null;
  const tooltip =
    title ??
    (p
      ? `${altName ? `${display} (${altName})` : display}${p.description ? ` — ${p.description}` : ""}`
      : name);
  return (
    <span
      className={`${cls} ${onRemove ? "psk-removable" : ""} ${className}`}
      title={tooltip}
    >
      <span className="psk-label">{display}</span>
      <i />
      {onRemove && (
        <button
          type="button"
          className="psk-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${display} ×`}
        >
          ×
        </button>
      )}
    </span>
  );
}
