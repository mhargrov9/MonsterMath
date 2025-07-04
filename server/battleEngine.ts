// Import shared types for the battle system
import { DamageResult, UserMonster, Monster, Ability, Turn } from '../shared/types.js';
import { storage } from './storage.js';
import crypto from 'crypto';

// In-memory store for active battle sessions
const battleSessions = new Map();

// Helper function to get modified stats (can be expanded with activeEffects later)
const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
  // This function can be expanded with activeEffects later
  if ('monster' in monster) { // It's a UserMonster
      return monster[statName];
  }
  // It's a base Monster for the AI
  const baseStatMap = {
      power: 'basePower',
      defense: 'baseDefense',
      speed: 'baseSpeed'
  } as const;
  return (monster as any)[baseStatMap[statName]] || 0;
};

// Helper function to calculate type effectiveness
const getAffinityMultiplier = (attackAffinity: string | null | undefined, defender: Monster): number => {
  if (!attackAffinity) return 1.0;
  const lower = attackAffinity.toLowerCase();
  if (defender.weaknesses && Array.isArray(defender.weaknesses)) {
    if (defender.weaknesses.map((w: any) => w.toLowerCase()).includes(lower)) return 2.0;
  }
  if (defender.resistances && Array.isArray(defender.resistances)) {
    if (defender.resistances.map((r: any) => r.toLowerCase()).includes(lower)) return 0.5;
  }
  return 1.0;
};

// PHASE 1: Start of Turn - Handle status effects, DoT, and turn-skipping
const handleStartOfTurn = (battleState: any, isPlayerTurn: boolean): { turnSkipped: boolean } => {
  const currentTeam = isPlayerTurn ? battleState.playerTeam : battleState.aiTeam;
  const activeIndex = isPlayerTurn ? battleState.activePlayerIndex : battleState.activeAiIndex;
  const activeMonster = currentTeam[activeIndex];
  const teamName = isPlayerTurn ? "Your" : "Opponent's";
  
  // Check for turn-skipping status effects like PARALYZED
  const paralysisEffect = activeMonster.statusEffects?.find(
    (effect: any) => effect.name === 'PARALYZED',
  );

  if (paralysisEffect) {
    const PARALYSIS_CHANCE = 0.25; // 25% chance to be fully paralyzed
    if (Math.random() < PARALYSIS_CHANCE) {
      battleState.battleLog.push(
        `${teamName} ${activeMonster.monster?.name || activeMonster.name} is fully paralyzed and can't move!`,
      );
      return { turnSkipped: true };
    }
  }
  
  // TODO: Apply damage-over-time effects (BURNED, POISONED, etc.)
  // This will be implemented when status effects system is added
  
  // Trigger "start of turn" passive abilities for all monsters on the current team
  const allTeamMonsters = currentTeam;
  
  for (const monster of allTeamMonsters) {
    const monsterId = monster.monsterId || monster.id;
    const monsterAbilities = battleState.abilities_map[monsterId] || [];
    
    for (const ability of monsterAbilities) {
      // Check if this is a START_OF_TURN passive ability
      if (ability.ability_type === 'PASSIVE' && ability.activation_trigger === 'START_OF_TURN') {
        const isActiveMonster = monster === activeMonster;
        const isOnBench = monster !== activeMonster;
        
        // Check if activation scope matches monster's current status
        const scopeMatches = 
          (ability.activation_scope === 'ACTIVE' && isActiveMonster) ||
          (ability.activation_scope === 'BENCH' && isOnBench) ||
          (ability.activation_scope === 'SELF' && isActiveMonster) ||
          (ability.activation_scope === 'ALL_ALLIES');
        
        if (scopeMatches) {
          // Check for chance-based activation
          const activationChance = ability.status_effect_chance || 100;
          const roll = Math.random() * 100;
          
          if (roll < activationChance) {
            // Handle healing passive effects
            if (ability.status_effect_applies === 'HEALING') {
              let target = monster; // Default to self
              
              // Determine target based on activation scope
              if (ability.activation_scope === 'BENCH' && isOnBench) {
                target = activeMonster; // Bench passives heal active monster
              }
              
              const healingValue = ability.status_effect_value || 0;
              const maxHp = target.battleMaxHp || target.maxHp || 1;
              let actualHealing = 0;
              
              if (ability.status_effect_value_type === 'PERCENT_MAX_HP') {
                actualHealing = Math.floor(maxHp * (healingValue / 100));
              } else {
                actualHealing = healingValue; // FLAT healing
              }
              
              // Apply healing
              const currentHp = target.battleHp || target.hp || 0;
              const newHp = Math.min(maxHp, currentHp + actualHealing);
              const finalHealing = newHp - currentHp;
              
              target.battleHp = newHp;
              
              // Add to battle log
              const monsterName = monster.monster?.name || monster.name;
              const targetName = target.monster?.name || target.name;
              battleState.battleLog.push(`${monsterName}'s ${ability.name} activates at the start of turn, healing ${targetName} for ${finalHealing} HP.`);
            }
          }
        }
      }
    }
  }
  
  battleState.battleLog.push(`${teamName} ${activeMonster.monster?.name || activeMonster.name}'s turn begins!`);
  
  return { turnSkipped: false };
};

// PHASE 2: Action Phase - Handle the chosen action (ability or swap)
const handleActionPhase = async (battleState: any, ability: any, targetId?: number): Promise<DamageResult> => {
  // Route abilities based on their healing_power database field
  if (ability.healing_power && ability.healing_power > 0) {
    // This is a healing ability - use healing logic
    const isPlayerTurn = battleState.turn === 'player';
    const attackingTeam = isPlayerTurn ? battleState.playerTeam : battleState.aiTeam;
    const attackerIndex = isPlayerTurn ? battleState.activePlayerIndex : battleState.activeAiIndex;
    const attacker = attackingTeam[attackerIndex];
    
    // Find target using provided targetId or default to attacker (self-heal)
    let target = attacker; // Default fallback
    
    if (targetId !== undefined) {
      // Search for target in player team first
      const playerTarget = battleState.playerTeam.find((monster: any) => monster.id === targetId);
      if (playerTarget) {
        target = playerTarget;
      } else {
        // Search in AI team if not found in player team
        const aiTarget = battleState.aiTeam.find((monster: any) => monster.id === targetId);
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

// PHASE 3: End of Turn - Handle passives, duration countdown, and turn switching
const handleEndOfTurn = (battleState: any): void => {
  // Identify the team whose turn just ended
  const isPlayerTurnEnding = battleState.turn === 'player';
  const currentTeam = isPlayerTurnEnding ? battleState.playerTeam : battleState.aiTeam;
  const currentTeamName = isPlayerTurnEnding ? 'Your' : 'Opponent\'s';
  
  // Iterate through every monster on the team (active and bench)
  currentTeam.forEach((monster: any, index: number) => {
    const monsterId = monster.monster?.id || monster.id;
    const monsterName = monster.monster?.name || monster.name;
    const isActive = index === (isPlayerTurnEnding ? battleState.activePlayerIndex : battleState.activeAiIndex);
    
    // Get abilities for this monster from the abilities map
    const monsterAbilities = battleState.abilities_map[monsterId] || [];
    
    // Check each ability for END_OF_TURN passives
    monsterAbilities.forEach((ability: any) => {
      // Check if ability meets all criteria
      if (ability.ability_type === 'PASSIVE' && 
          ability.activation_trigger === 'END_OF_TURN') {
        
        // Check if activation scope matches monster's current status
        let scopeMatches = false;
        if ((ability.activation_scope === 'ACTIVE' || ability.activation_scope === 'SELF') && isActive) {
          scopeMatches = true;
        } else if (ability.activation_scope === 'BENCH' && !isActive) {
          scopeMatches = true;
        } else if (ability.activation_scope === 'ANY_POSITION' || ability.activation_scope === 'ALL_ALLIES') {
          scopeMatches = true;
        }
        
        if (scopeMatches) {
          // Chance validation
          let activates = true;
          if (ability.status_effect_chance !== null && ability.status_effect_chance !== undefined) {
            activates = Math.random() < ability.status_effect_chance;
          }
          
          if (activates) {
            // Execute effect - check for healing passives using correct database fields
            if (ability.status_effect_applies === 'HEALING') {
              // Determine correct target based on activation scope
              let target;
              let targetName;
              
              // Scopes that should heal the active monster
              if (ability.activation_scope === 'BENCH' || ability.activation_scope === 'ANY_POSITION' || ability.activation_scope === 'ALL_ALLIES') {
                const activeIndex = isPlayerTurnEnding ? battleState.activePlayerIndex : battleState.activeAiIndex;
                target = currentTeam[activeIndex];
                targetName = target.monster?.name || target.name;
              } 
              // Scopes that should heal the ability's owner
              else if (ability.activation_scope === 'ACTIVE' || ability.activation_scope === 'SELF') {
                target = monster;
                targetName = monsterName;
              }
              
              if (target) {
                const currentHp = target.battleHp || 0;
                const maxHp = target.battleMaxHp || 0;
                
                if (currentHp < maxHp) {
                  // Calculate heal amount based on database status_effect_value and type
                  let healAmount;
                  if (ability.status_effect_value_type === 'PERCENT_MAX_HP') {
                    healAmount = Math.floor(maxHp * (ability.status_effect_value / 100));
                  } else {
                    // Default to FLAT healing
                    healAmount = ability.status_effect_value || 0;
                  }
                  
                  // Apply healing with max HP cap
                  healAmount = Math.min(healAmount, maxHp - currentHp);
                  target.battleHp = currentHp + healAmount;
                  
                  // Log the passive activation with correct monster names
                  battleState.battleLog.push(`${currentTeamName} ${monsterName}'s ${ability.name} heals ${targetName} for ${healAmount} HP!`);
                }
              }
            }
          }
        }
      }
    });
  });
  
  // TODO: Decrement duration counters for status effects and remove expired effects
  // This will be implemented when status effects system is added
  
  // Switch turn control to opposing team
  if (battleState.turn === 'player') {
    battleState.turn = 'ai';
  } else if (battleState.turn === 'ai') {
    battleState.turn = 'player';
  }
};

// Helper function to execute healing abilities using database healing_power field
const executeHealingAbility = async (battleState: any, ability: any, attacker: any, target: any): Promise<DamageResult> => {
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
  
  // Apply healing, ensuring it doesn't exceed maxHp
  const newHp = Math.min(maxHp, currentHp + healingAmount);
  const actualHealing = newHp - currentHp;
  
  target.battleHp = newHp;

  // Add healing message to battle log
  const attackerName = attacker.monster?.name || attacker.name;
  const targetName = target.monster?.name || target.name;
  const abilityName = ability.name || 'healing ability';
  
  battleState.battleLog.push(`${attackerName}'s ${abilityName} heals ${targetName} for ${actualHealing} HP.`);

  // Return a DamageResult structure (with healing as negative damage for consistency)
  return {
    damage: -actualHealing, // Negative to indicate healing
    isCritical: false,
    affinityMultiplier: 1.0
  };
};

// Helper function to execute ability (extracted from existing applyDamage logic)
const executeAbility = async (battleState: any, ability: Ability): Promise<DamageResult> => {
  const isPlayerTurn = battleState.turn === 'player';
  const attackingTeam = isPlayerTurn ? battleState.playerTeam : battleState.aiTeam;
  const defendingTeam = isPlayerTurn ? battleState.aiTeam : battleState.playerTeam;
  const attackerIndex = isPlayerTurn ? battleState.activePlayerIndex : battleState.activeAiIndex;
  const defenderIndex = isPlayerTurn ? battleState.activeAiIndex : battleState.activePlayerIndex;
  
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
  
  // Apply damage to defender using standardized battleHp property
  const currentHp = defender.battleHp || 0;
  const newHp = Math.max(0, currentHp - damageResult.damage);
  defender.battleHp = newHp;
  
  // Add action to battle log with detailed damage information
  const attackerName = attacker.monster?.name || attacker.name;
  const defenderName = defender.monster?.name || defender.name;
  const abilityName = ability.name || 'an ability';
  battleState.battleLog.push(`${isPlayerTurn ? "Your" : "Opponent's"} ${attackerName} used ${abilityName} on ${isPlayerTurn ? "Opponent's" : "Your"} ${defenderName}, dealing ${damageResult.damage} damage!`);
  
  // Add detailed combat result messages based on damageResult
  if (damageResult.affinityMultiplier > 1.0) {
    battleState.battleLog.push("It's super effective!");
  }
  
  if (damageResult.affinityMultiplier < 1.0) {
    battleState.battleLog.push("It's not very effective...");
  }
  
  if (damageResult.isCritical) {
    battleState.battleLog.push("A critical hit!");
  }
  
  // Check if ability applies status effects
  if (ability.status_effect_applies) {
    // Get the chance from the database (e.g., 0.25 for 25%). Default to 1.0 (100%) if null.
    const statusEffectChance = ability.status_effect_chance ?? 1.0;

    // Compare the random float (0.0-1.0) directly against the probability
    if (Math.random() < statusEffectChance) {
      // Create new status effect object
      const statusEffect = {
        name: ability.status_effect_applies,
        duration: ability.status_effect_duration || 1,
      };

      // Add to target's statusEffects array
      if (!defender.statusEffects) {
        defender.statusEffects = [];
      }
      defender.statusEffects.push(statusEffect);

      // Add status effect message to battle log
      const defenderName = defender.monster?.name || defender.name;
      const effectName = ability.status_effect_applies.toLowerCase();
      battleState.battleLog.push(
        `${isPlayerTurn ? "Opponent's" : "Your"} ${defenderName} was ${effectName}!`,
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
  
  const playerHp = playerMonster.battleHp !== undefined ? playerMonster.battleHp : (playerMonster.hp || 0);
  const aiHp = aiMonster.battleHp !== undefined ? aiMonster.battleHp : (aiMonster.hp || 0);
  
  // Handle player monster defeat
  if (playerHp <= 0) {
    const defeatedMonsterName = playerMonster.monster.name;
    battleState.battleLog.push(`${defeatedMonsterName} has fainted!`);
    
    // Check if all player monsters are defeated
    const playerTeamDefeated = battleState.playerTeam.every((monster: any) => {
      const hp = monster.battleHp !== undefined ? monster.battleHp : (monster.hp || 0);
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
      const hp = monster.battleHp !== undefined ? monster.battleHp : (monster.hp || 0);
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
        const hp = monster.battleHp !== undefined ? monster.battleHp : (monster.hp || 0);
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
export const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => {
  const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
  const attackingPower = getModifiedStat(attacker, scalingStatName);
  const defendingDefense = getModifiedStat(defender, 'defense');
  const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
  const damageMultiplier = 100 / (100 + defendingDefense);
  let rawDamage = attackPower * damageMultiplier;
  const defenderMonster = 'monster' in defender ? defender.monster : defender;
  const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderMonster);
  rawDamage *= affinityMultiplier;
  const isCritical = Math.random() < 0.05;
  if (isCritical) rawDamage *= 1.5;
  const variance = 0.9 + Math.random() * 0.2;
  rawDamage *= variance;
  const finalDamage = Math.round(Math.max(1, rawDamage));
  return { damage: finalDamage, isCritical, affinityMultiplier };
};

// Server-authoritative damage application function with 3-phase turn lifecycle
export const applyDamage = async (battleId: string, abilityId: number, targetId?: number) => {
  // Retrieve battle state from sessions
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  const isPlayerTurn = battleState.turn === 'player';
  
  // Server-authoritative ability lookup from battleState
  let currentAttacker: UserMonster | Monster;
  if (isPlayerTurn) {
    currentAttacker = battleState.playerTeam[battleState.activePlayerIndex];
  } else {
    currentAttacker = battleState.aiTeam[battleState.activeAiIndex];
  }
  
  // Get the monster ID for ability lookup
  const monsterId = (currentAttacker as any).monsterId || (currentAttacker as any).id;
  const monsterAbilities = battleState.abilities_map[monsterId] || [];
  
  // Find the authoritative ability object from battleState
  const ability = monsterAbilities.find((a: any) => a.id === abilityId);
  if (!ability) {
    throw new Error(`Ability ${abilityId} not found for monster ${monsterId}`);
  }

  // LOG #1: Initial state after ability lookup
  if (isPlayerTurn) {
    const preActionMonster = battleState.playerTeam[battleState.activePlayerIndex];
    console.log(`-- START of applyDamage -- Monster: ${preActionMonster.monster.name}, HP: ${preActionMonster.battleHp}, MP: ${preActionMonster.battleMp}`);
  }
  
  // PHASE 1: START OF TURN - Handle status effects, DoT, and turn-skipping
  const startOfTurnResult = handleStartOfTurn(battleState, isPlayerTurn);
  
  // If turn is skipped due to status effects, skip action phase and go to end of turn
  if (startOfTurnResult.turnSkipped) {
    handleEndOfTurn(battleState);
    battleSessions.set(battleId, battleState);
    return {
      damageResult: { damage: 0, isCritical: false, affinityMultiplier: 1.0 },
      battleState
    };
  }

  // Server-side MP validation - check if attacker has enough MP before action phase
  const attackerCurrentMp = (currentAttacker as any).battleMp || (currentAttacker as any).mp || 0;
  const abilityCost = ability.mp_cost || 0;
  
  if (attackerCurrentMp < abilityCost) {
    throw new Error('Not enough MP');
  }

  // PHASE 2: ACTION PHASE - Execute the chosen ability
  const damageResult = await handleActionPhase(battleState, ability, targetId);

  // Check for monster defeat and handle forced swaps/battle end conditions
  await handleMonsterDefeatLogic(battleState);

  // PHASE 3: END OF TURN - Handle passives, duration countdown, and turn switching
  handleEndOfTurn(battleState);

  // Update the battle session
  battleSessions.set(battleId, battleState);

  return {
    damageResult,
    battleState
  };
};

// Server-side battle session management
export const createBattleSession = async (playerTeam: UserMonster[], opponentTeam: Monster[], playerLeadMonsterIndex: number) => {
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
  console.log("ABILITIES MAP:", JSON.stringify(abilitiesMap, null, 2));
  // Create initial battle state with standardized health properties
  const playerTeamCopy = JSON.parse(JSON.stringify(playerTeam)); // Deep copy to avoid mutations
  const aiTeamCopy = JSON.parse(JSON.stringify(opponentTeam));   // Deep copy to avoid mutations
  
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
    abilities_map: abilitiesMap // Store abilities for entire battle duration
  };

  // Process ON_BATTLE_START passive abilities for both teams
  const allTeams = [
    { monsters: playerTeamCopy, teamName: 'Your' },
    { monsters: aiTeamCopy, teamName: 'Opponent\'s' }
  ];

  for (const team of allTeams) {
    for (const monster of team.monsters) {
      const monsterId = monster.monsterId || monster.id;
      const monsterAbilities = abilitiesMap[monsterId] || [];
      
      for (const ability of monsterAbilities) {
        // Check if this is an ON_BATTLE_START passive ability
        if (ability.ability_type === 'PASSIVE' && ability.activation_trigger === 'ON_BATTLE_START') {
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
                    teamMate[stat] = Math.floor(currentValue * (1 + value / 100));
                  } else if (type === 'FLAT') {
                    teamMate[stat] = currentValue + value;
                  }
                }
              }
            }
            
            // Add activation message to battle log
            const monsterName = monster.monster?.name || monster.name;
            battleState.battleLog.push(`${team.teamName} ${monsterName}'s ${ability.name} activates, boosting team stats!`);
          }
        }
      }
    }
  }

  // Add monster introduction messages
  const playerMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];
  
  battleState.battleLog.push(`${playerMonster.monster.name} enters the battle!`);
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
    battleState
  };
};



// Server-side AI turn processing with 3-phase lifecycle
export const processAiTurn = async (battleId: string) => {
  // Retrieve battle state from sessions
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  if (battleState.turn !== 'ai') {
    throw new Error('Not AI turn');
  }

  // PHASE 1: START OF TURN - Handle status effects, DoT, and turn-skipping
  const startOfTurnResult = handleStartOfTurn(battleState, false); // false = AI turn
  
  // If turn is skipped due to status effects, skip action phase and go to end of turn
  if (startOfTurnResult.turnSkipped) {
    handleEndOfTurn(battleState);
    battleSessions.set(battleId, battleState);
    return {
      damageResult: { damage: 0, isCritical: false, affinityMultiplier: 1.0 },
      battleState
    };
  }

  // Get current AI monster
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];
  
  // Get the AI monster's abilities from the abilities_map
  const monsterAbilities = battleState.abilities_map[aiMonster.id] || [];
  
  if (monsterAbilities.length === 0) {
    throw new Error(`No abilities found for AI monster ${aiMonster.id}`);
  }
  
  // Filter to only ACTIVE abilities (AI cannot use PASSIVE abilities as actions)
  const activeAbilities = monsterAbilities.filter((ability: any) => 
    ability.ability_type === 'ACTIVE'
  );
  
  // Filter abilities the AI can afford based on current MP
  const affordableAbilities = activeAbilities.filter((ability: any) => 
    (aiMonster.mp ?? 0) >= (ability.mp_cost || 0)
  );

  let chosenAbility;
  
  if (affordableAbilities.length === 0) {
    // Find the monster's basic attack from the active abilities list
    const basicAttack = activeAbilities.find((ability: any) => 
      ability.name.toLowerCase().includes('basic') || 
      ability.name.toLowerCase().includes('attack') ||
      ability.mp_cost === 0
    );
    
    if (basicAttack) {
      chosenAbility = basicAttack;
    } else {
      // Fallback to first active ability if no basic attack found
      chosenAbility = activeAbilities[0];
    }
  } else {
    // Randomly select from affordable abilities
    chosenAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
  }

  // PHASE 2: ACTION PHASE - Execute the chosen ability (AI turn doesn't use targetId)
  const damageResult = await handleActionPhase(battleState, chosenAbility);

  // Check for monster defeat and handle forced swaps/battle end conditions
  await handleMonsterDefeatLogic(battleState);

  // PHASE 3: END OF TURN - Handle passives, duration countdown, and turn switching
  handleEndOfTurn(battleState);

  // Update the battle session
  battleSessions.set(battleId, battleState);

  return {
    damageResult,
    battleState
  };
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

  // Handle turn transition based on current state
  if (battleState.turn === 'player-must-swap') {
    // If this was a forced swap, transition to AI turn
    battleState.turn = 'ai';
  } else {
    // For voluntary swaps during player turn, transition to AI turn
    battleState.turn = 'ai';
  }

  // Save the updated battle state back into the battleSessions map
  battleSessions.set(battleId, battleState);

  // Return the entire battleState object
  return battleState;
};