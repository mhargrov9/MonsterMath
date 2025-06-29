import { UserMonster, Monster, Ability, PlayerCombatMonster, AiCombatMonster, ActiveEffect, StatModifier } from '../shared/schema';
import { storage } from './storage';

// --- Type Definitions ---
type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
    activeEffects: ActiveEffect[];
    log: string[];
};

type Action = {
    type: 'USE_ABILITY' | 'SWAP_MONSTER';
    payload: {
        abilityId?: number;
        targetId?: number | string;
        monsterId?: number;
    };
};

type TurnPhaseResult = {
    newState: BattleState;
    logEntries: string[];
}

// --- Calculation Logic ---
// (calculateDamage and getModifiedStat functions remain here, unchanged)
const calculateDamage = (attacker: PlayerCombatMonster | AiCombatMonster, defender: PlayerCombatMonster | AiCombatMonster, ability: Ability, activeEffects: ActiveEffect[]): number => {
    if (!ability) return 0;
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attacker, scalingStatName, activeEffects);
    const defendingDefense = getModifiedStat(defender, 'defense', activeEffects);
    const powerMultiplier = parseFloat(ability.power_multiplier || '0.5');
    const attackPower = attackingPower * powerMultiplier;
    const damageMultiplier = 100 / (100 + defendingDefense);
    const rawDamage = attackPower * damageMultiplier;
    return Math.round(Math.max(1, rawDamage));
};

const getModifiedStat = (monster: PlayerCombatMonster | AiCombatMonster, statName: 'power' | 'defense' | 'speed', activeEffects: ActiveEffect[]): number => {
    // This logic would be fully implemented here
    if ('monster' in monster) {
        return monster[statName] ?? 0;
    }
    if (statName === 'power') return monster.basePower;
    if (statName === 'defense') return monster.baseDefense;
    return monster.baseSpeed;
};


// --- Phase Handlers ---

function handleStartOfTurn(currentState: BattleState): TurnPhaseResult {
    // Placeholder: In the future, we will check for status effects like PARALYZED or apply POISON damage here.
    console.log('[battleEngine] Executing Start-of-Turn Phase...');
    return { newState: currentState, logEntries: [] };
}

async function handleActionPhase(currentState: BattleState, action: Action): Promise<TurnPhaseResult> {
    console.log('[battleEngine] Executing Action Phase...');
    let state = { ...currentState };
    const logEntries: string[] = [];

    // Player Action
    if (action.type === 'USE_ABILITY') {
        const attacker = state.playerTeam[state.activePlayerIndex];
        const defender = state.aiTeam[state.activeAiIndex];
        const abilities = await storage.getMonsterAbilities(attacker.monsterId);
        const ability = abilities.find((a: Ability) => a.id === action.payload.abilityId);

        if ((attacker.hp ?? 0) > 0 && ability) {
            const damage = calculateDamage(attacker, defender, ability, state.activeEffects);
            const newDefender = { ...defender, hp: Math.max(0, defender.hp - damage) };
            state.aiTeam = state.aiTeam.map((m, i) => i === state.activeAiIndex ? newDefender : m);
            state.playerTeam = state.playerTeam.map((m, i) => i === state.activePlayerIndex ? { ...m, mp: (m.mp ?? 0) - (ability.mp_cost || 0) } : m);
            logEntries.push(`Your ${attacker.monster.name} used ${ability.name}, dealing ${damage} damage!`);
        }
    } else if (action.type === 'SWAP_MONSTER') {
        // This logic will be expanded later
    }

    // AI Response
    let activeAi = state.aiTeam[state.activeAiIndex];
    if (activeAi.hp > 0) {
        const playerDefender = state.playerTeam[state.activePlayerIndex];
        if ((playerDefender.hp ?? 0) > 0) {
            const aiAbility = activeAi.abilities.find((a) => a.ability_type === 'ACTIVE');
            if (aiAbility) {
                const damage = calculateDamage(activeAi, playerDefender, aiAbility, state.activeEffects);
                const newPlayerDefender = { ...playerDefender, hp: Math.max(0, (playerDefender.hp ?? 0) - damage) };
                state.playerTeam = state.playerTeam.map((m, i) => i === state.activePlayerIndex ? newPlayerDefender : m);
                state.aiTeam = state.aiTeam.map((m, i) => i === state.activeAiIndex ? { ...m, mp: m.mp - (aiAbility.mp_cost || 0)} : m);
                logEntries.push(`Opponent's ${activeAi.name} used ${aiAbility.name}, dealing ${damage} damage!`);
            }
        }
    }

    return { newState: state, logEntries };
}

function handleEndOfTurn(currentState: BattleState): TurnPhaseResult {
    // Placeholder: In the future, we will apply passives like Soothing Aura or tick down status effect durations here.
    console.log('[battleEngine] Executing End-of-Turn Phase...');
    return { newState: currentState, logEntries: [] };
}


// --- Main Turn Orchestrator ---
export async function processTurn(initialState: BattleState, action: Action) {
    let state = JSON.parse(JSON.stringify(initialState));
    state.activeEffects = []; // Initialize empty for now
    state.log = [];

    // 1. Start-of-Turn Phase
    const startOfTurnResult = handleStartOfTurn(state);
    state = startOfTurnResult.newState;
    state.log.push(...startOfTurnResult.logEntries);

    // Check if turn was skipped by a status effect, etc. If so, jump to End-of-Turn.
    // (Logic to be added here)

    // 2. Action Phase
    const actionPhaseResult = await handleActionPhase(state, action);
    state = actionPhaseResult.newState;
    state.log.push(...actionPhaseResult.logEntries);

    // Check for fainted monsters after action
    // (Logic to be added here)

    // 3. End-of-Turn Phase
    const endOfTurnResult = handleEndOfTurn(state);
    state = endOfTurnResult.newState;
    state.log.push(...endOfTurnResult.logEntries);

    return { nextState: state, log: state.log };
}