// shared/types.ts

import {
  type User,
  type Monster as BaseMonster,
  type UserMonster as BaseUserMonster,
  type Ability as BaseAbility,
  type StatusEffect as BaseStatusEffect,
} from './schema';

// Re-export base types from schema
export type { User, BaseMonster, BaseUserMonster, BaseAbility, BaseStatusEffect };

// --- BATTLE-SPECIFIC INTERFACES ---

export type Turn =
  | 'pre-battle'
  | 'player'
  | 'ai'
  | 'battle-over'
  | 'player-must-swap';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'crit';
  targetId: number | string;
  isPlayerTarget: boolean;
}

export interface BattleLog {
  message: string;
  turn: 'player' | 'ai' | 'system';
}

// --- CORE BATTLE ENGINE TYPES ---

// Extend base types for in-battle use
export interface Ability extends BaseAbility {
  effectDetails: StatusEffect | null;
}

export interface StatusEffect extends BaseStatusEffect {
  isNew?: boolean; // Flag for effects applied this turn
}

export interface ActiveEffect {
  id: string; // UUID for this specific application
  sourceAbilityId: number;
  stat: 'power' | 'defense' | 'speed';
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  duration: number;
}

/**
 * A consistent, internal representation of a monster in battle.
 * This is the SINGLE SOURCE OF TRUTH for a monster's state during combat.
 * It standardizes both player-owned monsters and AI-generated opponents.
 */
export interface BattleMonster extends Omit<BaseUserMonster, 'monster'> {
  monster: BaseMonster & { abilities: Ability[] };
  isFainted: boolean;
  battleHp: number;
  battleMaxHp: number;
  battleMp: number;
  battleMaxMp: number;
  statusEffects: StatusEffect[];
  activeEffects: ActiveEffect[];
}

/**
 * The definitive shape of the battle state object. This object is what's
 * stored in the `battleSessions` map and passed around the engine.
 */
export interface BattleState {
  playerTeam: BattleMonster[];
  aiTeam: BattleMonster[];
  activePlayerIndex: number;
  activeAiIndex: number;
  turn: Turn;
  battleEnded: boolean;
  winner: 'player' | 'ai' | null;
  battleLog: BattleLog[];
}