import passivesJson from "@/data/passives.json";

export interface PassiveSkill {
  name: string;
  /** Korean localization (paldb.cc); falls back to `name` if unavailable. */
  nameKo: string;
  rank: number; // -3..-1 negative tier, 1..4 positive tier
  description: string;
}

export const PASSIVES: readonly PassiveSkill[] = passivesJson as PassiveSkill[];
const BY_NAME = new Map<string, PassiveSkill>(PASSIVES.map((p) => [p.name, p]));

export function passiveByName(name: string): PassiveSkill | undefined {
  return BY_NAME.get(name);
}

export function passiveTone(rank: number): {
  text: string;
  bg: string;
  border: string;
  label: string;
} {
  if (rank >= 4)
    return {
      text: "text-amber-700 dark:text-amber-200",
      bg: "bg-amber-100 dark:bg-amber-500/15",
      border: "border-amber-300 dark:border-amber-500/40",
      label: "전설",
    };
  if (rank === 3)
    return {
      text: "text-mint-700 dark:text-mint-300",
      bg: "bg-mint-300/20 dark:bg-mint-700/20",
      border: "border-mint-300 dark:border-mint-700/60",
      label: "S",
    };
  if (rank === 2)
    return {
      text: "text-chillet-700 dark:text-chillet-200",
      bg: "bg-chillet-100 dark:bg-chillet-800/50",
      border: "border-chillet-300 dark:border-chillet-700/60",
      label: "A",
    };
  if (rank === 1)
    return {
      text: "text-chillet-600 dark:text-chillet-300",
      bg: "bg-chillet-50 dark:bg-chillet-800/40",
      border: "border-chillet-200 dark:border-chillet-800/60",
      label: "+",
    };
  if (rank <= -3)
    return {
      text: "text-berry-500 dark:text-berry-300",
      bg: "bg-berry-300/15 dark:bg-berry-500/15",
      border: "border-berry-300 dark:border-berry-500/40",
      label: "−−−",
    };
  if (rank === -2)
    return {
      text: "text-berry-500 dark:text-berry-300",
      bg: "bg-berry-300/10 dark:bg-berry-500/10",
      border: "border-berry-300/70 dark:border-berry-500/30",
      label: "−−",
    };
  if (rank === -1)
    return {
      text: "text-berry-500/80 dark:text-berry-300/70",
      bg: "bg-berry-300/10 dark:bg-berry-500/10",
      border: "border-berry-300/60 dark:border-berry-500/25",
      label: "−",
    };
  return {
    text: "text-chillet-700/70 dark:text-chillet-200/60",
    bg: "bg-chillet-50 dark:bg-chillet-800/40",
    border: "border-chillet-200/70 dark:border-chillet-800/60",
    label: "?",
  };
}
