// server/battleEngine.ts

import {
  UserMonster,
  Monster,
  Ability,
  Turn,
  BattleLog,
  BattleMonster,
  BattleState,
  DamageResult,
  StatusEffect,
  ActiveEffect,
} from '@shared/types';
import { storage } from './storage.js';
import crypto from 'crypto';
import { getModifiedStat } from './battleUtils.js';

export const battleSessions = new Map<string, BattleState>();

// ==================================
//    BATTLE SESSION MANAGEMENT
// ==================================

export const createBattleSession = async (
  playerTeam: UserMonster[],
  opponentTeam: any[],
  playerLeadMonsterIndex: number,
): Promise<{ battleId: string; battleState: BattleState }> => {
  const battleId = crypto.randomUUID();

  const allTemplateIds = [
    ...new Set([
      ...playerTeam.map((m) => m.monster.id),
      ...opponentTeam.map((m) => m.monster.id),
    ]),
  ];
  const abilitiesByTemplateId = await storage.getAbilitiesForMonsters(
    allTemplateIds,
  );

  const standardizedPlayerTeam: BattleMonster[] = playerTeam.map((p) => ({
    ...p,
    monster: {
      ...p.monster,
      abilities: abilitiesByTemplateId[p.monster.id] || [],
    },
    isFainted: p.hp <= 0,
    battleHp: p.hp,
    battleMaxHp: p.maxHp,
    battleMp: p.mp,
    battleMaxMp: p.maxMp,
    statusEffects: [],
    activeEffects: [],
  }));

  const standardizedAiTeam: BattleMonster[] = opponentTeam.map((ai) => ({
    id: ai.id,
    userId: 'ai',
    monsterId: ai.monster.id,
    level: ai.level,
    power: ai.monster.basePower,
    speed: ai.monster.baseSpeed,
    defense: ai.monster.baseDefense,
    hp: ai.hp,
    maxHp: ai.maxHp,
    mp: ai.mp,
    maxMp: ai.maxMp,
    experience: 0,
    evolutionStage: 1,
    upgradeChoices: {},
    isShattered: false,
    acquiredAt: new Date().toISOString(),
    monster: {
      ...ai.monster,
      abilities: abilitiesByTemplateId[ai.monster.id] || [],
    },
    isFainted: (ai.hp ?? 0) <= 0,
    battleHp: ai.hp,
    battleMaxHp: ai.maxHp,
    battleMp: ai.mp,
    battleMaxMp: ai.maxMp,
    statusEffects: [],
    activeEffects: [],
  }));

  const playerLead = standardizedPlayerTeam[playerLeadMonsterIndex];
  const aiLead = standardizedAiTeam[0];

  let battleState: BattleState = {
    playerTeam: standardizedPlayerTeam,
    aiTeam: standardizedAiTeam,
    activePlayerIndex: playerLeadMonsterIndex,
    activeAiIndex: 0,
    turn: getModifiedStat(playerLead, 'speed') >= getModifiedStat(aiLead, 'speed') ? 'player' : 'ai',
    battleEnded: false,
    winner: null,
    battleLog: [
      {
        message: `${playerLead.monster.name} enters the battle!`,
        turn: 'system',
      },
      {
        message: `Opponent's ${aiLead.monster.name} appears!`,
        turn: 'system',
      },
    ],
  };

  battleSessions.set(battleId, battleState);
  return { battleId, battleState };
};

// ==================================
//      CORE TURN PROCESSING
// ==================================

export const applyDamage = async (
  battleId: string,
  abilityId: number,
  targetId?: number,
): Promise<{ battleState: BattleState }> => {
  const initialState = battleSessions.get(battleId);
  if (!initialState) throw new Error(`Battle session ${battleId} not found`);

  const battleState: BattleState = JSON.parse(JSON.stringify(initialState));
  const attacker = battleState.playerTeam[battleState.activePlayerIndex];

  if (attacker.isFainted) {
    throw new Error(`${attacker.monster.name} has fainted and cannot act.`);
  }

  const ability = (attacker.monster.abilities || []).find((a) => a.id === abilityId);
  if (!ability) throw new Error(`Ability ${abilityId} not found for monster.`);

  if (attacker.battleMp < (ability.mp_cost || 0)) {
    battleState.battleLog.push({ message: 'Not enough MP!', turn: 'system' });
    return { battleState };
  }

  const turnResult = await processTurn(battleState, ability, true, targetId);
  battleSessions.set(battleId, turnResult);
  return { battleState: turnResult };
};

export const processAiTurn = async (
  battleId: string,
): Promise<{ battleState: BattleState }> => {
  const initialState = battleSessions.get(battleId);
  if (!initialState) throw new Error(`Battle session ${battleId} not found`);

  const battleState: BattleState = JSON.parse(JSON.stringify(initialState));
  if (battleState.turn !== 'ai') return { battleState };

  const attacker = battleState.aiTeam[battleState.activeAiIndex];
  if (attacker.isFainted) return { battleState };

  const activeAbilities = (attacker.monster.abilities || []).filter((a) => a.ability_type === 'ACTIVE');
  const affordableAbilities = activeAbilities.filter((a) => attacker.battleMp >= (a.mp_cost || 0));
  const chosenAbility =
    affordableAbilities.length > 0
      ? affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)]
      : activeAbilities.find((a) => a.mp_cost === 0);

  if (!chosenAbility) throw new Error('AI could not select an ability.');

  const turnResult = await processTurn(battleState, chosenAbility, false);
  battleSessions.set(battleId, turnResult);
  return { battleState: turnResult };
};

async function processTurn(
  battleState: BattleState,
  ability: Ability,
  isPlayerTurn: boolean,
  targetId?: number,
): Promise<BattleState> {
  let state = battleState;

  // 1. START-OF-TURN PHASE
  const startOfTurnResult = handleStartOfTurn(state, isPlayerTurn);
  state = startOfTurnResult.state;

  if (startOfTurnResult.turnSkipped) {
    state = handleEndOfTurn(state, isPlayerTurn);
    return state;
  }

  // 2. ACTION PHASE
  state = await executeAbility(state, ability, isPlayerTurn, targetId);
  state = await handleMonsterDefeatLogic(state);

  if (state.battleEnded) {
    if (state.winner === 'player') {
      await storage.awardRankXp(state.playerTeam[0].userId, 50);
      await storage.saveFinalBattleState(state.playerTeam);
    }
    return state;
  }

  // 3. END-OF-TURN PHASE
  state = handleEndOfTurn(state, isPlayerTurn);
  return state;
}

// ==================================
//      LIFECYCLE SUB-FUNCTIONS
// ==================================

function handleStartOfTurn(state: BattleState, isPlayerTurn: boolean): { state: BattleState; turnSkipped: boolean } {
  const activeTeamKey = isPlayerTurn ? 'playerTeam' : 'aiTeam';
  const activeIndex = isPlayerTurn ? state.activePlayerIndex : state.activeAiIndex;

  let activeMonster = state[activeTeamKey][activeIndex];
  let turnSkipped = false;

  const newStatusEffects = [];
  for (const effect of activeMonster.statusEffects || []) {
    const effectDetails = effect.effectDetails;
    if (!effectDetails) {
        newStatusEffects.push(effect);
        continue;
    };

    if (effectDetails.effect_type === 'TURN_SKIP' && !turnSkipped) {
      state.battleLog.push({ message: `${activeMonster.monster.name} is paralyzed and cannot act!`, turn: 'system' });
      turnSkipped = true;
    }

    if (effectDetails.effect_type === 'DAMAGE_OVER_TIME') {
        const damage = Math.floor(activeMonster.battleMaxHp * (parseFloat(effectDetails.default_value as any) / 100));
        activeMonster.battleHp = Math.max(0, activeMonster.battleHp - damage);
        state.battleLog.push({ message: `${activeMonster.monster.name} took ${damage} damage from ${effect.name}.`, turn: 'system' });
    }
    newStatusEffects.push(effect);
  }
  activeMonster.statusEffects = newStatusEffects;

  state[activeTeamKey] = state[activeTeamKey].map((mon, index) => index === activeIndex ? activeMonster : mon);

  return { state, turnSkipped };
}

async function executeAbility(state: BattleState, ability: Ability, isPlayerAttacking: boolean, targetId?: number): Promise<BattleState> {
  let currentState = state;
  const attackingTeamKey = isPlayerAttacking ? 'playerTeam' : 'aiTeam';
  const attackerIndex = isPlayerAttacking ? currentState.activePlayerIndex : currentState.activeAiIndex;

  // --- MP DEDUCTION (IMMUTABLE) ---
  currentState[attackingTeamKey] = currentState[attackingTeamKey].map((mon, index) => {
    if (index === attackerIndex) {
      return { ...mon, battleMp: mon.battleMp - (ability.mp_cost || 0) };
    }
    return mon;
  });
  const attacker = currentState[attackingTeamKey][attackerIndex];

  currentState.battleLog.push({ message: `${attacker.monster.name} used ${ability.name}!`, turn: isPlayerAttacking ? 'player' : 'ai' });

  // --- DETERMINE TARGETS ---
  const defendingTeamKey = isPlayerAttacking ? 'aiTeam' : 'playerTeam';
  let targets: BattleMonster[] = [];
  switch (ability.target_scope) {
    case 'ANY_ALLY':
      const allyTarget = currentState[attackingTeamKey].find(m => m.id === targetId);
      if (allyTarget && !allyTarget.isFainted) targets.push(allyTarget);
      break;
    case 'ACTIVE_OPPONENT':
    default:
      const mainDefender = currentState[defendingTeamKey][isPlayerAttacking ? currentState.activeAiIndex : currentState.activePlayerIndex];
      if (mainDefender && !mainDefender.isFainted) targets.push(mainDefender);
  }

  if (targets.length === 0) {
    currentState.battleLog.push({ message: 'But there was no valid target!', turn: 'system' });
    return currentState;
  }

  // --- PROCESS ACTION FOR EACH TARGET ---
  for (const target of targets) {
     // Apply Healing
    if (ability.healing_power && ability.healing_power > 0) {
        const targetTeamKeyToUpdate = currentState.playerTeam.some(p => p.id === target.id) ? 'playerTeam' : 'aiTeam';
        currentState[targetTeamKeyToUpdate] = currentState[targetTeamKeyToUpdate].map(mon => {
            if (mon.id === target.id && !mon.isFainted) {
                const healedHp = Math.min(mon.battleMaxHp, mon.battleHp + ability.healing_power!);
                currentState.battleLog.push({ message: `${mon.monster.name} healed for ${healedHp - mon.battleHp} HP!`, turn: 'system' });
                return { ...mon, battleHp: healedHp };
            }
            return mon;
        });
    } else { // Apply Damage
        const damageResult = calculateDamage(attacker, target, ability);
        const targetTeamKeyToUpdate = currentState.playerTeam.some(p => p.id === target.id) ? 'playerTeam' : 'aiTeam';
        currentState[targetTeamKeyToUpdate] = currentState[targetTeamKeyToUpdate].map(mon => {
            if (mon.id === target.id) {
                return { ...mon, battleHp: Math.max(0, mon.battleHp - damageResult.damage) };
            }
            return mon;
        });
        currentState.battleLog.push({ message: `It dealt ${damageResult.damage} damage to ${target.monster.name}.`, turn: 'system' });
        if (damageResult.affinityMultiplier > 1) currentState.battleLog.push({ message: "It's super effective!", turn: 'system' });
        if (damageResult.affinityMultiplier < 1) currentState.battleLog.push({ message: "It's not very effective...", turn: 'system' });
    }
  }

  return currentState;
}

function handleEndOfTurn(state: BattleState, turnWasPlayers: boolean): BattleState {
  const teamKey = turnWasPlayers ? 'playerTeam' : 'aiTeam';

  // Decrement status effect durations
  state[teamKey] = state[teamKey].map(monster => {
      const newStatusEffects = (monster.statusEffects || [])
          .map(effect => ({ ...effect, duration: effect.duration! - 1 }))
          .filter(effect => effect.duration! > 0);
      return { ...monster, statusEffects: newStatusEffects };
  });

  // Process End of Turn Passives (e.g., Soothing Aura)
  // This logic can be expanded here

  // Switch turn
  state.turn = turnWasPlayers ? 'ai' : 'player';
  return state;
}


async function handleMonsterDefeatLogic(state: BattleState): Promise<BattleState> {
  let finalState = state;

  const checkTeam = (teamKey: 'playerTeam' | 'aiTeam') => {
    const isActivePlayerTeam = teamKey === 'playerTeam';
    let teamWiped = true;

    const newTeam = finalState[teamKey].map((monster) => {
      if (monster.battleHp > 0) teamWiped = false;
      if (monster.battleHp <= 0 && !monster.isFainted) {
        finalState.battleLog.push({ message: `${monster.monster.name} has fainted!`, turn: 'system' });
        return { ...monster, isFainted: true };
      }
      return monster;
    });
    finalState = { ...finalState, [teamKey]: newTeam };

    if (teamWiped) {
        finalState.battleEnded = true;
        finalState.winner = isActivePlayerTeam ? 'ai' : 'player';
        return;
    }

    const activeIndex = isActivePlayerTeam ? finalState.activePlayerIndex : finalState.activeAiIndex;
    if (finalState[teamKey][activeIndex].isFainted) {
       if (isActivePlayerTeam) {
        finalState.turn = 'player-must-swap';
      } else {
        const newIndex = finalState.aiTeam.findIndex((m) => !m.isFainted);
        if (newIndex !== -1) {
          finalState.activeAiIndex = newIndex;
          finalState.battleLog.push({ message: `Opponent sends out ${finalState.aiTeam[newIndex].monster.name}!`, turn: 'system' });
        }
      }
    }
  };

  checkTeam('playerTeam');
  if (finalState.battleEnded) return finalState;
  checkTeam('aiTeam');
  return finalState;
}

// ==================================
//   PLAYER-SPECIFIC ACTIONS
// ==================================

export const performSwap = (battleId: string, newMonsterIndex: number): BattleState => {
  let battleState: BattleState = JSON.parse(JSON.stringify(battleSessions.get(battleId)));
  if (!battleState) throw new Error(`Battle session ${battleId} not found`);

  const currentMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const newMonster = battleState.playerTeam[newMonsterIndex];
  if (!newMonster || newMonster.isFainted) throw new Error('Cannot swap to a fainted monster.');

  battleState = handleEndOfTurn(battleState, true);

  battleState.activePlayerIndex = newMonsterIndex;
  battleState.battleLog.push({ message: `${currentMonster.monster.name} was withdrawn.`, turn: 'player' });
  battleState.battleLog.push({ message: `${newMonster.monster.name} enters the battle!`, turn: 'player' });

  battleSessions.set(battleId, battleState);
  return battleState;
};

export const processForfeit = (battleId: string): BattleState => {
  let battleState: BattleState = JSON.parse(JSON.stringify(battleSessions.get(battleId)));
  if (!battleState) throw new Error(`Battle session ${battleId} not found`);

  battleState.battleLog.push({
    message: `${battleState.playerTeam[battleState.activePlayerIndex].monster.name} forfeited the turn.`,
    turn: 'player',
  });

  battleState = handleEndOfTurn(battleState, true);
  battleSessions.set(battleId, battleState);
  return battleState;
};

// ==================================
//      HELPER & CALCULATION FUNCTIONS
// ==================================

export function calculateDamage(attacker: BattleMonster, defender: BattleMonster, ability: Ability): DamageResult {
  const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
  const attackPower = getModifiedStat(attacker, scalingStatName) * (parseFloat(ability.power_multiplier as any) || 0.5);
  const defendingDefense = getModifiedStat(defender, 'defense');
  const damageMultiplier = 100 / (100 + defendingDefense);
  let rawDamage = attackPower * damageMultiplier;
  const affinityMultiplier = getAffinityMultiplier(ability.affinity, defender.monster);
  rawDamage *= affinityMultiplier;
  const isCritical = Math.random() < 0.05;
  if (isCritical) rawDamage *= 1.5;
  const variance = 0.9 + Math.random() * 0.2;
  rawDamage *= variance;
  return { damage: Math.round(Math.max(1, rawDamage)), isCritical, affinityMultiplier };
}

export function getAffinityMultiplier(abilityAffinity: string | null | undefined, defenderMonster: Monster): number {
  if (!abilityAffinity) return 1.0;
  if (defenderMonster.weaknesses?.includes(abilityAffinity)) return 2.0;
  if (defenderMonster.resistances?.includes(abilityAffinity)) return 0.5;
  return 1.0;
}