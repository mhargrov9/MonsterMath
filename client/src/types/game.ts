// This is the single source of truth for all client-side type definitions.
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
  level?: number;
  resistances?: string[];
  weaknesses?: string[];
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

export type PlayerCombatMonster = UserMonster & { monster: Monster };
export type AiCombatMonster = Monster & { abilities: Ability[]; hp: number; mp: number; };

export type BattleActionResponse = {
    nextState: {
        playerTeam: PlayerCombatMonster[];
        aiTeam: AiCombatMonster[];
        activePlayerIndex: number;
        activeAiIndex: number;
    };
    log: string[];
}