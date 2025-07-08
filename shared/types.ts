// shared/types.ts

import {
  type User,
  type Monster as BaseMonster,
  type UserMonster as BaseUserMonster,
  type Ability as BaseAbility,
  type StatusEffect as BaseStatusEffect,
} from './schema';

// Re-export base types from schema for convenience
export type { User, BaseMonster, BaseUserMonster, BaseAbility, BaseStatusEffect };

// --- BATTLE-SPECIFIC INTERFACES ---

export type Turn = 'player' | 'ai';

export interface FloatingText {
  id: number;
  text: string;
  type:
    | 'DAMAGE'
    | 'HEAL'
    | 'EVADE'
    | 'STATUS_APPLIED'
    | 'PASSIVE_ACTIVATE'
    | 'FAINT'
    | 'BATTLE_END'
    | 'ABILITY_USE';
  targetId: number;
}

export interface BattleLog {
  turn: number;
  message: string;
}

/**
 * A structured event representing a discrete outcome in a battle turn.
 * This is used by the client to generate visual feedback like floating text.
 */
export interface BattleEvent {
  type:
    | 'DAMAGE'
    | 'HEAL'
    | 'EVADE'
    | 'STATUS_APPLIED'
    | 'PASSIVE_ACTIVATE'
    | 'FAINT'
    | 'BATTLE_END'
    | 'ABILITY_USE';
  targetId: number;
  amount?: number; // For damage/heal
  abilityName?: string; // For ability use/passive activation
  effectName?: string; // For status effects
  winner?: 'player' | 'ai';
}

// --- CORE BATTLE ENGINE TYPES ---

// Extend base types for in-battle use
export interface Ability extends BaseAbility {
  effectDetails?: StatusEffect | null; // Use optional for safety
  stat_modifiers?: ActiveEffect[];
}

export interface StatusEffect extends BaseStatusEffect {
  duration?: number;
}

export interface ActiveEffect {
  sourceAbilityId: number;
  stat: 'power' | 'defense' | 'speed';
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  duration?: number;
}

/**
 * A consistent, internal representation of a monster in battle.
 * This is the SINGLE SOURCE OF TRUTH for a monster's state during combat.
 */
export interface BattleMonster extends Omit<BaseUserMonster, 'monster'> {
  monster: BaseMonster & { abilities: Ability[] };
  isPlayer: boolean;
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
  battleId: string;
  playerTeam: BattleMonster[];
  aiTeam: BattleMonster[];
  turn: Turn;
  turnCount: number;
  cycleComplete: boolean;
  battleEnded: boolean;
  winner: 'player' | 'ai' | null;
  battleLog: BattleLog[];
  events: BattleEvent[];
}