import { nanoid } from 'nanoid';
import { storage } from './storage';
import { 
  BattleState, 
  TurnAction, 
  TurnResult, 
  TurnPhase, 
  StatusEffect,
  ActiveEffect,
  TurnSnapshot,
  CurrentTurn
} from './types/battle';
import { PlayerCombatMonster, AiCombatMonster, Ability } from '@shared/schema';

/**
 * Server-authoritative battle engine with complete turn lifecycle
 * This is the single source of truth for all battle logic
 */
export class BattleEngine {

  /**
   * Processes a complete turn with all three phases
   */
  async processTurn(state: BattleState, action: TurnAction, isPlayerAction: boolean): Promise<TurnResult> {
    try {
      // Deep clone state to ensure immutability
      let newState: BattleState = JSON.parse(JSON.stringify(state));
      const turnLog: string[] = [];

      // Determine which monster is acting
      const actingMonster = this.getActingMonster(newState, isPlayerAction);
      if (!actingMonster || actingMonster.hp <= 0) {
        return {
          success: false,
          nextState: newState,
          log: ['Invalid acting monster or monster has fainted'],
          error: 'INVALID_MONSTER'
        };
      }

      // Create turn snapshot for history
      const turnSnapshot: TurnSnapshot = {
        turnNumber: newState.turnCount,
        phase: 'start-of-turn',
        actingMonsterId: actingMonster.id,
        action,
        stateBeforeAction: this.createStateSnapshot(newState)
      };

      // Phase 1: Start of Turn
      const startOfTurnResult = await this.handleStartOfTurn(newState, actingMonster, isPlayerAction);
      newState = startOfTurnResult.state;
      turnLog.push(...startOfTurnResult.log);

      // Check if turn was skipped (e.g., paralyzed)
      if (startOfTurnResult.turnSkipped) {
        turnSnapshot.effects = ['Turn skipped due to status effect'];
      } else {
        // Phase 2: Action Phase
        turnSnapshot.phase = 'action';
        const actionResult = await this.handleAction(newState, action, isPlayerAction);
        newState = actionResult.state;
        turnLog.push(...actionResult.log);

        if (actionResult.damage) turnSnapshot.damage = actionResult.damage;
        if (actionResult.healing) turnSnapshot.healing = actionResult.healing;
      }

      // Phase 3: End of Turn
      turnSnapshot.phase = 'end-of-turn';
      const endOfTurnResult = await this.handleEndOfTurn(newState, actingMonster, isPlayerAction);
      newState = endOfTurnResult.state;
      turnLog.push(...endOfTurnResult.log);

      // Update turn state
      turnSnapshot.stateAfterAction = this.createStateSnapshot(newState);
      newState.turnHistory.push(turnSnapshot);
      newState.log.push(...turnLog);
      newState.turnCount++;

      // Switch turns
      newState.currentTurn = isPlayerAction ? 'ai' : 'player';

      // Check for battle end conditions
      const battleEnd = this.checkBattleEnd(newState);
      if (battleEnd) {
        newState.status = battleEnd;
      }

      return {
        success: true,
        nextState: newState,
        log: turnLog
      };

    } catch (error) {
      console.error('[BattleEngine] Error processing turn:', error);
      return {
        success: false,
        nextState: state,
        log: ['An error occurred processing the turn'],
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Phase 1: Start of Turn - Handle status effects and start-of-turn passives
   */
  private async handleStartOfTurn(
    state: BattleState, 
    actingMonster: PlayerCombatMonster | AiCombatMonster,
    isPlayerAction: boolean
  ): Promise<{ state: BattleState; log: string[]; turnSkipped: boolean }> {
    const log: string[] = [];
    let turnSkipped = false;

    // Check paralyze/freeze effects
    const paralyzed = state.statusEffects?.find(
      e => e.targetMonsterId === actingMonster.id && e.type === 'PARALYZED'
    );

    if (paralyzed && Math.random() < (paralyzed.chance || 0.25)) {
      log.push(`${this.getMonsterName(actingMonster)} is paralyzed and cannot move!`);
      turnSkipped = true;
      return { state, log, turnSkipped };
    }

    // Apply damage-over-time effects
    const burnEffect = state.statusEffects?.find(
      e => e.targetMonsterId === actingMonster.id && e.type === 'BURNED'
    );

    if (burnEffect) {
      const damage = burnEffect.value || 10;
      log.push(`${this.getMonsterName(actingMonster)} takes ${damage} burn damage!`);
      state = this.applyDamage(state, actingMonster.id, damage, isPlayerAction);
    }

    const poisonEffect = state.statusEffects?.find(
      e => e.targetMonsterId === actingMonster.id && e.type === 'POISONED'
    );

    if (poisonEffect) {
      const damage = poisonEffect.value || 15;
      log.push(`${this.getMonsterName(actingMonster)} takes ${damage} poison damage!`);
      state = this.applyDamage(state, actingMonster.id, damage, isPlayerAction);
    }

    // Process start-of-turn passive abilities
    const abilities = await this.getMonsterAbilities(actingMonster);
    for (const ability of abilities) {
      if (ability.ability_type === 'PASSIVE' && 
          ability.activation_trigger === 'START_OF_TURN' &&
          this.checkPassiveCondition(state, actingMonster, ability)) {
        const passiveResult = await this.applyPassiveAbility(state, actingMonster, ability, isPlayerAction);
        state = passiveResult.state;
        log.push(...passiveResult.log);
      }
    }

    return { state, log, turnSkipped };
  }

  /**
   * Phase 2: Action Phase - Process the chosen action
   */
  private async handleAction(
    state: BattleState,
    action: TurnAction,
    isPlayerAction: boolean
  ): Promise<{ state: BattleState; log: string[]; damage?: number; healing?: number }> {
    const log: string[] = [];
    let damage: number | undefined;
    let healing: number | undefined;

    switch (action.type) {
      case 'USE_ABILITY': {
        const result = await this.handleAbilityUse(state, action.payload, isPlayerAction);
        state = result.state;
        log.push(...result.log);
        damage = result.damage;
        healing = result.healing;
        break;
      }

      case 'SWAP_MONSTER': {
        const result = this.handleMonsterSwap(state, action.payload.monsterId!, isPlayerAction);
        state = result.state;
        log.push(...result.log);
        break;
      }

      case 'FORFEIT': {
        state.status = isPlayerAction ? 'defeat' : 'victory';
        log.push(`${isPlayerAction ? 'Player' : 'AI'} forfeited the battle!`);
        break;
      }
    }

    return { state, log, damage, healing };
  }

  /**
   * Phase 3: End of Turn - Handle end-of-turn effects and cleanup
   */
  private async handleEndOfTurn(
    state: BattleState,
    actingMonster: PlayerCombatMonster | AiCombatMonster,
    isPlayerAction: boolean
  ): Promise<{ state: BattleState; log: string[] }> {
    const log: string[] = [];

    // Process end-of-turn passive abilities (including bench passives)
    const allMonsters = isPlayerAction ? state.playerTeam : state.aiTeam;

    for (const monster of allMonsters) {
      if (monster.hp > 0) {
        const abilities = await this.getMonsterAbilities(monster);

        for (const ability of abilities) {
          if (ability.ability_type === 'PASSIVE' && 
              ability.activation_trigger === 'END_OF_TURN') {

            // Check if this passive can activate from bench
            const canActivate = ability.activation_scope === 'BENCH' || 
                               (ability.activation_scope === 'ACTIVE' && monster.id === actingMonster.id);

            if (canActivate && this.checkPassiveCondition(state, monster, ability)) {
              const passiveResult = await this.applyPassiveAbility(state, monster, ability, isPlayerAction);
              state = passiveResult.state;
              log.push(...passiveResult.log);
            }
          }
        }
      }
    }

    // Decrement effect durations
    state.activeEffects = state.activeEffects
      .map(effect => ({ ...effect, duration: effect.duration - 1 }))
      .filter(effect => effect.duration > 0);

    if (state.statusEffects) {
      state.statusEffects = state.statusEffects
        .map(effect => ({ ...effect, duration: effect.duration - 1 }))
        .filter(effect => effect.duration > 0);
    }

    // Clean up fainted monsters' effects
    const faintedMonsterIds = [
      ...state.playerTeam.filter(m => m.hp <= 0).map(m => m.id),
      ...state.aiTeam.filter(m => m.hp <= 0).map(m => m.id)
    ];

    state.activeEffects = state.activeEffects.filter(
      effect => !faintedMonsterIds.includes(effect.targetMonsterId)
    );

    return { state, log };
  }

  /**
   * Handles ability usage with full validation
   */
  private async handleAbilityUse(
    state: BattleState,
    payload: { abilityId?: number; targetId?: number },
    isPlayerAction: boolean
  ): Promise<{ state: BattleState; log: string[]; damage?: number; healing?: number }> {
    const log: string[] = [];
    let damage: number | undefined;
    let healing: number | undefined;

    const attacker = this.getActingMonster(state, isPlayerAction);
    if (!attacker || !payload.abilityId || !payload.targetId) {
      log.push('Invalid ability use parameters');
      return { state, log };
    }

    // Get ability details
    const abilities = await this.getMonsterAbilities(attacker);
    const ability = abilities.find(a => a.id === payload.abilityId);

    if (!ability || ability.ability_type !== 'ACTIVE') {
      log.push('Invalid ability');
      return { state, log };
    }

    // Check MP cost
    if ((ability.mp_cost || 0) > (attacker.mp || 0)) {
      log.push(`${this.getMonsterName(attacker)} doesn't have enough MP!`);
      return { state, log };
    }

    // Deduct MP
    state = this.deductMP(state, attacker.id, ability.mp_cost || 0, isPlayerAction);

    // Handle different ability types
    if (ability.healing_power && ability.healing_power > 0) {
      // Healing ability
      const target = this.findMonsterById(state, payload.targetId);
      if (!target) {
        log.push('Invalid healing target');
        return { state, log };
      }

      healing = ability.healing_power;
      const targetName = this.getMonsterName(target);
      log.push(`${this.getMonsterName(attacker)} used ${ability.name}, healing ${targetName} for ${healing} HP!`);

      state = this.applyHealing(state, payload.targetId, healing, target.isPlayer);

    } else if (ability.power_multiplier) {
      // Damage ability
      const target = this.findMonsterById(state, payload.targetId);
      if (!target) {
        log.push('Invalid target');
        return { state, log };
      }

      damage = this.calculateDamage(attacker, target.monster, ability, state);
      const targetName = this.getMonsterName(target.monster);

      log.push(`${this.getMonsterName(attacker)} used ${ability.name}, dealing ${damage} damage to ${targetName}!`);

      state = this.applyDamage(state, payload.targetId, damage, target.isPlayer);

      // Apply status effects if any
      if (ability.status_effect_applies && Math.random() < (ability.status_effect_chance || 0)) {
        const statusEffect: StatusEffect = {
          id: nanoid(),
          type: ability.status_effect_applies as any,
          targetMonsterId: payload.targetId,
          duration: ability.status_effect_duration || 2,
          value: ability.status_effect_value || 10
        };

        if (!state.statusEffects) state.statusEffects = [];
        state.statusEffects.push(statusEffect);

        log.push(`${targetName} was inflicted with ${ability.status_effect_applies}!`);
      }
    }

    // Apply stat modifiers if any
    if (ability.stat_modifiers) {
      const modifiers = ability.stat_modifiers as any[];
      for (const mod of modifiers) {
        const effect: ActiveEffect = {
          id: nanoid(),
          sourceAbilityId: ability.id,
          targetMonsterId: payload.targetId,
          stat: mod.stat,
          type: mod.type,
          value: mod.value,
          duration: mod.duration || 3
        };
        state.activeEffects.push(effect);
        log.push(`${this.getMonsterName(target!.monster)}'s ${mod.stat} was ${mod.value > 0 ? 'increased' : 'decreased'}!`);
      }
    }

    return { state, log, damage, healing };
  }

  /**
   * Handles monster swapping
   */
  private handleMonsterSwap(
    state: BattleState,
    monsterId: number,
    isPlayerAction: boolean
  ): { state: BattleState; log: string[] } {
    const log: string[] = [];
    const team = isPlayerAction ? state.playerTeam : state.aiTeam;
    const newIndex = team.findIndex(m => m.id === monsterId);

    if (newIndex === -1 || team[newIndex].hp <= 0) {
      log.push('Invalid swap target');
      return { state, log };
    }

    const oldMonster = team[isPlayerAction ? state.activePlayerIndex : state.activeAiIndex];
    const newMonster = team[newIndex];

    if (isPlayerAction) {
      state.activePlayerIndex = newIndex;
    } else {
      state.activeAiIndex = newIndex;
    }

    log.push(`${this.getMonsterName(oldMonster)} withdrew! ${this.getMonsterName(newMonster)} entered the battle!`);

    return { state, log };
  }

  /**
   * Calculates damage with all modifiers
   */
  private calculateDamage(
    attacker: PlayerCombatMonster | AiCombatMonster,
    defender: PlayerCombatMonster | AiCombatMonster,
    ability: Ability,
    state: BattleState
  ): number {
    // Get base stats
    let attackerPower = this.getMonsterStat(attacker, 'power');
    let defenderDefense = this.getMonsterStat(defender, 'defense');

    // Apply active effects
    attackerPower = this.applyStatModifiers(attackerPower, attacker.id, 'power', state);
    defenderDefense = this.applyStatModifiers(defenderDefense, defender.id, 'defense', state);

    // Use the scaling stat specified by the ability
    if (ability.scaling_stat && ability.scaling_stat !== 'POWER') {
      const scalingStat = ability.scaling_stat.toLowerCase() as 'defense' | 'speed';
      attackerPower = this.getMonsterStat(attacker, scalingStat);
      attackerPower = this.applyStatModifiers(attackerPower, attacker.id, scalingStat, state);
    }

    // Calculate base damage
    const multiplier = parseFloat(ability.power_multiplier as any) || 0.5;
    let damage = Math.round(((attackerPower * multiplier) / (defenderDefense + 25)) * 10);

    // Type effectiveness (simplified for now)
    const effectiveness = this.calculateTypeEffectiveness(ability.affinity, defender);
    damage = Math.round(damage * effectiveness);

    // Minimum damage is always 1
    return Math.max(1, damage);
  }

  /**
   * Applies stat modifiers from active effects
   */
  private applyStatModifiers(
    baseStat: number,
    monsterId: number,
    stat: 'power' | 'defense' | 'speed',
    state: BattleState
  ): number {
    let modifiedStat = baseStat;

    // Apply flat modifiers first
    const flatModifiers = state.activeEffects.filter(
      e => e.targetMonsterId === monsterId && e.stat === stat && e.type === 'FLAT'
    );

    for (const mod of flatModifiers) {
      modifiedStat += mod.value;
    }

    // Then apply percentage modifiers
    const percentModifiers = state.activeEffects.filter(
      e => e.targetMonsterId === monsterId && e.stat === stat && e.type === 'PERCENTAGE'
    );

    for (const mod of percentModifiers) {
      modifiedStat = Math.round(modifiedStat * (1 + mod.value / 100));
    }

    return Math.max(1, modifiedStat); // Stats can't go below 1
  }

  /**
   * Applies damage to a monster
   */
  private applyDamage(
    state: BattleState,
    targetId: number,
    damage: number,
    isPlayerMonster: boolean
  ): BattleState {
    if (isPlayerMonster) {
      state.playerTeam = state.playerTeam.map(m => 
        m.id === targetId ? { ...m, hp: Math.max(0, (m.hp || 0) - damage) } : m
      );
    } else {
      state.aiTeam = state.aiTeam.map(m => 
        m.id === targetId ? { ...m, hp: Math.max(0, m.hp - damage) } : m
      );
    }

    return state;
  }

  /**
   * Applies healing to a monster
   */
  private applyHealing(
    state: BattleState,
    targetId: number,
    healing: number,
    isPlayerMonster: boolean
  ): BattleState {
    if (isPlayerMonster) {
      state.playerTeam = state.playerTeam.map(m => 
        m.id === targetId ? { ...m, hp: Math.min(m.maxHp || 100, (m.hp || 0) + healing) } : m
      );
    } else {
      state.aiTeam = state.aiTeam.map(m => 
        m.id === targetId ? { ...m, hp: Math.min(m.maxHp || 100, m.hp + healing) } : m
      );
    }

    return state;
  }

  /**
   * Deducts MP from a monster
   */
  private deductMP(
    state: BattleState,
    monsterId: number,
    mpCost: number,
    isPlayerMonster: boolean
  ): BattleState {
    if (isPlayerMonster) {
      state.playerTeam = state.playerTeam.map(m => 
        m.id === monsterId ? { ...m, mp: Math.max(0, (m.mp || 0) - mpCost) } : m
      );
    } else {
      state.aiTeam = state.aiTeam.map(m => 
        m.id === monsterId ? { ...m, mp: Math.max(0, m.mp - mpCost) } : m
      );
    }

    return state;
  }

  /**
   * Checks if a passive ability's conditions are met
   */
  private checkPassiveCondition(
    state: BattleState,
    monster: PlayerCombatMonster | AiCombatMonster,
    ability: Ability
  ): boolean {
    if (!ability.trigger_condition_type) return true;

    switch (ability.trigger_condition_type) {
      case 'HP_PERCENT': {
        const hpPercent = (monster.hp / (monster.maxHp || 100)) * 100;
        const threshold = ability.trigger_condition_value || 50;

        switch (ability.trigger_condition_operator) {
          case 'LESS_THAN_OR_EQUAL':
            return hpPercent <= threshold;
          case 'GREATER_THAN':
            return hpPercent > threshold;
          default:
            return true;
        }
      }
      default:
        return true;
    }
  }

  /**
   * Applies a passive ability effect
   */
  private async applyPassiveAbility(
    state: BattleState,
    sourceMonster: PlayerCombatMonster | AiCombatMonster,
    ability: Ability,
    isPlayerMonster: boolean
  ): Promise<{ state: BattleState; log: string[] }> {
    const log: string[] =