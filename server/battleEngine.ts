import { storage } from './storage.js';
import type {
  BattleState,
  BattleMonster,
  Ability,
  UserMonster,
  BattleEvent,
  ActiveEffect,
  StatusEffect,
} from '@shared/types';

export const battleSessions = new Map<string, BattleState>();
const activeLocks = new Set<string>();

// --- Public API ---

export async function createBattleSession(
  playerTeam: UserMonster[],
  aiTeam: UserMonster[],
  playerLeadMonsterIndex: number,
): Promise<{ battleId: string; battleState: BattleState }> {
  const battleId = crypto.randomUUID();
  const playerBattleTeam = playerTeam.map((m) => _convertToBattleMonster(m, true));
  const aiBattleTeam = aiTeam.map((m) => _convertToBattleMonster(m, false));
  const playerLead = playerBattleTeam[playerLeadMonsterIndex];
  const reorderedPlayerTeam = [
    playerLead,
    ...playerBattleTeam.filter(m => m.id !== playerLead.id)
  ];

  let initialState: BattleState = {
    battleId,
    playerTeam: reorderedPlayerTeam,
    aiTeam: aiBattleTeam,
    turn: 'player',
    turnCount: 1,
    cycleComplete: false,
    battleLog: [{ turn: 1, message: 'The battle begins!' }],
    events: [],
    battleEnded: false,
    winner: null,
  };

  initialState = _handleStartOfBattlePassives(initialState);

  // FIX: Add guard clauses to prevent crashing on empty teams.
  const playerActive = reorderedPlayerTeam[0];
  const aiActive = aiBattleTeam[0];

  if (playerActive && aiActive) {
      const playerSpeed = _getModifiedStat(playerActive, 'speed');
      const aiSpeed = _getModifiedStat(aiActive, 'speed');
      initialState.turn = playerSpeed >= aiSpeed ? 'player' : 'ai';
  } else {
      // Default to player turn if one team is empty
      initialState.turn = 'player';
  }

  initialState.battleLog.push({
    turn: 1,
    message: `${
      initialState.turn === 'player'
        ? playerActive?.monster.name
        : aiActive?.monster.name
    } will act first!`,
  });

  battleSessions.set(battleId, initialState);
  return { battleId, battleState: initialState };
}

export async function performAction(
  battleId: string,
  abilityId: number,
  targetId?: number,
): Promise<{ battleState: BattleState }> {
  if (activeLocks.has(battleId)) {
    throw new Error('Battle session is currently locked.');
  }

  activeLocks.add(battleId);

  try {
    const currentState = battleSessions.get(battleId);
    if (!currentState) throw new Error('Battle not found.');
    if (currentState.battleEnded) return { battleState: currentState };

    let newState = _deepCopy(currentState);
    newState.events = [];

    const { newState: stateAfterStart, turnWasSkipped } = await _handleStartOfTurn(newState);
    newState = stateAfterStart;

    if (newState.battleEnded) {
      battleSessions.set(battleId, newState);
      return { battleState: newState };
    }

    const actor = _getActor(newState);
    if (!actor) {
        // This can happen if the active monster faints from DoT and there's no one to swap in.
        // End the turn gracefully.
        const previousTurn = newState.turn;
        newState.turn = newState.turn === 'player' ? 'ai' : 'player';
        newState.cycleComplete = previousTurn === 'ai' && newState.turn === 'player';
        if (newState.cycleComplete) {
            newState.turnCount++;
            newState.battleLog.push({ turn: newState.turnCount, message: `--- Turn ${newState.turnCount} ---` });
        }
        battleSessions.set(battleId, newState);
        return { battleState: newState };
    }

    if (actor.isFainted) {
      throw new Error('Cannot perform action with a fainted monster.');
    }

    if (turnWasSkipped) {
      newState.battleLog.push({ turn: newState.turnCount, message: `${actor.monster.name}'s turn was skipped!` });
    } else if (abilityId < 0) { // Handle special, non-ability actions like swaps or AI turns
        // This logic can be expanded later
    }
    else {
      const ability = actor.monster.abilities.find((a) => a.id === abilityId);
      if (!ability) throw new Error(`Ability ${abilityId} not found for ${actor.monster.name}.`);
      newState = await _handleActionPhase(newState, actor, ability, targetId);
      if (newState.battleEnded) {
        battleSessions.set(battleId, newState);
        return { battleState: newState };
      }
    }

    const actorToEnd = _getActor(newState);
    if(actorToEnd) {
        newState = _handleEndOfTurn(newState, actorToEnd);
    }

    if (newState.battleEnded) {
      battleSessions.set(battleId, newState);
      return { battleState: newState };
    }

    const previousTurn = newState.turn;
    newState.turn = newState.turn === 'player' ? 'ai' : 'player';
    newState.cycleComplete = previousTurn === 'ai' && newState.turn === 'player';

    if(newState.cycleComplete) {
      newState.turnCount++;
      newState.battleLog.push({ turn: newState.turnCount, message: `--- Turn ${newState.turnCount} ---` });
    }

    battleSessions.set(battleId, newState);
    return { battleState: newState };
  } finally {
    activeLocks.delete(battleId);
  }
}

// --- Phase Handlers ---

async function _handleStartOfTurn(battleState: BattleState): Promise<{ newState: BattleState, turnWasSkipped: boolean }> {
  let newState = _deepCopy(battleState);
  let actor = _getActor(newState);
  if (!actor) return { newState, turnWasSkipped: true };

  let turnWasSkipped = false;

  const confused = actor.statusEffects.find(e => e.name === 'CONFUSED');
  if (confused) {
    turnWasSkipped = true;
    const selfDamage = Math.floor(_getModifiedStat(actor, 'power') * parseFloat(confused.secondary_value || '0.4'));
    newState = _applyDamageToMonster(newState, actor.id, selfDamage, true);
    newState.battleLog.push({ turn: newState.turnCount, message: `${actor.monster.name} is confused and attacked itself!` });
    newState = await _runGlobalFaintCheck(newState, actor.id);
    return { newState, turnWasSkipped };
  }

  const dotEffects = [...actor.statusEffects.filter(e => e.effect_type === 'DAMAGE_OVER_TIME')];
  for (const effect of dotEffects) {
    let damage = 0;
    if(effect.value_type === 'PERCENT_MAX_HP') {
      damage = Math.floor(actor.battleMaxHp * (parseInt(effect.default_value || '0') / 100));
    } else {
      damage = parseInt(effect.default_value || '0');
    }
    newState = _applyDamageToMonster(newState, actor.id, damage, false);
    newState.battleLog.push({ turn: newState.turnCount, message: `${actor.monster.name} took ${damage} damage from ${effect.name}!` });

    newState = await _runGlobalFaintCheck(newState, actor.id);
    if (newState.battleEnded) return { newState, turnWasSkipped: true };
  }

  actor = _findMonsterInState(newState, actor.id)!;
    if (!actor || actor.isFainted) {
    return { newState, turnWasSkipped: true };
  }
  const passives = _getPassives(actor, 'START_OF_TURN');
  for (const passive of passives) {
    newState = _executePassive(newState, actor, passive);
  }
  return { newState, turnWasSkipped };
}

async function _handleActionPhase(
  battleState: BattleState,
  attacker: BattleMonster,
  ability: Ability,
  targetId?: number,
): Promise<BattleState> {
  let newState = _deepCopy(battleState);

  if (attacker.battleMp < (ability.mp_cost || 0)) {
    newState.battleLog.push({ turn: newState.turnCount, message: `${attacker.monster.name} does not have enough MP!` });
    return newState;
  }

  newState = _updateMonsterInState(newState, attacker.id, { battleMp: attacker.battleMp - (ability.mp_cost || 0) });

  const targets = _determineTargets(newState, attacker, ability, targetId);
  if (targets.length === 0) {
    newState.battleLog.push({ turn: newState.turnCount, message: 'But there was no valid target!' });
    return newState;
  }
  newState.battleLog.push({ turn: newState.turnCount, message: `${attacker.monster.name} used ${ability.name}!` });
  newState.events.push({ type: 'ABILITY_USE', sourceId: attacker.id, abilityName: ability.name });

  for (const target of targets) {
    let currentTarget = _findMonsterInState(newState, target.id)!;
    let queuedEffectsForThisTarget: { targetId: number, effect: StatusEffect }[] = [];

    // Step 5a: Evasion Check
    let wasEvaded = _resolveEvasion(newState, attacker, currentTarget, ability);
    if(wasEvaded) {
      newState.battleLog.push({ turn: newState.turnCount, message: `${currentTarget.monster.name} evaded the attack!` });
      newState.events.push({ type: 'EVADE', targetId: currentTarget.id });
      continue;
    }

    // Step 5b: Pre-Damage Attacker Passives
    const preDamagePassives = _getPassives(attacker, 'ON_ABILITY_USE');
    for(const passive of preDamagePassives) {
      if(passive.effectDetails) {
        queuedEffectsForThisTarget.push({ targetId: currentTarget.id, effect: passive.effectDetails });
      }
    }

    // Step 5c & 5d: Calculate & Apply Damage/Healing
    let { newState: afterDamageState, damageDealt } = _resolveDamageAndHealing(newState, attacker, currentTarget, ability);
    newState = afterDamageState;

    // Step 5e: Global Faint Check
    let { newState: afterFaintState, interrupt } = await _resolveFaintCheck(newState, currentTarget.id);
    newState = afterFaintState;
    if (interrupt) {
        if (newState.battleEnded) break;
        continue;
    }

    // Refresh target data after potential state changes
    currentTarget = _findMonsterInState(newState, target.id)!;

    // Step 5f: Post-Damage Defender Passives
    newState = _resolvePostDamagePassives(newState, attacker, currentTarget, damageDealt);

    // Step 5g: Apply Queued Effects (from ability itself)
    if (ability.effectDetails) {
      queuedEffectsForThisTarget.push({ targetId: currentTarget.id, effect: ability.effectDetails });
    }

    // Apply all queued status effects for this target
    for (const item of queuedEffectsForThisTarget) {
        let targetForEffect = _findMonsterInState(newState, item.targetId);
        if(targetForEffect && !targetForEffect.isFainted){
            newState = _applyStatusEffect(newState, item.targetId, item.effect);
        }
    }

    // Step 5h: HP Threshold Passives
    newState = _resolveHpThresholdPassives(newState, currentTarget);
  }

  return newState;
}

function _handleEndOfTurn(battleState: BattleState, actor: BattleMonster): BattleState {
  let newState = _deepCopy(battleState);

  if (newState.cycleComplete) {
    const allMonsters = [...newState.playerTeam, ...newState.aiTeam];
    for (const monster of allMonsters) {
      if(monster.isFainted) continue;
      const newStatusEffects = monster.statusEffects.map(e => ({...e, duration: (e.duration ?? 1) - 1})).filter(e => (e.duration ?? 0) > 0);
      const newActiveEffects = monster.activeEffects.map(e => ({...e, duration: (e.duration ?? 1) - 1})).filter(e => (e.duration ?? 0) > 0);
      newState = _updateMonsterInState(newState, monster.id, { statusEffects: newStatusEffects, activeEffects: newActiveEffects });
    }
  }

  const actorInState = _findMonsterInState(newState, actor.id);
  if (!actorInState || actorInState.isFainted) return newState;

  const passives = _getPassives(actorInState, 'END_OF_TURN');
  for (const passive of passives) {
    newState = _executePassive(newState, actorInState, passive);
  }

  return newState;
}

// --- Order of Operations & Core Logic Helpers ---

function _resolveEvasion(state: BattleState, attacker: BattleMonster, target: BattleMonster, ability: Ability): boolean {
    const evasionPassives = _getPassives(target, 'ON_BEING_HIT');
    for(const passive of evasionPassives) {
        if(passive.affinity && passive.affinity !== ability.affinity) continue;
        const chance = passive.override_chance ? parseFloat(passive.override_chance) : 0;
        if(Math.random() < chance) {
            return true;
        }
    }
    return false;
}

function _resolveDamageAndHealing(state: BattleState, attacker: BattleMonster, target: BattleMonster, ability: Ability): { newState: BattleState, damageDealt: number } {
  let newState = _deepCopy(state);
  let finalDamage = 0;
  if(ability.power_multiplier) {
    const scalingStat = (ability.scaling_stat || 'power').toLowerCase();

    let baseDamage = _getModifiedStat(attacker, scalingStat as any) * parseFloat(ability.power_multiplier);

    const targetMonsterData = target.monster;
    if(targetMonsterData.weaknesses?.includes(ability.affinity!)) {
      baseDamage *= 1.5;
      newState.battleLog.push({ turn: newState.turnCount, message: `It's super effective!` });
    }
    if(targetMonsterData.resistances?.includes(ability.affinity!)) {
      baseDamage *= 0.5;
      newState.battleLog.push({ turn: newState.turnCount, message: `It's not very effective...` });
    }
    finalDamage = Math.floor(baseDamage);
    newState = _applyDamageToMonster(newState, target.id, finalDamage, false);
  }
  return { newState, damageDealt: finalDamage };
}

function _resolvePostDamagePassives(state: BattleState, attacker: BattleMonster, target: BattleMonster, damage: number): BattleState {
    let newState = _deepCopy(state);
    const passives = _getPassives(target, 'ON_DAMAGE_TAKEN');
    for (const passive of passives) {
        newState = _executePassive(newState, target, passive);
    }
    return newState;
}

function _resolveHpThresholdPassives(state: BattleState, target: BattleMonster): BattleState {
  let newState = _deepCopy(state);
  const passives = _getPassives(target, 'ON_HP_THRESHOLD');
  for (const passive of passives) {
    const threshold = passive.trigger_condition_value || 0;
    const hpPercent = (target.battleHp / target.battleMaxHp) * 100;
    const alreadyActive = target.activeEffects.some(e => e.sourceAbilityId === passive.id);
    if (hpPercent <= threshold && !alreadyActive) {
      newState = _executePassive(newState, target, passive);
    } else if (hpPercent > threshold && alreadyActive) {
      const newActiveEffects = target.activeEffects.filter(e => e.sourceAbilityId !== passive.id);
      newState = _updateMonsterInState(newState, target.id, { activeEffects: newActiveEffects });
    }
  }
  return newState;
}

async function _resolveFaintCheck(state: BattleState, targetId: number): Promise<{ newState: BattleState, interrupt: boolean }> {
  const newState = await _runGlobalFaintCheck(state, targetId);
  const target = _findMonsterInState(newState, targetId)!;
  return { newState, interrupt: target.isFainted };
}

function _executePassive(state: BattleState, owner: BattleMonster, passive: Ability): BattleState {
  let newState = _deepCopy(state);
  newState.battleLog.push({ turn: newState.turnCount, message: `${owner.monster.name}'s ${passive.name} activates!` });
  newState.events.push({ type: 'PASSIVE_ACTIVATE', sourceId: owner.id, abilityName: passive.name });
  if (passive.stat_modifiers) {
    for (const mod of passive.stat_modifiers) {
      const newEffect: ActiveEffect = { ...mod, sourceAbilityId: passive.id };
      let ownerRef = _findMonsterInState(newState, owner.id)!;
      newState = _updateMonsterInState(newState, owner.id, {
        activeEffects: [...ownerRef.activeEffects, newEffect]
      });
    }
  }
  if (passive.effectDetails) {
    newState = _applyStatusEffect(newState, owner.id, passive.effectDetails);
  }
  return newState;
}

function _applyStatusEffect(state: BattleState, targetId: number, effectToApply: StatusEffect): BattleState {
  let newState = _deepCopy(state);
  let target = _findMonsterInState(newState, targetId)!;
  if (!target || target.isFainted) return newState;

  const existingEffectIndex = target.statusEffects.findIndex(e => e.name === effectToApply.name);
  newState.battleLog.push({ turn: newState.turnCount, message: `${target.monster.name} is now ${effectToApply.name}!` });
  newState.events.push({ type: 'STATUS_APPLIED', targetId, effectName: effectToApply.name });

  if (existingEffectIndex !== -1) {
    const newEffects = [...target.statusEffects];
    newEffects[existingEffectIndex].duration = effectToApply.default_duration;
    return _updateMonsterInState(newState, targetId, { statusEffects: newEffects });
  } else {
    const newEffect: StatusEffect = { ...effectToApply, duration: effectToApply.default_duration };
    return _updateMonsterInState(newState, targetId, {
      statusEffects: [...target.statusEffects, newEffect]
    });
  }
}

// --- Foundational & Utility Helpers ---

function _handleStartOfBattlePassives(battleState: BattleState): BattleState {
  let newState = _deepCopy(battleState);
  const allMonsters = [...newState.playerTeam, ...newState.aiTeam];

  const battleStartPassives = allMonsters
    .flatMap(m => m.monster.abilities.map(a => ({ monster: m, ability: a })))
    .filter(p => p.ability.ability_type === 'PASSIVE' && p.ability.activation_trigger === 'ON_BATTLE_START')
    .sort((a, b) => (b.ability.priority || 0) - (a.ability.priority || 0));

  for (const { monster, ability } of battleStartPassives) {
    newState = _executePassive(newState, monster, ability);
  }
  return newState;
}

function _determineTargets(
  battleState: BattleState,
  attacker: BattleMonster,
  ability: Ability,
  targetId?: number,
): BattleMonster[] {
  const opponentTeam = attacker.isPlayer ? battleState.aiTeam : battleState.playerTeam;
  const friendlyTeam = attacker.isPlayer ? battleState.playerTeam : battleState.aiTeam;

  switch (ability.target_scope) {
    case 'ACTIVE_OPPONENT':
      return opponentTeam.filter(m => m && !m.isFainted).slice(0, 1);
    case 'ALL_OPPONENTS':
      return opponentTeam.filter(m => !m.isFainted);
    case 'ANY_ALLY':
      if (targetId) {
        return friendlyTeam.filter(m => m.id === targetId && !m.isFainted);
      }
      return [attacker].filter(m => m && !m.isFainted);
    default:
      return opponentTeam.filter(m => m && !m.isFainted).slice(0, 1);
  }
}

function _getActor(battleState: BattleState): BattleMonster | undefined {
  const team = battleState.turn === 'player' ? battleState.playerTeam : battleState.aiTeam;
  return team.find(m => !m.isFainted);
}

function _getModifiedStat(monster: BattleMonster, stat: 'power' | 'defense' | 'speed'): number {
    const statNameMapping = {
      power: 'basePower',
      defense: 'baseDefense',
      speed: 'baseSpeed'
    };
    const baseStatKey = statNameMapping[stat] as keyof typeof monster.monster;
    const baseStat = monster.monster[baseStatKey] as number || 0;

    let flatBonus = 0;
    let percentBonus = 0;

    (monster.activeEffects || []).forEach(effect => {
        if (effect.stat === stat) {
            if (effect.type === 'FLAT') {
                flatBonus += effect.value;
            } else if (effect.type === 'PERCENTAGE') {
                percentBonus += effect.value;
            }
        }
    });

    return (baseStat + flatBonus) * (1 + percentBonus / 100);
}

function _convertToBattleMonster(
    userMonster: UserMonster,
    isPlayer: boolean,
): BattleMonster {
    const monsterCopy = _deepCopy(userMonster.monster);

    const battleMaxHp = userMonster.maxHp!;
    const battleHp = userMonster.hp!;
    const battleMaxMp = userMonster.maxMp!;
    const battleMp = userMonster.mp!;

    return {
        id: userMonster.id,
        monsterId: userMonster.monsterId,
        level: userMonster.level,
        battleHp: battleHp,
        battleMaxHp: battleMaxHp,
        battleMp: battleMp,
        battleMaxMp: battleMaxMp,
        isFainted: (userMonster.hp ?? 0) <= 0,
        isPlayer,
        monster: monsterCopy,
        statusEffects: [],
        activeEffects: [],
    };
}

async function _runGlobalFaintCheck(battleState: BattleState, monsterId: number): Promise<BattleState> {
  let newState = _deepCopy(battleState);
  const monster = _findMonsterInState(newState, monsterId);

  if (monster && monster.battleHp <= 0 && !monster.isFainted) {
    const updates = {
      battleHp: 0,
      isFainted: true,
      statusEffects: [],
      activeEffects: []
    };
    newState = _updateMonsterInState(newState, monsterId, updates);
    newState.battleLog.push({ turn: newState.turnCount, message: `${monster.monster.name} has fainted!` });
    newState.events.push({ type: 'FAINT', targetId: monsterId });

    newState = await _checkWinCondition(newState);
  }
  return newState;
}

async function _checkWinCondition(battleState: BattleState): Promise<BattleState> {
    const playerTeamFainted = battleState.playerTeam.every(m => m.isFainted);
    const aiTeamFainted = battleState.aiTeam.every(m => m.isFainted);

    if (playerTeamFainted || aiTeamFainted) {
        let finalState = _deepCopy(battleState);
        const winner = aiTeamFainted ? 'player' : 'ai';
        const logMessage = aiTeamFainted ? 'You are victorious!' : 'You have been defeated!';

        finalState.battleEnded = true;
        finalState.winner = winner;
        finalState.battleLog.push({ turn: finalState.turnCount, message: logMessage });
        finalState.events.push({ type: 'BATTLE_END', winner: winner });

        try {
            await storage.saveFinalBattleState(finalState.playerTeam);
        } catch (err) {
            console.error('CRITICAL: Failed to save final battle state. Data will be lost.', err);
            throw new Error('Failed to save final battle state. Battle conclusion aborted.');
        }

        return finalState;
    }

    return battleState;
}

function _applyDamageToMonster(battleState: BattleState, monsterId: number, damage: number, isSelfInflicted: boolean): BattleState {
  const monster = _findMonsterInState(battleState, monsterId);
  if (!monster) return battleState;

  const newHp = Math.max(0, monster.battleHp - damage); // Ensure HP doesn't go below 0
  let newState = _updateMonsterInState(battleState, monsterId, { battleHp: newHp });

  newState.events.push({ type: 'DAMAGE', targetId: monsterId, amount: damage });
  return newState;
}

function _findMonsterInState(state: BattleState, monsterId: number): BattleMonster | undefined {
  return [...state.playerTeam, ...state.aiTeam].find(m => m.id === monsterId);
}

function _updateMonsterInState(state: BattleState, monsterId: number, updates: Partial<BattleMonster>): BattleState {
    let newState = _deepCopy(state);
    const playerTeamIndex = newState.playerTeam.findIndex(m => m.id === monsterId);
    if(playerTeamIndex > -1){
        newState.playerTeam[playerTeamIndex] = { ...newState.playerTeam[playerTeamIndex], ...updates };
        return newState;
    }

    const aiTeamIndex = newState.aiTeam.findIndex(m => m.id === monsterId);
    if(aiTeamIndex > -1){
        newState.aiTeam[aiTeamIndex] = { ...newState.aiTeam[aiTeamIndex], ...updates };
    }

    return newState;
}

function _getPassives(monster: BattleMonster, trigger: Ability['activation_trigger']): Ability[] {
  return monster.monster.abilities
    .filter(a => a.ability_type === 'PASSIVE' && a.activation_trigger === trigger)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function _deepCopy<T>(obj: T): T {
  return structuredClone(obj);
}