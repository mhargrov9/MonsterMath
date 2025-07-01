// server/battleEngine.ts

import { getMonsterById } from './storage';
import { BattleState, BattleResult, BattleTrigger } from './types/battle';

// Helper for calculating damage
function calculateDamage(attacker: any, defender: any, ability: any): number {
  const attackStat = attacker[ability.scaling_stat] || 0;
  const base = ability.power_multiplier || 0;
  const resistance = defender.resistances?.[ability.damage_type] || 0;
  const weakness = defender.weaknesses?.[ability.damage_type] || 0;
  let damage = attackStat * base;
  if (resistance) damage *= 0.75;
  if (weakness) damage *= 1.25;
  return Math.floor(damage);
}

// Start-of-turn effects (e.g. DoT, paralysis)
function applyStartOfTurnEffects(state: BattleState): BattleState {
  // TODO: Apply status effects like poison, paralysis, etc.
  return state;
}

// Apply ability effects (core battle logic)
function applyAbility(
  state: BattleState,
  attackerId: string,
  targetId: string,
  ability: any
): { state: BattleState; result: BattleResult } {
  const attacker = state.monsters[attackerId];
  const defender = state.monsters[targetId];

  const damage = calculateDamage(attacker, defender, ability);

  const updatedDefender = {
    ...defender,
    current_hp: Math.max(0, defender.current_hp - damage),
  };

  return {
    state: {
      ...state,
      monsters: {
        ...state.monsters,
        [targetId]: updatedDefender,
      },
    },
    result: {
      targetId,
      damage,
      healing: 0,
      statusEffectsApplied: [],
    },
  };
}

// End-of-turn effects (e.g. passive triggers, decrement durations)
function applyEndOfTurnEffects(state: BattleState): BattleState {
  // TODO: Decrement status durations, handle passive end-of-turn triggers
  return state;
}

export async function runTurn(
  state: BattleState,
  trigger: BattleTrigger
): Promise<{
  newState: BattleState;
  abilityResults: BattleResult[];
  passiveTriggers: any[];
}> {
  let newState = applyStartOfTurnEffects(state);
  const abilityResults: BattleResult[] = [];

  if (trigger.action === 'USE_ABILITY') {
    const { userId, targetId, ability } = trigger;
    const result = applyAbility(newState, userId, targetId, ability);
    newState = result.state;
    abilityResults.push(result.result);
  }

  // Other trigger types (e.g. swap) would go here

  newState = applyEndOfTurnEffects(newState);

  // Placeholder for passive triggers (to be filled in Phase 1b)
  const passiveTriggers: any[] = [];

  return {
    newState,
    abilityResults,
    passiveTriggers,
  };
}
