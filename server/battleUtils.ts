// server/battleUtils.ts

import { BattleMonster } from '@shared/types';

/**
 * Calculates a monster's final stat value for a battle, applying all temporary
 * buffs and debuffs from its activeEffects array.
 *
 * This function follows the critical order of operations specified in the brief[cite: 227, 606]:
 * 1. Start with the base stat.
 * 2. Apply all FLAT modifiers.
 * 3. Apply all PERCENTAGE modifiers to the result of the flat modifications[cite: 228].
 *
 * @param monster The BattleMonster whose stat is being calculated.
 * @param statName The name of the stat to calculate ('power', 'defense', or 'speed').
 * @returns The final, calculated stat value as an integer.
 */
export function getModifiedStat(
  monster: BattleMonster,
  statName: 'power' | 'defense' | 'speed',
): number {
  // Start with the monster's base stat for this level.
  let finalStat = monster[statName];

  const relevantEffects = (monster.activeEffects || []).filter(
    (effect) => effect.stat === statName,
  );

  // 1. Apply all FLAT modifiers first. [cite: 228]
  const flatModifiers = relevantEffects.filter((effect) => effect.type === 'FLAT');
  for (const effect of flatModifiers) {
    finalStat += effect.value;
  }

  // 2. Apply all PERCENTAGE modifiers to the new total. [cite: 228]
  const percentageModifiers = relevantEffects.filter(
    (effect) => effect.type === 'PERCENTAGE',
  );
  for (const effect of percentageModifiers) {
    // A value of 50 means +50%, a value of -25 means -25%.
    finalStat *= 1 + effect.value / 100;
  }

  // Ensure the stat doesn't drop below a minimum reasonable value (e.g., 1).
  return Math.floor(Math.max(1, finalStat));
}