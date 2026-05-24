import { passiveByName } from "@/lib/passives";

/** Map a numeric rank to the wiki passive-skill-* class name. */
export function passiveRankClass(rank: number): string {
  if (rank >= 4) return "passive-skill-pos4";
  if (rank === 3) return "passive-skill-pos3";
  if (rank === 2) return "passive-skill-pos2";
  if (rank === 1) return "passive-skill-pos1";
  if (rank === -1) return "passive-skill-neg1";
  if (rank === -2) return "passive-skill-neg2";
  if (rank <= -3) return "passive-skill-neg3";
  return "passive-skill-pos1"; // unknown → neutral-positive style
}

interface Props {
  name: string;
  /** Override rank if you already have it (avoids a lookup). */
  rank?: number;
  /** If provided, the chip becomes removable and the rank icon is replaced with ×. */
  onRemove?: () => void;
  /** Extra class to append. */
  className?: string;
  /** Tooltip text override; defaults to the wiki description. */
  title?: string;
}

export function PassiveBadge({ name, rank, onRemove, className = "", title }: Props) {
  const p = passiveByName(name);
  const r = rank ?? p?.rank ?? 0;
  const cls = passiveRankClass(r);
  return (
    <span
      className={`${cls} ${onRemove ? "psk-removable" : ""} ${className}`}
      title={title ?? p?.description ?? name}
    >
      <span className="psk-label">{name}</span>
      <i />
      {onRemove && (
        <button
          type="button"
          className="psk-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${name} 제거`}
        >
          ×
        </button>
      )}
    </span>
  );
}
