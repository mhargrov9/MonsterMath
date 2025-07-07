// Import shared types for the battle system
import {
  DamageResult,
  UserMonster,
  Monster,
  Ability,
  Turn,
  StatusEffect,
  ActiveEffect,
} from '../shared/types.js';
import { storage } from './storage.js';
import crypto from 'crypto';

// In-memory store for active battle sessions
export const battleSessions = new Map();

export const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
  // This check now correctly identifies player vs. AI monsters
  const isUserMonster = 'userId' in monster;
  const baseMonster = isUserMonster ? (monster as UserMonster).monster : (monster as any).monster;

  let baseStatValue = 0;
  if (!baseMonster) { // Safety check for the nested object
     // Fallback for the old "flat" AI monster structure during transition
     const monsterAsAny = monster as any;
     baseStatValue = monsterAsAny[`base${statName.charAt(0).toUpperCase() + statName.slice(1)}`];
  } else if (statName === 'power') {
    baseStatValue = isUserMonster ? (monster as UserMonster).power : baseMonster.basePower;
  } else if (statName === 'defense') {
    baseStatValue = isUserMonster ? (monster as UserMonster).defense : baseMonster.baseDefense;
  } else if (statName === 'speed') {
    baseStatValue = isUserMonster ? (monster as UserMonster).speed : baseMonster.baseSpeed;
  }

  if (!monster.activeEffects || monster.activeEffects.length === 0) {
    return baseStatValue;
  }

  let modifiedStat = baseStatValue;

  // Apply FLAT modifiers
  monster.activeEffects.forEach(effect => {
    if (effect.stat === statName && effect.type === 'FLAT') {
      modifiedStat += effect.value;
    }
  });

  // Apply PERCENTAGE modifiers
  monster.activeEffects.forEach(effect => {
    if (effect.stat === statName && effect.type === 'PERCENTAGE') {
      modifiedStat *= (1 + effect.value / 100);
    }
  });

  return Math.floor(modifiedStat);
};

// Helper function to calculate type effectiveness
export const getAffinityMultiplier = (
  attackAffinity: string | null | undefined,
  defender: Monster,
): number => {
  if (!attackAffinity) return 1.0;
  const lower = attackAffinity.toLowerCase();
  if (defender.weaknesses && Array.isArray(defender.weaknesses)) {
    if (defender.weaknesses.map((w: any) => w.toLowerCase()).includes(lower))
      return 2.0;
  }
  if (defender.resistances && Array.isArray(defender.resistances)) {
    if (defender.resistances.map((r: any) => r.toLowerCase()).includes(lower))
      return 0.5;
  }
  return 1.0;
};

// PHASE 1: Start of Turn - Handle status effects, DoT, and turn-skipping
export const handleStartOfTurn = (
  battleState: any,
  isPlayerTurn: boolean,
): { turnSkipped: boolean } => {
  const currentTeam = isPlayerTurn ? battleState.playerTeam : battleState.aiTeam;
  const teamName = isPlayerTurn ? 'Your' : "Opponent's";

  // --- Process DoT for ALL monsters on the team ---
  for (const monster of currentTeam) {
    if (monster.statusEffects?.length > 0) {
      for (const effect of monster.statusEffects) {
        if (effect.effectDetails?.effect_type === 'DAMAGE_OVER_TIME') {
          const monsterName = monster.monster?.name || monster.name;
          const effectValue = parseFloat(effect.override_value || effect.effectDetails.default_value || '0');
          if (effectValue === 0) continue;

          let damageAmount = 0;
          if (effect.effectDetails.value_type === 'PERCENT_MAX_HP') {
            damageAmount = Math.floor((monster.battleMaxHp || 0) * effectValue);
          } else {
            damageAmount = effectValue;
          }

          if (damageAmount > 0) {
            monster.battleHp = Math.max(0, (monster.battleHp || 0) - damageAmount);
            battleState.battleLog.push(`${teamName} ${monsterName} takes ${damageAmount} damage from ${effect.name}!`);
          }
        }
      }
    }
  }

  // --- Process Turn-Skipping effects for ACTIVE monster ONLY ---
  const activeMonster = currentTeam[isPlayerTurn ? battleState.activePlayerIndex : battleState.activeAiIndex];
  if (activeMonster.statusEffects?.length > 0) {
    for (const effect of activeMonster.statusEffects) {
      if (!effect.effectDetails) continue;
      switch (effect.effectDetails.effect_type) {
        case 'TURN_SKIP':
          battleState.battleLog.push(`${teamName} ${activeMonster.monster?.name || activeMonster.name} is paralyzed and can't move!`);
          return { turnSkipped: true };
        case 'DISRUPTION':
          // (Existing Confusion logic here...)
          const confusionChance = parseFloat(effect.effectDetails.default_value || '0.5');
          if (Math.random() < confusionChance) {
            const monsterName = activeMonster.monster?.name || activeMonster.name;
            const selfDamageModifier = parseFloat(effect.effectDetails.secondary_value || '0.4');
            const selfDamage = Math.floor(getModifiedStat(activeMonster, 'power') * selfDamageModifier);
            if (selfDamage > 0) {
              activeMonster.battleHp = Math.max(0, activeMonster.battleHp - selfDamage);
              battleState.battleLog.push(`${teamName} ${monsterName} is confused and hurt itself for ${selfDamage} damage!`);
            }
            return { turnSkipped: true };
          }
          break;
      }
    }
  }

  battleState.battleLog.push(`${teamName} ${activeMonster.monster?.name || activeMonster.name}'s turn begins!`);
  return { turnSkipped: false };
};

// PHASE 2: Action Phase - Handle the chosen action (ability or swap)
const handleActionPhase = async (
  battleState: any,
  ability: any,
  targetId?: number,
): Promise<DamageResult> => {
  // Route abilities based on their healing_power database field
  if (ability.healing_power && ability.healing_power > 0) {
    // This is a healing ability - use healing logic
    const isPlayerTurn = battleState.turn === 'player';
    const attackingTeam = isPlayerTurn
      ? battleState.playerTeam
      : battleState.aiTeam;
    const attackerIndex = isPlayerTurn
      ? battleState.activePlayerIndex
      : battleState.activeAiIndex;
    const attacker = attackingTeam[attackerIndex];

    // Find target using provided targetId or default to attacker (self-heal)
    let target = attacker; // Default fallback

    if (targetId !== undefined) {
      // Search for target in player team first
      const playerTarget = battleState.playerTeam.find(
        (monster: any) => monster.id === targetId,
      );
      if (playerTarget) {
        target = playerTarget;
      } else {
        // Search in AI team if not found in player team
        const aiTarget = battleState.aiTeam.find(
          (monster: any) => monster.id === targetId,
        );
        if (aiTarget) {
          target = aiTarget;
        }
      }
    }

    return await executeHealingAbility(battleState, ability, attacker, target);
  } else {
    // This is a damaging ability - use damage logic
    return await executeAbility(battleState, ability);
  }
};

// PHASE 3: End of Turn - Handle passive abilities, status effects, duration management, and turn switching
export const handleEndOfTurn = (battleState: any): void => {
  // Identify the team whose turn just ended
  const isPlayerTurnEnding = battleState.turn === 'player';
  const currentTeam = isPlayerTurnEnding
    ? battleState.playerTeam
    : battleState.aiTeam;
  const currentTeamName = isPlayerTurnEnding ? 'Your' : "Opponent's";

  // Loop through each monster on the team (both active and benched)
  currentTeam.forEach((monster: any, index: number) => {
    const monsterId = monster.monster?.id || monster.id;
    const monsterName = monster.monster?.name || monster.name;
    const isActive =
      index ===
      (isPlayerTurnEnding
        ? battleState.activePlayerIndex
        : battleState.activeAiIndex);

    // Get abilities for this monster from the abilities map
    const monsterAbilities = battleState.abilities_map[monsterId] || [];

    // FIRST: Process passive abilities that have activation_trigger of 'END_OF_TURN'
    monsterAbilities.forEach((ability: any) => {
      if (
        ability.ability_type === 'PASSIVE' &&
        ability.activation_trigger === 'END_OF_TURN'
      ) {
        // Check if activation scope matches monster's current position
        let scopeMatches = false;
        if (
          (ability.activation_scope === 'ACTIVE' ||
            ability.activation_scope === 'SELF') &&
          isActive
        ) {
          scopeMatches = true;
        } else if (ability.activation_scope === 'BENCH' && !isActive) {
          scopeMatches = true;
        } else if (
          ability.activation_scope === 'ANY_POSITION' ||
          ability.activation_scope === 'ALL_ALLIES'
        ) {
          scopeMatches = true;
        }

        if (scopeMatches) {
          // Check activation chance from database
          let activates = true;
          if (
            ability.override_chance !== null &&
            ability.override_chance !== undefined
          ) {
            activates = Math.random() < ability.override_chance;
          } else if (
            ability.effectDetails &&
            ability.effectDetails.default_value !== null
          ) {
            // Use default chance if no override
            activates = Math.random() < 1.0; // Default to 100% if no specific chance
          }

          if (activates && ability.effectDetails) {
            // Process healing effects using new database structure
            if (ability.effectDetails.effect_type === 'HEALING_OVER_TIME') {
              // Determine correct target based on activation scope
              let target;
              let targetName;

              if (
                ability.activation_scope === 'BENCH' ||
                ability.activation_scope === 'ANY_POSITION' ||
                ability.activation_scope === 'ALL_ALLIES'
              ) {
                const activeIndex = isPlayerTurnEnding
                  ? battleState.activePlayerIndex
                  : battleState.activeAiIndex;
                target = currentTeam[activeIndex];
                targetName = target.monster?.name || target.name;
              } else if (
                ability.activation_scope === 'ACTIVE' ||
                ability.activation_scope === 'SELF'
              ) {
                target = monster;
                targetName = monsterName;
              }

              if (target) {
                const targetTeam = battleState.playerTeam.some(
                  (m: any) => m.id === target.id,
                )
                  ? battleState.playerTeam
                  : battleState.aiTeam;
                const targetIndex = targetTeam.findIndex(
                  (m: any) => m.id === target.id,
                );

                if (targetIndex !== -1) {
                  const currentHp = target.battleHp || 0;
                  const maxHp = target.battleMaxHp || 0;

                  if (currentHp < maxHp) {
                    // Create a new object for the update
                    const updatedTarget = { ...targetTeam[targetIndex] };

                    // Calculate heal amount
                    let healAmount;
                    const effectValue = parseFloat(
                      ability.override_value ||
                        ability.effectDetails.default_value ||
                        '0',
                    );

                    if (ability.effectDetails.value_type === 'PERCENT_MAX_HP') {
                      healAmount = Math.floor(maxHp * (effectValue / 100));
                    } else {
                      healAmount = effectValue;
                    }

                    // Apply healing to the new object
                    updatedTarget.battleHp = Math.min(
                      maxHp,
                      currentHp + healAmount,
                    );

                    // Replace the old object in the array with the updated one
                    targetTeam[targetIndex] = updatedTarget;

                    // Add battle log message
                    battleState.battleLog.push(
                      `${currentTeamName} ${monsterName}'s ${ability.name} activated! ${targetName} healed for ${healAmount} HP.`,
                    );
                  }
                }
              }
            }
          }
        }
      }
    });

    // SECOND: Process statusEffects array for this monster
    if (monster.statusEffects && monster.statusEffects.length > 0) {
      const newStatusEffects: any[] = [];

      monster.statusEffects.forEach((effect: any) => {
        if (effect.effectDetails) {
          // Process status effect based on effect_type
          switch (effect.effectDetails.effect_type) {
            case 'TURN_SKIP':
              // TURN_SKIP effects don't need special processing during END_OF_TURN
              // They're handled during START_OF_TURN phase, just let them fall through to duration management
              break;

            case 'HEALING_OVER_TIME': {
              const healValue = parseFloat(
                effect.override_value ||
                  effect.effectDetails.default_value ||
                  '0',
              );
              if (healValue === 0) break;

              const maxHp = monster.battleMaxHp || 0;
              const currentHp = monster.battleHp || 0;
              let healAmount = 0;

              // CORRECTED LOGIC: Properly check the value_type from the effect's details
              if (effect.effectDetails.value_type === 'PERCENT_MAX_HP') {
                healAmount = Math.floor(maxHp * (healValue / 100));
              } else {
                // Fallback to FLAT healing
                healAmount = healValue;
              }

              if (healAmount > 0 && currentHp < maxHp) {
                monster.battleHp = Math.min(maxHp, currentHp + healAmount);
                battleState.battleLog.push(
                  `${currentTeamName} ${monsterName} heals for ${healAmount} HP from ${effect.name}!`,
                );
              }
              break;
            }
          }
        }

        // Simplified duration management: decrement all effects except newly applied ones
        if (effect.isNew) {
          delete effect.isNew; // Remove flag, do not decrement this turn
        } else {
          if (effect.duration !== null) {
            effect.duration -= 1; // Decrement duration for all other effects
          }
        }

        // Keep effect if duration is still greater than 0
        if (effect.duration > 0) {
          newStatusEffects.push(effect);
        } else {
          // Effect has expired, add log message
          const effectName = effect.effectDetails?.name || 'effect';
          battleState.battleLog.push(
            `The ${effectName} on ${currentTeamName} ${monsterName} wore off.`,
          );
        }
      });

      // Replace the monster's statusEffects array with the new one
      monster.statusEffects = newStatusEffects;
    }

    // --- Process Active Stat Effects (Buffs/Debuffs) ---
    if (monster.activeEffects && monster.activeEffects.length > 0) {
      const newActiveEffects = monster.activeEffects.filter(effect => {
        effect.duration -= 1;
        if (effect.duration <= 0) {
          battleState.battleLog.push(`The ${effect.stat} modifier on ${currentTeamName} ${monsterName} wore off.`);
          return false; // Remove effect
        }
        return true; // Keep effect
      });
      monster.activeEffects = newActiveEffects;
    }
  });

  // After processing all monsters, switch the turn to the other player
  // But don't override if already set to 'player-must-swap' by defeat logic
  if (battleState.turn !== 'player-must-swap') {
    battleState.turn = isPlayerTurnEnding ? 'ai' : 'player';
  }
};

// Helper function to execute healing abilities using database healing_power field
const executeHealingAbility = async (
  battleState: any,
  ability: any,
  attacker: any,
  target: any,
): Promise<DamageResult> => {
  // Apply MP cost to attacker
  const mpCost = ability.mp_cost || 0;
  if (attacker.battleMp !== undefined) {
    attacker.battleMp = (attacker.battleMp || attacker.mp || 0) - mpCost;
  } else {
    attacker.mp = (attacker.mp || 0) - mpCost;
  }

  // Calculate healing amount from database healing_power field
  const healingAmount = ability.healing_power || 0;

  // Get target's current and max HP using standardized battle properties
  const currentHp = target.battleHp || 0;
  const maxHp = target.battleMaxHp || 0;

  // IMMUTABLE UPDATE: Find the target in the correct team and update it.
  const teamToUpdate = battleState.playerTeam.some((m: UserMonster) => m.id === target.id)
    ? battleState.playerTeam
    : battleState.aiTeam;
  const targetIndex = teamToUpdate.findIndex((m: UserMonster) => m.id === target.id);

  let actualHealing = 0;
  if (targetIndex !== -1) {
    const updatedTarget = { ...teamToUpdate[targetIndex] };
    const currentHp = updatedTarget.battleHp || 0;
    const maxHp = updatedTarget.battleMaxHp || 0;
    const newHp = Math.min(maxHp, currentHp + healingAmount);
    actualHealing = newHp - currentHp;
    updatedTarget.battleHp = newHp;
    teamToUpdate[targetIndex] = updatedTarget;
  }

  // Add healing message to battle log
  const attackerName = attacker.monster?.name || attacker.name;
  const targetName = target.monster?.name || target.name;
  const abilityName = ability.name || 'healing ability';

  battleState.battleLog.push(
    `${attackerName}'s ${abilityName} heals ${targetName} for ${actualHealing} HP.`,
  );

  // Return a DamageResult structure (with healing as negative damage for consistency)
  return {
    damage: -actualHealing, // Negative to indicate healing
    isCritical: false,
    affinityMultiplier: 1.0,
  };
};

// Helper function to execute ability (extracted from existing applyDamage logic)
export const executeAbility = async (
  battleState: any,
  ability: Ability,
): Promise<DamageResult> => {
  const isPlayerTurn = battleState.turn === 'player';
  const attackingTeam = isPlayerTurn ? battleState.playerTeam : battleState.aiTeam;
  const defendingTeam = isPlayerTurn ? battleState.aiTeam : battleState.playerTeam;
  const attackerIndex = isPlayerTurn ? battleState.activePlayerIndex : battleState.activeAiIndex;
  const defenderIndex = isPlayerTurn ? battleState.activeAiIndex : battleState.activePlayerIndex;

  const attacker = attackingTeam[attackerIndex];
  const attackerName = attacker.monster?.name || attacker.name;

  // Apply MP cost once
  const mpCost = ability.mp_cost || 0;
  if ('battleMp' in attacker) {
    attacker.battleMp = (attacker.battleMp || attacker.mp || 0) - mpCost;
  } else {
    attacker.mp = (attacker.mp || 0) - mpCost;
  }

  // --- Determine Target(s) ---
  let targets = [];
  if (ability.target_scope === 'ALL_OPPONENTS') {
    targets = defendingTeam.filter((m: any) => (m.battleHp ?? m.hp) > 0); // Target all healthy opponents
  } else {
    targets.push(defendingTeam[defenderIndex]); // Target only the active opponent
  }

  // Determine number of hits for multi-hit abilities
  const minHits = ability.min_hits || 1;
  const maxHits = ability.max_hits || 1;
  const numHits = Math.floor(Math.random() * (maxHits - minHits + 1)) + minHits;

  let totalDamage = 0;
  let totalDamageResult: DamageResult = {
    damage: 0,
    isCritical: false,
    affinityMultiplier: 1.0,
  };

  // --- Loop through all targets ---
  for (const target of targets) {
    const defenderName = target.monster?.name || target.name;
    let targetDamage = 0;

    // Execute the ability for each hit on this target
    for (let hitIndex = 0; hitIndex < numHits; hitIndex++) {
      // Calculate damage for this hit
      const damageResult = calculateDamage(attacker, target, ability);
      
      // --- Check for Evasion Status Effects on Target ---
      if (target.statusEffects?.some((e: any) => e.effectDetails?.effect_type === 'EVASION')) {
        if (ability.affinity === 'Physical') {
          damageResult.damage = 0; // Negate the damage
          battleState.battleLog.push(`${defenderName} evaded the physical attack!`);
        }
      }
      
      targetDamage += damageResult.damage;
      totalDamage += damageResult.damage;

      // Update accumulated damage result (preserve critical/affinity from any hit)
      totalDamageResult.damage += damageResult.damage;
      if (damageResult.isCritical) {
        totalDamageResult.isCritical = true;
      }
      if (damageResult.affinityMultiplier !== 1.0) {
        totalDamageResult.affinityMultiplier = damageResult.affinityMultiplier;
      }

      // --- Check for ON_BEING_HIT Passives on the Target (per hit) ---
      const targetAbilities = battleState.abilities_map[target.monster?.id || target.id] || [];
      for (const passive of targetAbilities) {
        if (passive.ability_type === 'PASSIVE' && passive.activation_trigger === 'ON_BEING_HIT' && passive.effectDetails) {
          const chance = parseFloat(passive.override_chance || passive.effectDetails.default_value || '1.0');

          if (Math.random() < chance) {
            if (passive.status_effect_id) {
              if (!target.statusEffects) {
                target.statusEffects = [];
              }
              const newStatusEffect = {
                name: passive.effectDetails.name,
                duration: passive.override_duration ?? passive.effectDetails.default_duration ?? 1,
                isNew: true,
                effectDetails: passive.effectDetails,
                override_value: passive.override_value,
              };
              target.statusEffects.push(newStatusEffect);
              battleState.battleLog.push(`${defenderName}'s ${passive.name} activated!`);
            }
          }
        }
      }

      // IMMUTABLE UPDATE: Find the target in the correct team array and update it for this hit.
      const targetTeamToUpdate = isPlayerTurn ? battleState.aiTeam : battleState.playerTeam;
      const targetUpdateIndex = targetTeamToUpdate.findIndex((m: any) => m.id === target.id);
      if (targetUpdateIndex !== -1) {
        const updatedTarget = { ...targetTeamToUpdate[targetUpdateIndex] };
        const currentHp = updatedTarget.battleHp || 0;
        updatedTarget.battleHp = Math.max(0, currentHp - damageResult.damage);
        targetTeamToUpdate[targetUpdateIndex] = updatedTarget;
      }

      // Add hit-specific damage message to battle log (for multi-hit tracking)
      if (numHits > 1) {
        battleState.battleLog.push(
          `${isPlayerTurn ? 'Your' : "Opponent's"} ${attackerName} hit ${isPlayerTurn ? "Opponent's" : 'Your'} ${defenderName} with ${ability.name || 'an ability'} (hit ${hitIndex + 1}/${numHits}), dealing ${damageResult.damage} damage!`,
        );
      }

      // Add detailed combat result messages based on damageResult for this hit
      if (damageResult.affinityMultiplier > 1.0) {
        battleState.battleLog.push("It's super effective!");
      }

      if (damageResult.affinityMultiplier < 1.0) {
        battleState.battleLog.push("It's not very effective...");
      }

      if (damageResult.isCritical) {
        battleState.battleLog.push('A critical hit!');
      }
    }

    // Add target-specific damage summary messages
    const abilityName = ability.name || 'an ability';
    if (numHits === 1) {
      // Single hit - add target-specific damage message
      if (targets.length > 1) {
        // AoE single hit
        battleState.battleLog.push(`${attackerName} used ${abilityName} on ${defenderName}, dealing ${targetDamage} damage!`);
      } else {
        // Single target single hit - use original format
        battleState.battleLog.push(
          `${isPlayerTurn ? 'Your' : "Opponent's"} ${attackerName} used ${abilityName} on ${isPlayerTurn ? "Opponent's" : 'Your'} ${defenderName}, dealing ${targetDamage} damage!`,
        );
      }
    } else {
      // Multi-hit - add summary message after all hits (per-hit messages already added above)
      if (targets.length > 1) {
        // AoE multi-hit: show target-specific summary
        battleState.battleLog.push(`${abilityName} hit ${defenderName} ${numHits} times for a total of ${targetDamage} damage!`);
      } else {
        // Single target multi-hit: use original format
        battleState.battleLog.push(`${abilityName} hit ${numHits} times for a total of ${targetDamage} damage!`);
      }
    }

    // Apply status effects to the target
    if (ability.status_effect_id && ability.effectDetails) {
      const chance = ability.override_chance ?? ability.effectDetails.default_value ?? 1.0;

      if (Math.random() < chance) {
        const newStatusEffect = {
          name: ability.effectDetails.name,
          duration: ability.override_duration ?? ability.effectDetails.default_duration ?? 1,
          isNew: true,
          effectDetails: ability.effectDetails,
          override_value: ability.override_value,
        };

        if (!target.statusEffects) {
          target.statusEffects = [];
        }
        target.statusEffects.push(newStatusEffect);

        const effectName = ability.effectDetails.name.toLowerCase();
        battleState.battleLog.push(`${defenderName} was ${effectName}!`);
      }
    }

    // Apply stat modifiers to the target
    if (ability.stat_modifiers && Array.isArray(ability.stat_modifiers)) {
      for (const modifier of ability.stat_modifiers) {
        if (!target.activeEffects) {
          target.activeEffects = [];
        }
        const newEffect: ActiveEffect = {
          id: crypto.randomUUID(),
          stat: modifier.stat,
          type: modifier.type,
          value: modifier.value,
          duration: modifier.duration,
        };
        target.activeEffects.push(newEffect);
        battleState.battleLog.push(`${defenderName}'s ${modifier.stat} was lowered!`);
      }
    }
  }

  // Add total damage summary for AoE abilities
  if (targets.length > 1) {
    const abilityName = ability.name || 'an ability';
    battleState.battleLog.push(`${abilityName} hit ${targets.length} opponents for a total of ${totalDamage} damage!`);
  }

  await handleMonsterDefeatLogic(battleState);
  handleHpThresholds(battleState);

  // --- Check for ON_ABILITY_USE Passives on the Attacker (outside target loop) ---
  const attackerAbilities = battleState.abilities_map[attacker.monster?.id || attacker.id] || [];
  for (const passive of attackerAbilities) {
    if (passive.ability_type === 'PASSIVE' && passive.activation_trigger === 'ON_ABILITY_USE') {
      const triggerAffinity = passive.status_effect_trigger_affinity;
      if (triggerAffinity && ability.affinity !== triggerAffinity) {
        continue;
      }

      const chance = parseFloat(passive.override_chance || passive.effectDetails?.default_value || '1.0');
      if (Math.random() < chance && passive.status_effect_id && passive.effectDetails) {
        // Apply to primary target (first in targets array)
        const primaryTarget = targets[0];
        if (primaryTarget) {
          if (!primaryTarget.statusEffects) primaryTarget.statusEffects = [];

          const newStatusEffect = {
            name: passive.effectDetails.name,
            duration: passive.override_duration ?? passive.effectDetails.default_duration ?? 1,
            isNew: true,
            effectDetails: passive.effectDetails,
            override_value: passive.override_value,
          };
          primaryTarget.statusEffects.push(newStatusEffect);
          battleState.battleLog.push(`${attackerName}'s ${passive.name} activated!`);
        }
      }
    }
  }

  return totalDamageResult;
};

// Helper function to handle monster defeat, forced swaps, and battle end conditions
const handleMonsterDefeatLogic = async (battleState: any): Promise<void> => {
  // Check both teams for defeated monsters
  const playerMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];

  const playerHp =
    playerMonster.battleHp !== undefined
      ? playerMonster.battleHp
      : playerMonster.hp || 0;
  const aiHp =
    aiMonster.battleHp !== undefined ? aiMonster.battleHp : aiMonster.hp || 0;

  // Handle player monster defeat
  if (playerHp <= 0) {
    const defeatedMonsterName = playerMonster.monster.name;
    battleState.battleLog.push(`${defeatedMonsterName} has fainted!`);

    // Check if all player monsters are defeated
    const playerTeamDefeated = battleState.playerTeam.every((monster: any) => {
      const hp =
        monster.battleHp !== undefined ? monster.battleHp : monster.hp || 0;
      return hp <= 0;
    });

    if (playerTeamDefeated) {
      battleState.battleEnded = true;
      battleState.winner = 'ai';

      // Save final battle state for all player monsters
      try {
        await storage.saveFinalBattleState(battleState.playerTeam as any);
      } catch (error) {
        console.error('Error saving final battle state:', error);
      }
    } else {
      // Force player to swap
      battleState.turn = 'player-must-swap';
    }
  }

  // Handle AI monster defeat
  if (aiHp <= 0) {
    const defeatedMonsterName = aiMonster.monster?.name || aiMonster.name;
    battleState.battleLog.push(`${defeatedMonsterName} has fainted!`);

    // Check if all AI monsters are defeated
    const aiTeamDefeated = battleState.aiTeam.every((monster: any) => {
      const hp =
        monster.battleHp !== undefined ? monster.battleHp : monster.hp || 0;
      return hp <= 0;
    });

    if (aiTeamDefeated) {
      battleState.battleEnded = true;
      battleState.winner = 'player';

      // Server-authoritative battle completion with automatic XP awarding
      const playerTeam = battleState.playerTeam as UserMonster[];
      if (playerTeam.length > 0 && playerTeam[0].userId) {
        const winnerId = playerTeam[0].userId;
        const xpAmount = 50; // Standard XP award for battle victory

        try {
          await storage.concludeBattle(winnerId, xpAmount);
          battleState.battleLog.push(`Victory! Awarded ${xpAmount} XP!`);
        } catch (error) {
          console.error('Error awarding battle XP:', error);
          battleState.battleLog.push('Victory achieved but XP award failed!');
        }
      }

      // Save final battle state for all player monsters
      try {
        await storage.saveFinalBattleState(battleState.playerTeam as any);
      } catch (error) {
        console.error('Error saving final battle state:', error);
      }
    } else {
      // AI automatic swap - find next healthy AI monster
      const healthyAiIndex = battleState.aiTeam.findIndex((monster: any) => {
        const hp =
          monster.battleHp !== undefined ? monster.battleHp : monster.hp || 0;
        return hp > 0;
      });

      if (healthyAiIndex !== -1) {
        battleState.activeAiIndex = healthyAiIndex;
        const newAiMonster = battleState.aiTeam[healthyAiIndex];
        // CORRECTED NAME ACCESS:
        battleState.battleLog.push(`Opponent sends out ${newAiMonster.monster.name}!`);
      }
    }
  }
};

const handleHpThresholds = (battleState: any): void => {
  const allMonsters = [...battleState.playerTeam, ...battleState.aiTeam];
  allMonsters.forEach(monster => {
    const hpPercentage = (monster.battleHp / monster.battleMaxHp) * 100;
    if (hpPercentage > 50) return; // Only trigger below 50%

    const monsterAbilities = battleState.abilities_map[monster.monster?.id || monster.id] || [];
    const thresholdAbilities = monsterAbilities.filter((a: any) => a.activation_trigger === 'ON_HP_THRESHOLD');

    for (const passive of thresholdAbilities) {
      // Check if this effect has already been applied to prevent re-triggering
      const alreadyApplied = monster.activeEffects?.some((eff: any) => eff.sourceAbilityId === passive.id);
      if (alreadyApplied) continue;

      if (passive.stat_modifiers && Array.isArray(passive.stat_modifiers)) {
        battleState.battleLog.push(`${monster.monster?.name || monster.name}'s ${passive.name} activated!`);
        for (const modifier of passive.stat_modifiers) {
          const newEffect = {
            id: crypto.randomUUID(),
            sourceAbilityId: passive.id, // Track the source to prevent re-application
            stat: modifier.stat,
            type: modifier.type,
            value: modifier.value,
            duration: modifier.duration || 99, // Assume it lasts the whole battle unless specified
          };
          if (!monster.activeEffects) monster.activeEffects = [];
          monster.activeEffects.push(newEffect);
        }
      }
    }
  });
};

// Main damage calculation function
export const calculateDamage = (
  attacker: UserMonster | Monster,
  defender: UserMonster | Monster,
  ability: Ability,
): DamageResult => {
  const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as
    | 'power'
    | 'defense'
    | 'speed';
  const attackingPower = getModifiedStat(attacker, scalingStatName);
  const defendingDefense = getModifiedStat(defender, 'defense');
  const attackPower =
    attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
  const damageMultiplier = 100 / (100 + defendingDefense);
  let rawDamage = attackPower * damageMultiplier;
  const defenderMonster = 'monster' in defender ? defender.monster : defender;
  const affinityMultiplier = getAffinityMultiplier(
    ability.affinity,
    defenderMonster,
  );
  rawDamage *= affinityMultiplier;
  const isCritical = Math.random() < 0.05;
  if (isCritical) rawDamage *= 1.5;
  const variance = 0.9 + Math.random() * 0.2;
  rawDamage *= variance;
  const finalDamage = Math.round(Math.max(1, rawDamage));
  return { damage: finalDamage, isCritical, affinityMultiplier };
};

// Server-authoritative damage application function with 3-phase turn lifecycle
export const applyDamage = async (
  battleId: string,
  abilityId: number,
  targetId?: number,
) => {
  const originalState = battleSessions.get(battleId);
  if (!originalState) throw new Error(`Battle session ${battleId} not found`);

  // Create a deep copy of the state for this turn to ensure isolation
  const battleState = JSON.parse(JSON.stringify(originalState));

  // --- Fainted Monster Check ---
  const attacker = battleState.playerTeam[battleState.activePlayerIndex];
  if (attacker.battleHp <= 0) {
    throw new Error(`${attacker.monster.name} has 0 HP and cannot perform an action.`);
  }

  const activeMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const monsterAbilities =
    battleState.abilities_map[activeMonster.monster.id] || [];
  const ability = monsterAbilities.find((a: any) => a.id === abilityId);

  if (!ability) throw new Error(`Ability ${abilityId} not found`);
  if (activeMonster.battleMp < (ability.mp_cost || 0)) {
    throw new Error('Not enough MP');
  }

  // --- 3-PHASE TURN LIFECYCLE ---

  // 1. START-OF-TURN
  const startOfTurnResult = handleStartOfTurn(battleState, true);
  if (startOfTurnResult.turnSkipped) {
    handleEndOfTurn(battleState); // Process end-of-turn even if skipped
    battleSessions.set(battleId, battleState);
    return {
      damageResult: { damage: 0, isCritical: false, affinityMultiplier: 1.0 },
      battleState,
    };
  }

  // 2. ACTION
  const damageResult = await handleActionPhase(battleState, ability, targetId);
  await handleMonsterDefeatLogic(battleState);

  // 3. END-OF-TURN
  handleEndOfTurn(battleState);

  // Save the new state and return the result
  battleSessions.set(battleId, battleState);
  return { damageResult, battleState };
};

// Server-side battle session management
export const createBattleSession = async (
  playerTeam: UserMonster[],
  opponentTeam: Monster[],
  playerLeadMonsterIndex: number,
) => {
  // Generate unique battle ID
  const battleId = crypto.randomUUID();

  // Collect all unique monster IDs from both teams
  const allMonsterIds: number[] = [];

  // For player team, ID is at monster.id (nested monster object)
  for (const userMonster of playerTeam) {
    allMonsterIds.push(userMonster.monster.id);
  }

  // For AI team, ID is at monster.id
  for (const monster of opponentTeam) {
    allMonsterIds.push(monster.id);
  }

  // Get abilities for all monsters in the battle
  const abilitiesMap = await storage.getAbilitiesForMonsters(allMonsterIds);
  console.log('ABILITIES MAP:', JSON.stringify(abilitiesMap, null, 2));
  // Create initial battle state with standardized health properties
  const playerTeamCopy = JSON.parse(JSON.stringify(playerTeam)); // Deep copy to avoid mutations
  const aiTeamCopy = JSON.parse(JSON.stringify(opponentTeam)); // Deep copy to avoid mutations

  // Add battleHp and battleMaxHp to every monster in playerTeam
  for (const monster of playerTeamCopy) {
    monster.battleHp = monster.hp;
    monster.battleMaxHp = monster.maxHp;
    monster.battleMp = monster.mp;
    monster.battleMaxMp = monster.maxMp;
    monster.statusEffects = [];
    monster.activeEffects = [];
  }

  // Add battleHp and battleMaxHp to every monster in aiTeam
  for (const monster of aiTeamCopy) {
    monster.battleHp = monster.hp || 0;
    monster.battleMaxHp = monster.hp || 0; // AI monsters use hp as max
    monster.battleMp = monster.mp || 0;
    monster.battleMaxMp = monster.mp || 0; // AI monsters use mp as max
    monster.statusEffects = [];
    monster.activeEffects = [];
  }

  const battleState = {
    playerTeam: playerTeamCopy,
    aiTeam: aiTeamCopy,
    activePlayerIndex: playerLeadMonsterIndex,
    activeAiIndex: Math.floor(Math.random() * aiTeamCopy.length),
    turn: 'pre-battle' as Turn,
    battleEnded: false,
    winner: null as 'player' | 'ai' | null,
    battleLog: [] as string[],
    abilities_map: abilitiesMap, // Store abilities for entire battle duration
  };

  // Process ON_BATTLE_START passive abilities for both teams
  const allTeams = [
    { monsters: playerTeamCopy, teamName: 'Your' },
    { monsters: aiTeamCopy, teamName: "Opponent's" },
  ];

  for (const team of allTeams) {
    for (const monster of team.monsters) {
      const monsterId = monster.monsterId || monster.id;
      const monsterAbilities = abilitiesMap[monsterId] || [];

      for (const ability of monsterAbilities) {
        // Check if this is an ON_BATTLE_START passive ability
        if (
          ability.ability_type === 'PASSIVE' &&
          ability.activation_trigger === 'ON_BATTLE_START'
        ) {
          // Check for chance-based activation
          const activationChance = ability.status_effect_chance || 100;
          const roll = Math.random() * 100;

          if (roll < activationChance) {
            // Apply stat_modifiers to appropriate team
            const statModifiers = ability.stat_modifiers || [];

            for (const modifier of statModifiers) {
              const { stat, type, value } = modifier;

              // Apply stat changes to all monsters on the same team
              for (const teamMate of team.monsters) {
                if (stat && type && value !== undefined) {
                  const currentValue = teamMate[stat] || 0;

                  if (type === 'PERCENTAGE') {
                    teamMate[stat] = Math.floor(
                      currentValue * (1 + value / 100),
                    );
                  } else if (type === 'FLAT') {
                    teamMate[stat] = currentValue + value;
                  }
                }
              }
            }

            // Add activation message to battle log
            const monsterName = monster.monster?.name || monster.name;
            battleState.battleLog.push(
              `${team.teamName} ${monsterName}'s ${ability.name} activates, boosting team stats!`,
            );
          }
        }
      }
    }
  }

  // Add monster introduction messages
  const playerMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];

  battleState.battleLog.push(
    `${playerMonster.monster.name} enters the battle!`,
  );
  battleState.battleLog.push(`Opponent's ${aiMonster.name} appears!`);

  // Determine first turn by comparing speed stats (now potentially boosted by passives)
  const playerSpeed = playerMonster.speed || 0;
  const aiSpeed = aiMonster.speed || 0;

  if (playerSpeed >= aiSpeed) {
    battleState.turn = 'player';
  } else {
    battleState.turn = 'ai';
  }

  // Store battle session
  battleSessions.set(battleId, battleState);

  return {
    battleId,
    battleState,
  };
};

// Server-side AI turn processing with 3-phase lifecycle
export const processAiTurn = async (battleId: string) => {
  const originalState = battleSessions.get(battleId);
  if (!originalState) throw new Error(`Battle session ${battleId} not found`);
  if (originalState.turn !== 'ai') throw new Error('Not AI turn');

  // Create a deep copy of the state for this turn
  const battleState = JSON.parse(JSON.stringify(originalState));

  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];
  const monsterAbilities = battleState.abilities_map[aiMonster.id] || [];
  const activeAbilities = monsterAbilities.filter(
    (a: any) => a.ability_type === 'ACTIVE',
  );
  const affordableAbilities = activeAbilities.filter(
    (a: any) => (aiMonster.battleMp ?? 0) >= (a.mp_cost || 0),
  );

  let chosenAbility;
  if (affordableAbilities.length > 0) {
    chosenAbility =
      affordableAbilities[
        Math.floor(Math.random() * affordableAbilities.length)
      ];
  } else {
    chosenAbility =
      activeAbilities.find((a: any) => a.mp_cost === 0) || activeAbilities[0];
  }

  if (!chosenAbility) throw new Error('AI could not select an ability.');

  // --- 3-PHASE TURN LIFECYCLE FOR AI ---

  // 1. START-OF-TURN
  const startOfTurnResult = handleStartOfTurn(battleState, false);
  if (startOfTurnResult.turnSkipped) {
    handleEndOfTurn(battleState);
    battleSessions.set(battleId, battleState);
    return {
      damageResult: { damage: 0, isCritical: false, affinityMultiplier: 1.0 },
      battleState,
    };
  }

  // 2. ACTION
  const damageResult = await handleActionPhase(battleState, chosenAbility);
  await handleMonsterDefeatLogic(battleState);

  // 3. END-OF-TURN
  handleEndOfTurn(battleState);

  // Save the new state and return
  battleSessions.set(battleId, battleState);
  return { damageResult, battleState };
};

// Server-authoritative monster swapping function
export const performSwap = (battleId: string, newMonsterIndex: number) => {
  // Retrieve the current battle session from the battleSessions map
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  // Perform validation checks
  const newMonster = battleState.playerTeam[newMonsterIndex];
  if (!newMonster) {
    throw new Error('Invalid monster index');
  }

  if (newMonster.hp <= 0) {
    throw new Error('Cannot swap to a monster with 0 HP');
  }

  if (newMonsterIndex === battleState.activePlayerIndex) {
    throw new Error('Cannot swap to the same monster that is already active');
  }

  // Get the name of the monster currently in the active slot
  const currentMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const currentMonsterName = currentMonster.monster.name;

  // Get the name of the new monster at the newMonsterIndex
  const newMonsterName = newMonster.monster.name;

  // Add two messages to the battleLog
  battleState.battleLog.push(`${currentMonsterName} withdrew from battle!`);
  battleState.battleLog.push(`${newMonsterName} enters the battle!`);

  // Update the activePlayerIndex to the newMonsterIndex
  battleState.activePlayerIndex = newMonsterIndex;

  // The player's action was to swap, so now we process the end of their turn.
  // handleEndOfTurn will correctly process effects and switch the turn to the AI.
  handleEndOfTurn(battleState);

  // Save the updated battle state back into the battleSessions map
  battleSessions.set(battleId, battleState);

  // Return the entire battleState object
  return battleState;
};

export const processForfeit = (battleId: string) => {
  const battleState = battleSessions.get(battleId);
  if (!battleState) throw new Error(`Battle session ${battleId} not found`);

  // Forfeiting simply moves to the end-of-turn phase.
  handleEndOfTurn(battleState);

  battleSessions.set(battleId, battleState);
  return battleState;
};
