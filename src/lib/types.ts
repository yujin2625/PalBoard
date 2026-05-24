export type PalKey = string; // e.g. "139A" (base) or "139B" (variant)

export interface Pal {
  key: PalKey;
  dexNo: number;
  variant: boolean;
  internal: string;
  index: number;
  name: string;
  nameKo: string;
  breedingPower: number;
  rarity: number;
  size: string;
  elements: string[];
  partnerSkill: string | null;
  guaranteedPassives: string[];
  nocturnal: boolean;
  hp: number;
  atk: number;
  def: number;
  workSuitability: Record<string, number>;
  /** Probability that breeding produces a male child (0..1). */
  genderProb: number | null;
  /** Canonical Paldeck label from palworld.wiki.gg, e.g. "005B". */
  paldeckId: string | null;
  /** Body size category from the wiki: Small/Medium/Large/Extra Large. */
  palSize: string | null;
}

export interface BreedingMeta {
  source: string;
  palcalcDbVersion: string;
  fetchedAt: string;
  palCount: number;
  pairCount: number;
  genderConstrainedPairs: number;
  wikiReference: string;
  breedingMechanic: {
    formula: string;
    passives: { slotPmf: number[]; randomPmf: number[] };
    activeSkill: string;
    ivs: string;
    wikiVersion: string;
  };
}

export type Gender = "Male" | "Female" | "Unknown";

export interface OwnedPal {
  /** Local id (uuid-ish). */
  id: string;
  palKey: PalKey;
  nickname?: string;
  gender: Gender;
  level?: number;
  passives: string[]; // free-text passive names
  ivHp?: number;
  ivAtk?: number;
  ivDef?: number;
  soulRanks?: { hp?: number; atk?: number; def?: number };
  worldId: string;
  notes?: string;
  createdAt: number;
}

export interface World {
  id: string;
  name: string;
  createdAt: number;
}
