import { Monster, Ability } from "../types/game";

export function calculateDamage(attacker: Monster, target: Monster, ability: Ability): number {
  const base = ability.power_multiplier || 0;
  const scaling = attacker[ability.scaling_stat || "atk"] || 1;
  const resistance = target.resistances?.[ability.element || ""] || 1;
  return Math.floor(base * scaling * resistance);
}

export function applyHealing(attacker: Monster, ability: Ability): number {
  return Math.floor((ability.healing_power || 0) * (attacker.spd || 1));
}

export function applyStatMods(target: Monster, ability: Ability) {
  // Placeholder: actual stat modification logic
  return ability.stat_modifiers || [];
}

export function applyStatusEffects(target: Monster, ability: Ability) {
  // Placeholder: return status effects applied
  return ability.status_effect_applies || [];
}
