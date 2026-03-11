export type Faction = "wanderer" | "cycle" | "rednight" | "karzat";

export interface Skill {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpRequired: number;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  faction: Faction;
  hp: { current: number; max: number };
  manaExposure: number;
  soulStones: number;
  skills: Skill[];
}
