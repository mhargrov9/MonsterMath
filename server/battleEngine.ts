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
  
  // TODO: Check for turn-skipping status effects (PARALYZED, FROZEN, etc.)
  // This will be implemented when status effects system is added
  // For now, no turn skipping occurs
  
  // TODO: Apply damage-over-time effects (BURNED, POISONED, etc.)
  // This will be implemented when status effects system is added
  
  // TODO: Trigger "start of turn" passive abilities
  // This will be implemented when passive abilities system is added
  
  battleState.battleLog.push(`${teamName} ${activeMonster.monster?.name || activeMonster.name}'s turn begins!`);
  
  return { turnSkipped: false };
};

// PHASE 2: Action Phase - Handle the chosen action (ability or swap)
const handleActionPhase = async (battleState: any, ability: Ability): Promise<DamageResult> => {
  // This encapsulates the existing ability execution logic
  // All existing damage calculation and application logic goes here
  return await executeAbility(battleState, ability);
};

// PHASE 3: End of Turn - Handle passives, duration countdown, and turn switching
const handleEndOfTurn = async (battleState: any): Promise<void> => {
  // Step A: Identify the team whose turn just ended
  const currentTurn = battleState.turn;
  let teamWhoseTurnEnded: (UserMonster | Monster)[];
  let activeMonsterIndex: number;
  
  if (currentTurn === 'player') {
    teamWhoseTurnEnded = battleState.playerTeam;
    activeMonsterIndex = battleState.activePlayerIndex;
  } else if (currentTurn === 'ai') {
    teamWhoseTurnEnded = battleState.aiTeam;
    activeMonsterIndex = battleState.activeAiIndex;
  } else {
    // Handle other turn states (like 'player-must-swap') - no passive triggers
    return;
  }
  
  // Step B: Scan for and apply END_OF_TURN passive abilities
  for (let i = 0; i < teamWhoseTurnEnded.length; i++) {
    const monster = teamWhoseTurnEnded[i];
    const isActiveMonster = (i === activeMonsterIndex);
    
    // Get monster ID (different structure for UserMonster vs Monster)
    const monsterId = 'monster' in monster ? monster.monster.id : monster.id;
    
    // Get abilities for this monster from the abilities_map
    const monsterAbilities = battleState.abilities_map[monsterId] || [];
    
    // Check each ability for END_OF_TURN passive triggers
    for (const ability of monsterAbilities) {
      // Check if ability meets END_OF_TURN passive criteria
      if (ability.ability_type === 'PASSIVE' && ability.activation_trigger === 'END_OF_TURN') {
        
        // Check activation scope
        let shouldActivate = false;
        if (ability.activation_scope === 'ACTIVE' && isActiveMonster) {
          shouldActivate = true;
        } else if (ability.activation_scope === 'BENCH' && !isActiveMonster) {
          shouldActivate = true;
        }
        
        if (shouldActivate) {
          // Step C: Execute the effect and log it
          await executePassiveAbility(battleState, monster, ability, currentTurn);
        }
      }
    }
  }
  
  // TODO: Decrement duration counters for status effects and remove expired effects
  // This will be implemented when status effects system is added
  
  // Switch turn control to opposing team
  if (battleState.turn === 'player') {
    battleState.turn = 'ai';
  } else if (battleState.turn === 'ai') {
    battleState.turn = 'player';
  }
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
  
  // Apply damage to defender
  const currentHp = defender.battleHp !== undefined ? defender.battleHp : (defender.hp || 0);
  const newHp = Math.max(0, currentHp - damageResult.damage);
  
  if ('battleHp' in defender) {
    defender.battleHp = newHp;
  } else {
    defender.hp = newHp;
  }
  
  // Add action to battle log
  const attackerName = attacker.monster?.name || attacker.name;
  const abilityName = ability.name || 'an ability';
  battleState.battleLog.push(`${isPlayerTurn ? "Your" : "Opponent's"} ${attackerName} used ${abilityName}!`);
  
  return damageResult;
};

// Helper function to execute passive ability effects
const executePassiveAbility = async (battleState: any, monster: UserMonster | Monster, ability: any, currentTurn: string): Promise<void> => {
  // Get monster name for logging
  const monsterName = 'monster' in monster ? monster.monster.name : monster.name;
  
  // Execute specific passive ability effects based on ability name/properties
  switch (ability.name) {
    case 'Soothing Aura':
      // Heal the active monster for a percentage of its Max HP
      await applySoothingAuraEffect(battleState, monsterName, currentTurn);
      break;
    
    case 'Static Charge':
    case 'Crystalize':
    case 'Tailwind':
    case 'Soot Cloud':
      // Future passive abilities will be implemented here
      battleState.battleLog.push(`${monsterName}'s ${ability.name} activates! (Effect not yet implemented)`);
      break;
    
    default:
      // Generic passive activation message for unknown abilities
      battleState.battleLog.push(`${monsterName}'s ${ability.name} activates!`);
      break;
  }
};

// Helper function to apply Soothing Aura healing effect
const applySoothingAuraEffect = async (battleState: any, casterName: string, currentTurn: string): Promise<void> => {
  // Determine which team and active monster to heal
  let targetTeam: (UserMonster | Monster)[];
  let activeIndex: number;
  
  if (currentTurn === 'player') {
    targetTeam = battleState.playerTeam;
    activeIndex = battleState.activePlayerIndex;
  } else {
    targetTeam = battleState.aiTeam;
    activeIndex = battleState.activeAiIndex;
  }
  
  const activeMonster = targetTeam[activeIndex];
  const activeMonsterName = 'monster' in activeMonster ? activeMonster.monster.name : activeMonster.name;
  
  // Get current and max HP
  const currentHp = activeMonster.battleHp !== undefined ? activeMonster.battleHp : (activeMonster.hp || 0);
  const maxHp = activeMonster.maxHp || 0;
  
  // Calculate healing amount (3% of max HP as per database design document)
  const healingAmount = Math.floor(maxHp * 0.03);
  const newHp = Math.min(maxHp, currentHp + healingAmount);
  
  // Apply healing
  if ('battleHp' in activeMonster) {
    activeMonster.battleHp = newHp;
  } else {
    activeMonster.hp = newHp;
  }
  
  // Add descriptive message to battle log
  battleState.battleLog.push(`${casterName}'s Soothing Aura heals ${activeMonsterName} for ${healingAmount} HP.`);
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
        await storage.saveFinalBattleState(battleState.playerTeam as UserMonster[]);
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
        await storage.saveFinalBattleState(battleState.playerTeam as UserMonster[]);
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
export const applyDamage = async (battleId: string, ability: Ability) => {
  // Retrieve battle state from sessions
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  const isPlayerTurn = battleState.turn === 'player';
  
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
  let currentAttacker: UserMonster | Monster;
  if (isPlayerTurn) {
    currentAttacker = battleState.playerTeam[battleState.activePlayerIndex];
  } else {
    currentAttacker = battleState.aiTeam[battleState.activeAiIndex];
  }
  
  const attackerCurrentMp = currentAttacker.mp || 0;
  const abilityCost = ability.mp_cost || 0;
  
  if (attackerCurrentMp < abilityCost) {
    throw new Error('Not enough MP');
  }

  // PHASE 2: ACTION PHASE - Execute the chosen ability
  const damageResult = await handleActionPhase(battleState, ability);

  // Check for monster defeat and handle forced swaps/battle end conditions
  await handleMonsterDefeatLogic(battleState);

  // PHASE 3: END OF TURN - Handle passives, duration countdown, and turn switching
  await handleEndOfTurn(battleState);

  // Update the battle session
  battleSessions.set(battleId, battleState);

  return {
    damageResult,
    battleState
  };
};

// Server-side battle session management
export const startBattle = async (playerTeam: UserMonster[], opponentTeam: Monster[]) => {
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
  
  // Create initial battle state
  const battleState = {
    playerTeam: JSON.parse(JSON.stringify(playerTeam)), // Deep copy to avoid mutations
    aiTeam: JSON.parse(JSON.stringify(opponentTeam)),   // Deep copy to avoid mutations
    activePlayerIndex: 0,
    activeAiIndex: 0,
    turn: 'pre-battle' as Turn,
    battleEnded: false,
    winner: null as 'player' | 'ai' | null,
    battleLog: [] as string[],
    abilities_map: abilitiesMap // Store abilities for entire battle duration
  };
  
  // Store battle session
  battleSessions.set(battleId, battleState);
  
  return {
    battleId,
    battleState
  };
};

// Server-side lead selection and turn determination
export const selectLeadAndDetermineTurn = (battleId: string, playerMonsterIndex: number) => {
  // Retrieve the current battle session from the battleSessions map
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  // Set the activePlayerIndex to the playerMonsterIndex passed into the function
  battleState.activePlayerIndex = playerMonsterIndex;

  // Randomly generate an index for the AI's lead monster and set the activeAiIndex
  battleState.activeAiIndex = Math.floor(Math.random() * battleState.aiTeam.length);

  // Get the full player monster object and the AI monster object from their respective teams
  const playerMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];

  // Add two new string messages to the battleLog array
  battleState.battleLog.push(`${playerMonster.monster.name} enters the battle!`);
  battleState.battleLog.push(`Opponent's ${aiMonster.name} appears!`);

  // Compare the speed stat of the player's monster to the speed stat of the AI's monster
  const playerSpeed = playerMonster.speed || 0;
  const aiSpeed = aiMonster.speed || 0;

  // Set the turn property based on speed comparison
  if (playerSpeed >= aiSpeed) {
    battleState.turn = 'player';
  } else {
    battleState.turn = 'ai';
  }

  // Update the session in the battleSessions map with the modified battle state
  battleSessions.set(battleId, battleState);

  // Return the entire battle state object
  return battleState;
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
    await handleEndOfTurn(battleState);
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
  
  // Filter abilities the AI can afford based on current MP
  const affordableAbilities = monsterAbilities.filter((ability: any) => 
    (aiMonster.mp ?? 0) >= (ability.mp_cost || 0)
  );

  let chosenAbility;
  
  if (affordableAbilities.length === 0) {
    // Find the monster's basic attack from its full ability list
    const basicAttack = monsterAbilities.find((ability: any) => 
      ability.name.toLowerCase().includes('basic') || 
      ability.name.toLowerCase().includes('attack') ||
      ability.mp_cost === 0
    );
    
    if (basicAttack) {
      chosenAbility = basicAttack;
    } else {
      // Fallback to first ability if no basic attack found
      chosenAbility = monsterAbilities[0];
    }
  } else {
    // Randomly select from affordable abilities
    chosenAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
  }

  // PHASE 2: ACTION PHASE - Execute the chosen ability
  const damageResult = await handleActionPhase(battleState, chosenAbility);

  // Check for monster defeat and handle forced swaps/battle end conditions
  await handleMonsterDefeatLogic(battleState);

  // PHASE 3: END OF TURN - Handle passives, duration countdown, and turn switching
  await handleEndOfTurn(battleState);

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