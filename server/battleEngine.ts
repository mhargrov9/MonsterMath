// Import shared types for the battle system
import { DamageResult, UserMonster, Monster, Ability } from '../shared/types.js';
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

  // Handle fainted defender consequences
  if (newHp <= 0) {
    // Get defender name correctly based on type
    const defenderName = 'monster' in defender ? defender.monster.name : defender.name;
    battleState.battleLog.push(`${defenderName} has been defeated!`);
    
    // Determine which team the defender belonged to
    const isDefenderPlayer = battleState.turn === 'player' ? false : true; // Defender is opposite of current turn
    
    if (isDefenderPlayer) {
      // Player monster was defeated - check for available replacements
      const availablePlayerMonsters = battleState.playerTeam.filter((m: UserMonster) => m.hp > 0);
      if (availablePlayerMonsters.length > 0) {
        // Find next available monster index
        const nextPlayerIndex = battleState.playerTeam.findIndex((m: UserMonster) => m.hp > 0);
        battleState.activePlayerIndex = nextPlayerIndex;
        battleState.battleLog.push(`${battleState.playerTeam[nextPlayerIndex].monster.name} is sent into battle!`);
      } else {
        // No player monsters left - AI wins
        battleState.battleEnded = true;
        battleState.winner = 'ai';
      }
    } else {
      // AI monster was defeated - check for available replacements
      const availableAiMonsters = battleState.aiTeam.filter((m: Monster) => m.hp > 0);
      if (availableAiMonsters.length > 0) {
        // Find next available monster index
        const nextAiIndex = battleState.aiTeam.findIndex((m: Monster) => m.hp > 0);
        battleState.activeAiIndex = nextAiIndex;
        battleState.battleLog.push(`Opponent sends out ${battleState.aiTeam[nextAiIndex].name}!`);
      } else {
        // No AI monsters left - Player wins
        battleState.battleEnded = true;
        battleState.winner = 'player';
      }
    }
  }

  // Only switch turns if battle hasn't ended
  if (!battleState.battleEnded) {
    battleState.turn = battleState.turn === 'player' ? 'ai' : 'player';
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
  
  // Create initial battle state
  const battleState = {
    playerTeam: [...playerTeam], // Deep copy to avoid mutations
    aiTeam: [...opponentTeam],   // Deep copy to avoid mutations
    activePlayerIndex: 0,
    activeAiIndex: 0,
    turn: 'player' as 'player' | 'ai',
    battleEnded: false,
    winner: null as 'player' | 'ai' | null,
    battleLog: [] as string[]
  };
  
  // Store battle session
  battleSessions.set(battleId, battleState);
  
  return {
    battleId,
    battleState
  };
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
  
  // Simple AI: Choose a random available ability (with mana check)
  const availableAbilities = [
    { id: 1, name: "Basic Attack", mp_cost: 0, power_multiplier: "0.6", ability_type: "active" },
    // Add more abilities based on monster's actual abilities
    // For now, using basic attack as fallback
  ];

  // Filter abilities AI can afford
  const affordableAbilities = availableAbilities.filter(ability => 
    (aiMonster.mp ?? 0) >= (ability.mp_cost || 0)
  );

  if (affordableAbilities.length === 0) {
    // Force basic attack if no other abilities available
    affordableAbilities.push(availableAbilities[0]);
  }

  // Choose random ability
  const chosenAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];

  // Add battle log message before applying damage
  battleState.battleLog.push(`Opponent's ${aiMonster.name} used ${chosenAbility.name}!`);

  // Apply the AI's chosen ability
  return applyDamage(battleId, chosenAbility);
};