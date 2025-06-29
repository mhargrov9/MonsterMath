// This is the single source of truth for all client-side type definitions.

// --- Base Schemas & Types---
export interface Ability {
  id: number;
  name: string;
  description: string;
  ability_type: 'ACTIVE' | 'PASSIVE';
  mp_cost: number | null;
  affinity?: string | null;
  power_multiplier?: string | null;
  scaling_stat?: string | null;
  healing_power?: number | null;
  target_scope?: string | null;
  stat_modifiers?: StatModifier[] | null;
}

export interface Monster {
  id: number | string;
  name: string;
  type: string;
  basePower: number;
  baseSpeed: number;
  baseDefense: number;
  baseHp: number;
  baseMp: number;
  goldCost: number;
  abilities?: Ability[];
  level?: number; // Added for displaying level on non-user monsters
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
  hp: number | null;
  maxHp: number | null;
  mp: number | null;
  maxMp: number | null;
}

export interface User {
    id: string;
    email?: string | null;
    username?: string | null;
    gold: number;
    diamonds: number;
    battleSlots: number;
}

export interface Question {
    id: number;
    questionText: string;
    correctAnswer: string;
    options: string[];
    goldReward: number;
    hint: string | null;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'crit' | 'info';
  targetId: number | string;
  isPlayerTarget: boolean;
}

export interface ActiveEffect {
    id: string;
    sourceAbilityId: number;
    targetMonsterId: number | string;
    modifier: StatModifier;
    duration: number;
}

export interface StatModifier {
    stat: 'power' | 'defense' | 'speed';
    type: 'FLAT' | 'PERCENTAGE';
    value: number;
    duration?: number;
}

export interface AiTrainer {
  id: number;
  name: string;
  archetype: string;
  description: string;
  minTPL: number;
  maxTPL: number;
  composition: { monsterId: number; level: number }[];
}

// --- Decorated & Combined Types ---
export type PlayerCombatMonster = UserMonster & { monster: Monster };
export type AiCombatMonster = Monster & { abilities: Ability[]; hp: number; mp: number; };

// --- API Response Types ---
export type BattleActionResponse = {
    nextState: {
        playerTeam: PlayerCombatMonster[];
        aiTeam: AiCombatMonster[];
        activePlayerIndex: number;
        activeAiIndex: number;
    };
    log: string[];
}

// --- Misc App-Specific Types ---
export type GameTab = "lab" | "battle" | "story";