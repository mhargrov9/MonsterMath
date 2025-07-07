// server/battleEngine.ts

import {
  UserMonster,
  Monster,
  Ability,
  BattleMonster,
  BattleState,
  DamageResult,
  BattleEvent,
  ActiveEffect,
  StatusEffect,
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

  let initialBattleState: BattleState = {
    playerTeam: standardizedPlayerTeam,
    aiTeam: standardizedAiTeam,
    activePlayerIndex: playerLeadMonsterIndex,
    activeAiIndex: 0,
    turn:
      getModifiedStat(playerLead, 'speed') >= getModifiedStat(aiLead, 'speed')
        ? 'player'
        : 'ai',
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
    events: [],
  };

  battleSessions.set(battleId, initialBattleState);
  return { battleId, battleState: initialBattleState };
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

  let state: BattleState = JSON.parse(JSON.stringify(initialState));
  let turnEvents: BattleEvent[] = [];

  const attacker = state.playerTeam[state.activePlayerIndex];
  if (attacker.isFainted) {
    throw new Error(`${attacker.monster.name} has fainted and cannot act.`);
  }

  const ability = (attacker.monster.abilities || []).find(
    (a) => a.id === abilityId,
  );
  if (!ability) throw new Error(`Ability ${abilityId} not found for monster.`);

  if (attacker.battleMp < (ability.mp_cost || 0)) {
    state.battleLog.push({ message: 'Not enough MP!', turn: 'system' });
    return { battleState: state };
  }

  // 1. START-OF-TURN PHASE
  const startOfTurnResult = handleStartOfTurn(state, true, turnEvents);
  state = startOfTurnResult.state;

  if (startOfTurnResult.turnSkipped) {
    state = handleEndOfTurn(state, true, turnEvents);
    state.events = turnEvents;
    battleSessions.set(battleId, state);
    return { battleState: state };
  }

  // 2. ACTION PHASE
  state = await executeAbility(state, ability, true, turnEvents, targetId);
  state = await handleMonsterDefeatLogic(state);

  if (state.battleEnded) {
    if (state.winner === 'player') {
      await storage.awardRankXp(state.playerTeam[0].userId, 50);
      await storage.saveFinalBattleState(state.playerTeam);
    }
    state.events = turnEvents;
    battleSessions.set(battleId, state);
    return { battleState: state };
  }

  // 3. END-OF-TURN PHASE
  state = handleEndOfTurn(state, true, turnEvents);

  state.events = turnEvents;
  battleSessions.set(battleId, state);
  return { battleState: state };
};

export const processAiTurn = async (
  battleId: string,
): Promise<{ battleState: BattleState }> => {
  const initialState = battleSessions.get(battleId);
  if (!initialState) throw new Error(`Battle session ${battleId} not found`);

  let state: BattleState = JSON.parse(JSON.stringify(initialState));
  let turnEvents: BattleEvent[] = [];

  if (state.turn !== 'ai') return { battleState: state };

  const attacker = state.aiTeam[state.activeAiIndex];
  if (attacker.isFainted) return { battleState: state };

  const activeAbilities = (attacker.monster.abilities || []).filter(
    (a) => a.ability_type === 'ACTIVE',
  );
  const affordableAbilities = activeAbilities.filter(
    (a) => attacker.battleMp >= (a.mp_cost || 0),
  );
  const chosenAbility =
    affordableAbilities.length > 0
      ? affordableAbilities[
          Math.floor(Math.random() * affordableAbilities.length)
        ]
      : activeAbilities.find((a) => a.mp_cost === 0);

  if (!chosenAbility) throw new Error('AI could not select an ability.');

  // 1. START-OF-TURN PHASE
  const startOfTurnResult = handleStartOfTurn(state, false, turnEvents);
  state = startOfTurnResult.state;

  if (startOfTurnResult.turnSkipped) {
    state = handleEndOfTurn(state, false, turnEvents);
    state.events = turnEvents;
    battleSessions.set(battleId, state);
    return { battleState: state };
  }

  // 2. ACTION PHASE
  state = await executeAbility(state, chosenAbility, false, turnEvents);
  state = await handleMonsterDefeatLogic(state);

  if (state.battleEnded) {
    state.events = turnEvents;
    battleSessions.set(battleId, state);
    return { battleState: state };
  }

  // 3. END-OF-TURN PHASE
  state = handleEndOfTurn(state, false, turnEvents);

  state.events = turnEvents;
  battleSessions.set(battleId, state);
  return { battleState: state };
};

// ==================================
//      LIFECYCLE SUB-FUNCTIONS
// ==================================

function handleStartOfTurn(
  state: BattleState,
  isPlayerTurn: boolean,
  turnEvents: BattleEvent[],
): { state: BattleState; turnSkipped: boolean } {
  const activeTeamKey = isPlayerTurn ? 'playerTeam' : 'aiTeam';
  const activeIndex = isPlayerTurn
    ? state.activePlayerIndex
    : state.activeAiIndex;

  let activeMonster = state[activeTeamKey][activeIndex];
  let turnSkipped = false;

  for (const effect of activeMonster.statusEffects || []) {
    const effectDetails = effect.effectDetails;
    if (!effectDetails || turnSkipped) continue;

    if (effectDetails.effect_type === 'TURN_SKIP') {
      state.battleLog.push({
        message: `${activeMonster.monster.name} is paralyzed and cannot act!`,
        turn: 'system',
      });
      turnSkipped = true;
    }

    if (effectDetails.effect_type === 'DAMAGE_OVER_TIME') {
      const damage = Math.floor(
        activeMonster.battleMaxHp *
          (parseFloat(effectDetails.default_value as any) / 100),
      );
      activeMonster.battleHp = Math.max(0, activeMonster.battleHp - damage);
      state.battleLog.push({
        message: `${activeMonster.monster.name} took ${damage} damage from ${effect.name}.`,
        turn: 'system',
      });
      turnEvents.push({
        type: 'damage',
        targetId: activeMonster.id,
        amount: damage,
        isPlayerTarget: isPlayerTurn,
      });
    }
  }

  state[activeTeamKey][activeIndex] = activeMonster;

  return { state, turnSkipped };
}

async function executeAbility(
  state: BattleState,
  ability: Ability,
  isPlayerAttacking: boolean,
  turnEvents: BattleEvent[],
  targetId?: number,
): Promise<BattleState> {
  let currentState = state;
  const attackingTeamKey = isPlayerAttacking ? 'playerTeam' : 'aiTeam';
  const defendingTeamKey = isPlayerAttacking ? 'aiTeam' : 'playerTeam';
  const attacker =
    currentState[attackingTeamKey][
      isPlayerAttacking
        ? currentState.activePlayerIndex
        : currentState.activeAiIndex
    ];

  // --- 1. MP DEDUCTION ---
  attacker.battleMp -= ability.mp_cost || 0;

  currentState.battleLog.push({
    message: `${attacker.monster.name} used ${ability.name}!`,
    turn: isPlayerAttacking ? 'player' : 'ai',
  });

  // --- 2. DETERMINE TARGETS ---
  let targets: BattleMonster[] = [];
  switch (ability.target_scope) {
    case 'ANY_ALLY':
      const allyTarget = currentState[attackingTeamKey].find(
        (m) => m.id === targetId,
      );
      if (allyTarget && !allyTarget.isFainted) targets.push(allyTarget);
      break;
    case 'ALL_OPPONENTS':
      targets = currentState[defendingTeamKey].filter((m) => !m.isFainted);
      break;
    case 'ALL_ALLIES':
      targets = currentState[attackingTeamKey].filter((m) => !m.isFainted);
      break;
    case 'ACTIVE_OPPONENT':
    default:
      const mainDefender =
        currentState[defendingTeamKey][
          isPlayerAttacking
            ? currentState.activeAiIndex
            : currentState.activePlayerIndex
        ];
      if (mainDefender && !mainDefender.isFainted) targets.push(mainDefender);
  }

  if (targets.length === 0) {
    currentState.battleLog.push({
      message: 'But there was no valid target!',
      turn: 'system',
    });
    return currentState;
  }

  // --- 3. PROCESS ACTION FOR EACH TARGET ---
  for (const target of targets) {
    let finalTarget = { ...target };
    const oldHp = finalTarget.battleHp;

    // --- 3a. ON_BEING_HIT PASSIVES (Evasion) ---
    let attackMissed = false;
    for (const passive of finalTarget.monster.abilities) {
      if (passive.activation_trigger === 'ON_BEING_HIT') {
        const applicationChance = passive.override_chance
          ? parseFloat(passive.override_chance as any)
          : 1.0;
        if (Math.random() < applicationChance) {
          currentState.battleLog.push({
            message: `${finalTarget.monster.name}'s ${passive.name} allowed it to evade the attack!`,
            turn: 'system',
          });
          turnEvents.push({
            type: 'miss',
            targetId: finalTarget.id,
            isPlayerTarget: !isPlayerAttacking,
          });
          attackMissed = true;
          break;
        }
      }
    }
    if (attackMissed) continue; // Skip to next target

    // --- 3b. PRIMARY EFFECT ---
    if (ability.healing_power && ability.healing_power > 0) {
      const healAmount = Math.min(
        finalTarget.battleMaxHp - finalTarget.battleHp,
        ability.healing_power,
      );
      finalTarget.battleHp += healAmount;
      currentState.battleLog.push({
        message: `${finalTarget.monster.name} healed for ${healAmount} HP!`,
        turn: 'system',
      });
      turnEvents.push({
        type: 'heal',
        targetId: finalTarget.id,
        amount: healAmount,
        isPlayerTarget: currentState.playerTeam.some((p) => p.id === finalTarget.id),
      });
    } else {
      const damageResult = calculateDamage(attacker, finalTarget, ability);
      finalTarget.battleHp = Math.max(0, finalTarget.battleHp - damageResult.damage);
      currentState.battleLog.push({
        message: `It dealt ${damageResult.damage} damage to ${finalTarget.monster.name}.`,
        turn: 'system',
      });
      turnEvents.push({
        type: 'damage',
        targetId: finalTarget.id,
        amount: damageResult.damage,
        isPlayerTarget: currentState.playerTeam.some((p) => p.id === finalTarget.id),
      });
      if (finalTarget.battleHp <= 0) break; // Multi-hit check
    }

    // --- 3c. STATUS & STAT EFFECTS ---
    if (ability.status_effect_id && ability.effectDetails) {
      const chance = ability.override_chance ? parseFloat(ability.override_chance as any) : 1.0;
      if (Math.random() < chance) {
        finalTarget.statusEffects.push({
          ...ability.effectDetails,
          duration: ability.override_duration || ability.effectDetails.default_duration,
          isNew: true,
        });
        currentState.battleLog.push({
          message: `${finalTarget.monster.name} was afflicted with ${ability.effectDetails.name}!`,
          turn: 'system',
        });
        turnEvents.push({
          type: 'status',
          targetId: finalTarget.id,
          text: ability.effectDetails.name.toUpperCase(),
          isPlayerTarget: currentState.playerTeam.some((p) => p.id === finalTarget.id),
        });
      }
    }
    if (ability.stat_modifiers) {
      for (const modifier of ability.stat_modifiers as any[]) {
        const existingIdx = finalTarget.activeEffects.findIndex(
          (e) => e.sourceAbilityId === ability.id && e.stat === modifier.stat,
        );
        if (existingIdx > -1) {
          finalTarget.activeEffects[existingIdx].duration = modifier.duration;
        } else {
          finalTarget.activeEffects.push({ ...modifier, id: crypto.randomUUID(), sourceAbilityId: ability.id });
        }
        turnEvents.push({
          type: 'stat',
          targetId: finalTarget.id,
          text: `${modifier.stat.toUpperCase()} ${modifier.value > 0 ? 'UP' : 'DOWN'}`,
          isPlayerTarget: currentState.playerTeam.some((p) => p.id === finalTarget.id),
        });
      }
    }

    // --- 3d. HP THRESHOLD CHECK & UPDATE STATE ---
    currentState = checkHpThresholdPassives(currentState, finalTarget, oldHp, turnEvents);
    const targetTeamKey = currentState.playerTeam.some((p) => p.id === finalTarget.id) ? 'playerTeam' : 'aiTeam';
    currentState[targetTeamKey] = currentState[targetTeamKey].map((m) => (m.id === finalTarget.id ? finalTarget : m));
  }
  return currentState;
}

function handleEndOfTurn(
  state: BattleState,
  turnWasPlayers: boolean,
  turnEvents: BattleEvent[],
): BattleState {
  const activeTeamKey = turnWasPlayers ? 'playerTeam' : 'aiTeam';
  const activeMonster = state[activeTeamKey][turnWasPlayers ? state.activePlayerIndex : state.activeAiIndex];

  // Decrement effect durations on all monsters
  const updateMonsterEffects = (monster: BattleMonster) => {
    const updatedStatusEffects = (monster.statusEffects || []).map(effect => {
        if (!effect.isNew) {
            effect.duration = (effect.duration || 1) - 1;
        }
        delete effect.isNew;
        return effect;
    }).filter(effect => (effect.duration || 0) > 0);
    monster.statusEffects = updatedStatusEffects;
    return monster;
  };

  state.playerTeam = state.playerTeam.map(updateMonsterEffects);
  state.aiTeam = state.aiTeam.map(updateMonsterEffects);

  state.turn = turnWasPlayers ? 'ai' : 'player';
  return state;
}

async function handleMonsterDefeatLogic(state: BattleState): Promise<BattleState> {
  const checkTeam = (teamKey: 'playerTeam' | 'aiTeam', isPlayer: boolean) => {
    state[teamKey].forEach((monster, index) => {
      if (monster.battleHp <= 0 && !monster.isFainted) {
        monster.isFainted = true;
        state.battleLog.push({ message: `${monster.monster.name} has fainted!`, turn: 'system' });
      }
    });

    if (state[teamKey].every((m) => m.isFainted)) {
      state.battleEnded = true;
      state.winner = isPlayer ? 'ai' : 'player';
    } else {
      const activeIndex = isPlayer ? state.activePlayerIndex : state.activeAiIndex;
      if (state[teamKey][activeIndex].isFainted) {
        if (isPlayer) {
          state.turn = 'player-must-swap';
        } else {
          const newIndex = state.aiTeam.findIndex((m) => !m.isFainted);
          if (newIndex !== -1) {
            state.activeAiIndex = newIndex;
            state.battleLog.push({ message: `Opponent sends out ${state.aiTeam[newIndex].monster.name}!`, turn: 'system' });
          }
        }
      }
    }
  };

  checkTeam('playerTeam', true);
  if (state.battleEnded) return state;
  checkTeam('aiTeam', false);
  return state;
}

function checkHpThresholdPassives(state: BattleState, target: BattleMonster, oldHp: number, turnEvents: BattleEvent[]): BattleState {
    const thresholdPercent = target.battleMaxHp * 0.5; // Example: 50%
    if (oldHp > thresholdPercent && target.battleHp <= thresholdPercent) {
        // Apply effect
    } else if (oldHp <= thresholdPercent && target.battleHp > thresholdPercent) {
        // Remove effect
    }
    return state;
}


// ==================================
//   PLAYER-SPECIFIC ACTIONS
// ==================================

export const performSwapAndProcessAiTurn = async (
  battleId: string,
  newMonsterIndex: number,
): Promise<{ battleState: BattleState }> => {
  const initialState = battleSessions.get(battleId);
  if (!initialState) throw new Error(`Battle session ${battleId} not found`);

  let state: BattleState = JSON.parse(JSON.stringify(initialState));
  let turnEvents: BattleEvent[] = [];

  const currentMonster = state.playerTeam[state.activePlayerIndex];
  const newMonster = state.playerTeam[newMonsterIndex];

  if (!newMonster || newMonster.isFainted) throw new Error('Cannot swap to a fainted monster.');

  state.activePlayerIndex = newMonsterIndex;
  state.battleLog.push({ message: `${currentMonster.monster.name} was withdrawn.`, turn: 'player' });
  state.battleLog.push({ message: `${newMonster.monster.name} enters the battle!`, turn: 'player' });

  state = handleEndOfTurn(state, true, turnEvents);

  // Since the turn is now AI's, process it
  const aiTurnResult = await processAiTurn(battleId);
  aiTurnResult.battleState.events.unshift(...turnEvents);

  battleSessions.set(battleId, aiTurnResult.battleState);
  return aiTurnResult;
};

export const processForfeit = (battleId: string): { battleState: BattleState } => {
  let state: BattleState = JSON.parse(JSON.stringify(battleSessions.get(battleId)));
  if (!state) throw new Error(`Battle session ${battleId} not found`);

  state.battleLog.push({
    message: `${state.playerTeam[state.activePlayerIndex].monster.name} forfeited the turn.`,
    turn: 'player',
  });

  state = handleEndOfTurn(state, true, []);

  battleSessions.set(battleId, state);
  return { battleState: state };
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