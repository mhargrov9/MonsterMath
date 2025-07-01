// Shared types for the battle system - single source of truth

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
}

export interface UserMonster {
  id: number;
  userId: string;
  monsterId: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  experience: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  hp: number;
  mp: number;
  monster: Monster;
}

export interface Monster {
  id: number;
  name: string;
  type: string;
  basePower: number;
  baseSpeed: number;
  baseDefense: number;
  baseHp?: number;
  baseMp?: number;
  goldCost: number;
  diamondCost: number;
  description?: string;
  iconClass: string;
  gradient: string;
  abilities?: any[];
  resistances?: string[];
  weaknesses?: string[];
  levelUpgrades?: any;
  hp?: number;
  mp?: number;
}

export interface Ability {
  id: number;
  name: string;
  description?: string;
  ability_type: string;
  mp_cost?: number;
  affinity?: string | null;
  power_multiplier?: string;
  scaling_stat?: string;
}