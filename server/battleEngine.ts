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

// Server-authoritative damage application function with battle session management
export const applyDamage = (battleId: string, ability: Ability) => {
  // Retrieve battle state from sessions
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  // Identify attacker and defender based on current turn
  let attacker: UserMonster | Monster;
  let defender: UserMonster | Monster;
  let attackerTeam: (UserMonster | Monster)[];
  let defenderTeam: (UserMonster | Monster)[];
  let attackerIndex: number;
  let defenderIndex: number;

  if (battleState.turn === 'player') {
    attacker = battleState.playerTeam[battleState.activePlayerIndex];
    defender = battleState.aiTeam[battleState.activeAiIndex];
    attackerTeam = battleState.playerTeam;
    defenderTeam = battleState.aiTeam;
    attackerIndex = battleState.activePlayerIndex;
    defenderIndex = battleState.activeAiIndex;
  } else {
    attacker = battleState.aiTeam[battleState.activeAiIndex];
    defender = battleState.playerTeam[battleState.activePlayerIndex];
    attackerTeam = battleState.aiTeam;
    defenderTeam = battleState.playerTeam;
    attackerIndex = battleState.activeAiIndex;
    defenderIndex = battleState.activePlayerIndex;
  }

  // Log the action being performed (server-authoritative action logging)
  let attackerName: string;
  if (battleState.turn === 'player') {
    // Player's monster is a UserMonster object - name is at attacker.monster.name
    attackerName = (attacker as UserMonster).monster.name;
  } else {
    // AI's monster is a Monster object - name is at attacker.name
    attackerName = (attacker as Monster).name;
  }
  
  // Create and add the action log message
  const actionMessage = `${attackerName} used ${ability.name}!`;
  battleState.battleLog.push(actionMessage);

  // Calculate damage using existing function
  const damageResult = calculateDamage(attacker, defender, ability);
  
  // Calculate new HP for defender
  const currentDefenderHp = defender.hp ?? 0;
  const newHp = Math.max(0, currentDefenderHp - damageResult.damage);
  
  // Calculate new MP for attacker
  const currentAttackerMp = attacker.mp ?? 0;
  const newMp = Math.max(0, currentAttackerMp - (ability.mp_cost || 0));

  // Update battle state with new HP/MP values
  attackerTeam[attackerIndex] = { ...attacker, mp: newMp };
  defenderTeam[defenderIndex] = { ...defender, hp: newHp };

  // Switch turns
  battleState.turn = battleState.turn === 'player' ? 'ai' : 'player';

  // Check for battle end conditions
  if (newHp <= 0) {
    // Fix the Logic: The defender is the one who was just attacked
    // Since turn has already switched, we need to determine who was just attacked
    let defeatedMonsterName: string;
    let defeatedTeam: (UserMonster | Monster)[];
    let opposingTeam: 'player' | 'ai';
    let isAiDefeated: boolean;
    
    if (battleState.turn === 'ai') {
      // Turn switched to AI, so player just attacked AI team
      defeatedMonsterName = (defender as Monster).name;
      defeatedTeam = battleState.aiTeam;
      opposingTeam = 'player';
      isAiDefeated = true;
    } else {
      // Turn switched to player, so AI just attacked player team
      defeatedMonsterName = (defender as UserMonster).monster.name;
      defeatedTeam = battleState.playerTeam;
      opposingTeam = 'ai';
      isAiDefeated = false;
    }
    
    // Log the Faint
    battleState.battleLog.push(`${defeatedMonsterName} has fainted!`);
    
    // Check for Team Defeat
    const teamDefeated = defeatedTeam.every(monster => (monster.hp ?? 0) <= 0);
    
    // Handle Win Condition
    if (teamDefeated) {
      battleState.battleEnded = true;
      battleState.winner = opposingTeam;
    }
    // Implement AI Forced Swap
    else if (isAiDefeated) {
      // AI monster was defeated but team isn't fully defeated - find next healthy AI monster
      const healthyAiIndex = battleState.aiTeam.findIndex(monster => (monster.hp ?? 0) > 0);
      
      if (healthyAiIndex !== -1) {
        // Update active AI monster index
        battleState.activeAiIndex = healthyAiIndex;
        
        // Get the new AI monster's name
        const newAiMonster = battleState.aiTeam[healthyAiIndex];
        const newAiMonsterName = (newAiMonster as Monster).name;
        
        // Add swap message to battle log
        battleState.battleLog.push(`Opponent sends out ${newAiMonsterName}!`);
      }
    }
    // Implement Player Forced Swap
    else if (!battleState.battleEnded && !isAiDefeated) {
      // Player monster was defeated but battle hasn't ended - force player to swap
      battleState.turn = 'player-must-swap';
    }
  }

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
    playerTeam: [...playerTeam], // Deep copy to avoid mutations
    aiTeam: [...opponentTeam],   // Deep copy to avoid mutations
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

// Server-side AI turn processing
export const processAiTurn = async (battleId: string) => {
  // Retrieve battle state from sessions
  const battleState = battleSessions.get(battleId);
  if (!battleState) {
    throw new Error(`Battle session ${battleId} not found`);
  }

  if (battleState.turn !== 'ai') {
    throw new Error('Not AI turn');
  }

  // Get current AI monster
  const aiMonster = battleState.aiTeam[battleState.activeAiIndex];
  
  // Get the AI monster's abilities from the abilities_map
  const monsterAbilities = battleState.abilities_map[aiMonster.id] || [];
  
  if (monsterAbilities.length === 0) {
    throw new Error(`No abilities found for AI monster ${aiMonster.id}`);
  }
  
  // Filter abilities the AI can afford based on current MP
  const affordableAbilities = monsterAbilities.filter(ability => 
    (aiMonster.mp ?? 0) >= (ability.mp_cost || 0)
  );

  let chosenAbility;
  
  if (affordableAbilities.length === 0) {
    // Find the monster's basic attack from its full ability list
    const basicAttack = monsterAbilities.find(ability => 
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

  // Apply the AI's chosen ability (applyDamage will handle action logging)
  return applyDamage(battleId, chosenAbility);
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