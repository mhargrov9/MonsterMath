import { BattleState, TurnResult, AbilityResult } from "../types/game";
import { getMonsterById, getAbilityById } from "./storage";
import { calculateDamage, applyHealing, applyStatMods, applyStatusEffects } from "./battleCalculations";
import { resolvePassives } from "./passiveEngine";

export async function executeTurn(state: BattleState, action: { userId: string; abilityId: string; targetIds: string[] }): Promise<TurnResult> {
  const attacker = state.monsters.find(m => m.ownerId === action.userId && m.isActive);
  if (!attacker) throw new Error("No active monster found for user.");

  const ability = await getAbilityById(action.abilityId);
  const targets = state.monsters.filter(m => action.targetIds.includes(m.id));

  const abilityResult: AbilityResult[] = [];

  for (const target of targets) {
    const dmg = calculateDamage(attacker, target, ability);
    const heal = applyHealing(attacker, ability);
    const mods = applyStatMods(target, ability);
    const statuses = applyStatusEffects(target, ability);

    target.hp = Math.max(0, target.hp - dmg + heal);
    // Merge or apply mods/statuses to target's state here as needed

    abilityResult.push({
      targetId: target.id,
      damage: dmg,
      healing: heal,
      statusEffectsApplied: statuses,
    });
  }

  const passiveTriggers = resolvePassives(state, {
    phase: "END_OF_TURN",
    triggeringMonster: attacker,
    abilityUsed: ability,
  });

  return {
    newState: state,
    abilityResults: abilityResult,
    passiveTriggers,
  };
}
