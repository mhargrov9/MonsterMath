// Import shared types for the battle system
import {
  DamageResult,
  UserMonster,
  Monster,
  Ability,
  Turn,
  StatusEffect,
} from '../shared/types.js';
import { storage } from './storage.js';
import crypto from 'crypto';

// In-memory store for active battle sessions
const battleSessions = new Map();

// Helper function to get modified stats (can be expanded with activeEffects later)
export const getModifiedStat = (
  monster: UserMonster | Monster,
  statName: 'power' | 'defense' | 'speed',
): number => {
  // This function can be expanded with activeEffects later
  if ('monster' in monster) {
    // It's a UserMonster
    return monster[statName];
  }
  // It's a base Monster for the AI
  const baseStatMap = {
    power: 'basePower',
    defense: 'baseDefense',
    speed: 'baseSpeed',
  } as const;
  return (monster as any)[baseStatMap[statName]] || 0;
};

// Helper function to calculate type effectiveness
const getAffinityMultiplier = (
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
const handleStartOfTurn = (
  battleState: any,
  isPlayerTurn: boolean,
): { turnSkipped: boolean } => {
  const currentTeam = isPlayerTurn
    ? battleState.playerTeam
    : battleState.aiTeam;
  const activeIndex = isPlayerTurn
    ? battleState.activePlayerIndex
    : battleState.activeAiIndex;
  const activeMonster = currentTeam[activeIndex];
  const teamName = isPlayerTurn ? 'Your' : "Opponent's";

  if (activeMonster.statusEffects && activeMonster.statusEffects.length > 0) {
    for (const effect of activeMonster.statusEffects) {
      if (!effect.effectDetails) continue;

      switch (effect.effectDetails.effect_type) {
        case 'TURN_SKIP': {
          // For PARALYZED
          battleState.battleLog.push(
            `${teamName} ${activeMonster.monster?.name || activeMonster.name} is paralyzed and can't move!`,
          );
          return { turnSkipped: true };
        }

        case 'DISRUPTION': {
          // For CONFUSED
          const confusionChance = parseFloat(
            effect.effectDetails.default_value || '0.5',
          );

          // Read chance from the database (default_value), with a fallback.

          if (Math.random() < confusionChance) {
            const monsterName =
              activeMonster.monster?.name || activeMonster.name;
            // Read self-damage modifier from the database (secondary_value), with a fallback.
            const selfDamageModifier = parseFloat(
              effect.effectDetails.secondary_value || '0.4',
            );

            // Calculate self-damage based on the monster's own power stat.
            const selfDamage = Math.floor(
              getModifiedStat(activeMonster, 'power') * selfDamageModifier,
            );

            if (selfDamage > 0) {
              activeMonster.battleHp = Math.max(
                0,
                activeMonster.battleHp - selfDamage,
              );
              battleState.battleLog.push(
                `${teamName} ${monsterName} is confused and hurt itself for ${selfDamage} damage!`,
              );
            }

            // The turn is skipped after self-damage.
            return { turnSkipped: true };
          }
          break; // If confusion check fails, do nothing and proceed.
        }
      }
    }
  }

  battleState.battleLog.push(
    `${teamName} ${activeMonster.monster?.name || activeMonster.name}'s turn begins!`,
  );
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
            case 'DAMAGE_OVER_TIME':
              // Calculate damage based on database values
              let damageAmount;
              const effectValue =
                effect.override_value ||
                effect.effectDetails.default_value ||
                0;

              if (effect.effectDetails.value_type === 'PERCENT_MAX_HP') {
                const maxHp = monster.battleMaxHp || 0;
                damageAmount = Math.floor(maxHp * (effectValue / 100));
              } else {
                // Default to FLAT damage
                damageAmount = effectValue;
              }

              // Apply damage
              const currentHp = monster.battleHp || 0;
              const newHp = Math.max(currentHp - damageAmount, 0);
              monster.battleHp = newHp;

              // Add battle log message
              battleState.battleLog.push(
                `${currentTeamName} ${monsterName} takes ${damageAmount} damage from ${effect.effectDetails.name}!`,
              );
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

        // Manage duration
        let shouldDecrementDuration = false;
        // A new effect should not have its duration decremented on the turn it is applied.
        if (effect.isNew) {
          delete effect.isNew; // Remove the flag for the next turn
        } else {
          const reductionPos = effect.effectDetails.duration_reduction_position;
          if (
            reductionPos === 'ANY' ||
            (reductionPos === 'ACTIVE_ONLY' && isActive)
          ) {
            shouldDecrementDuration = true;
          }
        }

        if (shouldDecrementDuration && effect.duration !== null) {
          effect.duration -= 1;
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
  });

  // After processing all monsters, switch the turn to the other player
  battleState.turn = isPlayerTurnEnding ? 'ai' : 'player';
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
const executeAbility = async (
  battleState: any,
  ability: Ability,
): Promise<DamageResult> => {
  const isPlayerTurn = battleState.turn === 'player';
  const attackingTeam = isPlayerTurn
    ? battleState.playerTeam
    : battleState.aiTeam;
  const defendingTeam = isPlayerTurn
    ? battleState.aiTeam
    : battleState.playerTeam;
  const attackerIndex = isPlayerTurn
    ? battleState.activePlayerIndex
    : battleState.activeAiIndex;
  const defenderIndex = isPlayerTurn
    ? battleState.activeAiIndex
    : battleState.activePlayerIndex;

  const attacker = attackingTeam[attackerIndex];
  const defender = defendingTeam[defenderIndex];

  // Calculate damage using existing logic
  const damageResult = calculateDamage(attacker, defender, ability);

  // Apply MP cost to attacker
  const mpCost = ability.mp_cost || 0;
  if ('battleMp' in attacker) {
    attacker.battleMp = (attacker.battleMp || attacker.mp || 0) - mpCost;
  } else {
    attacker.mp = (attacker.mp || 0) - mpCost;
  }

  // IMMUTABLE UPDATE: Find the defender in the correct team array and update it.
  const defenderTeamToUpdate = isPlayerTurn
    ? battleState.aiTeam
    : battleState.playerTeam;
  const defenderUpdateIndex = defenderTeamToUpdate.findIndex(
    (m: UserMonster) => m.id === defender.id,
  );
  if (defenderUpdateIndex !== -1) {
    const updatedDefender = { ...defenderTeamToUpdate[defenderUpdateIndex] };
    const currentHp = updatedDefender.battleHp || 0;
    updatedDefender.battleHp = Math.max(0, currentHp - damageResult.damage);
    defenderTeamToUpdate[defenderUpdateIndex] = updatedDefender;
  }

  // Add action to battle log with detailed damage information
  const attackerName = attacker.monster?.name || attacker.name;
  const defenderName = defender.monster?.name || defender.name;
  const abilityName = ability.name || 'an ability';
  battleState.battleLog.push(
    `${isPlayerTurn ? 'Your' : "Opponent's"} ${attackerName} used ${abilityName} on ${isPlayerTurn ? "Opponent's" : 'Your'} ${defenderName}, dealing ${damageResult.damage} damage!`,
  );

  // Add detailed combat result messages based on damageResult
  if (damageResult.affinityMultiplier > 1.0) {
    battleState.battleLog.push("It's super effective!");
  }

  if (damageResult.affinityMultiplier < 1.0) {
    battleState.battleLog.push("It's not very effective...");
  }

  if (damageResult.isCritical) {
    battleState.battleLog.push('A critical hit!');
  }

  // Check if ability applies a status effect using the new normalized structure
  if (ability.status_effect_id && ability.effectDetails) {
    // Use override values from the ability, or fall back to the defaults from the status_effect
    const chance =
      ability.override_chance ?? ability.effectDetails.default_value ?? 1.0;

    // Compare the random float (0.0-1.0) directly against the probability
    if (Math.random() < chance) {
      // Create a complete status effect object to be applied to the monster
      const newStatusEffect = {
        name: ability.effectDetails.name,
        duration:
          ability.override_duration ??
          ability.effectDetails.default_duration ??
          1,
        isNew: true, // Add this line
        // Pass the full details object for the engine to use in other functions
        effectDetails: ability.effectDetails,
        // Pass ability-specific override values
        override_value: ability.override_value,
      };

      // Add to target's statusEffects array
      if (!defender.statusEffects) {
        defender.statusEffects = [];
      }
      defender.statusEffects.push(newStatusEffect);

      // Add status effect message to battle log
      const defenderName = defender.monster?.name || defender.name;
      const effectName = ability.effectDetails.name.toLowerCase();
      battleState.battleLog.push(
        `${isPlayerTurn ? "Opponent's" : 'Your'} ${defenderName} was ${effectName}!`,
      );
    }
  }

  return damageResult;
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
    const defeatedMonsterName = aiMonster.name;
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
        battleState.battleLog.push(`Opponent sends out ${newAiMonster.name}!`);
      }
    }
  }
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
  }

  // Add battleHp and battleMaxHp to every monster in aiTeam
  for (const monster of aiTeamCopy) {
    monster.battleHp = monster.hp || 0;
    monster.battleMaxHp = monster.hp || 0; // AI monsters use hp as max
    monster.battleMp = monster.mp || 0;
    monster.battleMaxMp = monster.mp || 0; // AI monsters use mp as max
    monster.statusEffects = [];
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
