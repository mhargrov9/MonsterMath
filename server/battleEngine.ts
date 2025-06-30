import { UserMonster, Monster, Ability, PlayerCombatMonster, AiCombatMonster, ActiveEffect, StatModifier } from '../shared/schema';
import { storage } from './storage';

// --- Type Definitions ---
// Added 'status' to ActiveEffect for effects like Poison, Paralyze, etc.
interface ActiveEffect {
    id: string;
    sourceAbilityId: number;
    targetMonsterId: number | string;
    // An effect can be a stat modifier OR a status condition.
    modifier?: StatModifier; 
    status?: string;
    duration: number;
    damagePerTurn?: number; // For DoT effects
}

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
    turnSkipped?: boolean;
}

// --- Calculation & Helper Logic (remains here) ---
const calculateDamage = (attacker: PlayerCombatMonster | AiCombatMonster, defender: PlayerCombatMonster | AiCombatMonster, ability: Ability, activeEffects: ActiveEffect[]): number => { /* ... */ return 0; };
const getModifiedStat = (monster: PlayerCombatMonster | AiCombatMonster, statName: 'power' | 'defense' | 'speed', activeEffects: ActiveEffect[]): number => { /* ... */ return 0; };


// --- Phase Handlers ---

function handleStartOfTurn(currentState: BattleState, whoseTurn: 'player' | 'ai'): TurnPhaseResult {
    console.log(`[battleEngine] Executing Start-of-Turn Phase for: ${whoseTurn}`);
    let state = { ...currentState };
    const logEntries: string[] = [];
    let turnSkipped = false;

    const activeMonster = whoseTurn === 'player' ? state.playerTeam[state.activePlayerIndex] : state.aiTeam[state.activeAiIndex];
    const monsterName = 'monster' in activeMonster ? activeMonster.monster.name : activeMonster.name;

    // 1. Check for turn-skipping status effects
    const paralysisEffect = state.activeEffects.find(e => e.targetMonsterId === activeMonster.id && e.status === 'PARALYZED');
    if (paralysisEffect) {
        logEntries.push(`SYSTEM: ${monsterName} is paralyzed!`);
        if (Math.random() < 0.25) { // 25% chance to be fully paralyzed
            logEntries.push(`SYSTEM: ${monsterName} is fully paralyzed and cannot move!`);
            turnSkipped = true;
        } else {
            logEntries.push(`SYSTEM: ${monsterName} managed to move through the paralysis!`);
        }
    }

    // 2. If turn is not skipped, apply DoT effects
    if (!turnSkipped) {
        const poisonEffect = state.activeEffects.find(e => e.targetMonsterId === activeMonster.id && e.status === 'POISONED');
        if (poisonEffect) {
            const dotDamage = poisonEffect.damagePerTurn || 15;
            logEntries.push(`SYSTEM: ${monsterName} is hurt by poison, taking ${dotDamage} damage!`);
            if ('monster' in activeMonster) { // It's a PlayerCombatMonster
                state.playerTeam = state.playerTeam.map((m, i) => i === state.activePlayerIndex ? { ...m, hp: Math.max(0, (m.hp ?? 0) - dotDamage) } : m);
            } else { // It's an AiCombatMonster
                state.aiTeam = state.aiTeam.map((m, i) => i === state.activeAiIndex ? { ...m, hp: Math.max(0, m.hp - dotDamage) } : m);
            }
        }
    }

    // 3. Apply start-of-turn passives (to be implemented)

    return { newState: state, logEntries, turnSkipped };
}

async function handleActionPhase(currentState: BattleState, action: Action, whoseTurn: 'player' | 'ai'): Promise<TurnPhaseResult> {
    console.log(`[battleEngine] Executing Action Phase for: ${whoseTurn}`);
    let state = { ...currentState };
    const logEntries: string[] = [];

    if (whoseTurn === 'player') {
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
    } else { // AI's turn
        const activeAi = state.aiTeam[state.activeAiIndex];
        if (activeAi.hp > 0) {
            const playerDefender = state.playerTeam[state.activePlayerIndex];
            if ((playerDefender.hp ?? 0) > 0) {
                const aiAbility = activeAi.abilities.find((a) => a.ability_type === 'ACTIVE');
                if (aiAbility) {
                    const damage = calculateDamage(activeAi, playerDefender, aiAbility, state.activeEffects);
                    const newPlayerDefender = { ...playerDefender, hp: Math.max(0, (playerDefender.hp ?? 0) - damage) };
                    state.playerTeam = state.playerTeam.map((m, i) => i === state.activePlayerIndex ? newPlayerDefender : m);
                    state.aiTeam = state.aiTeam.map((m, i) => i === state.activeAiIndex ? { ...m, mp: m.mp - (aiAbility.mp_cost || 0) } : m);
                    logEntries.push(`Opponent's ${activeAi.name} used ${aiAbility.name}, dealing ${damage} damage!`);
                }
            }
        }
    }

    return { newState: state, logEntries };
}

function handleEndOfTurn(currentState: BattleState, whoseTurn: 'player' | 'ai'): TurnPhaseResult {
    console.log(`[battleEngine] Executing End-of-Turn Phase for: ${whoseTurn}`);
    // Placeholder: We will decrement status effect durations and apply end-of-turn passives here.
    return { newState: currentState, logEntries: [] };
}


// --- Main Turn Orchestrator ---
export async function processTurn(initialState: BattleState, action: Action) {
    let state: BattleState = JSON.parse(JSON.stringify(initialState));
    // For now, activeEffects are passed in, but not saved between turns. We'll fix this later.
    state.activeEffects = state.activeEffects || [];
    state.log = [];

    // --- PLAYER'S TURN ---
    // 1. Player Start-of-Turn
    const playerStartResult = handleStartOfTurn(state, 'player');
    state = playerStartResult.newState;
    state.log.push(...playerStartResult.logEntries);

    // 2. Player Action Phase (if not skipped)
    if (!playerStartResult.turnSkipped) {
        const playerActionResult = await handleActionPhase(state, action, 'player');
        state = playerActionResult.newState;
        state.log.push(...playerActionResult.logEntries);
    }

    // 3. Player End-of-Turn
    const playerEndResult = handleEndOfTurn(state, 'player');
    state = playerEndResult.newState;
    state.log.push(...playerEndResult.logEntries);

    // --- AI'S TURN ---
    // 4. AI Start-of-Turn
    const aiStartResult = handleStartOfTurn(state, 'ai');
    state = aiStartResult.newState;
    state.log.push(...aiStartResult.logEntries);

    // 5. AI Action Phase (if not skipped)
    if (!aiStartResult.turnSkipped) {
        const aiActionResult = await handleActionPhase(state, action, 'ai');
        state = aiActionResult.newState;
        state.log.push(...aiActionResult.logEntries);
    }

    // 6. AI End-of-Turn
    const aiEndResult = handleEndOfTurn(state, 'ai');
    state = aiEndResult.newState;
    state.log.push(...aiEndResult.logEntries);

    return { nextState: state, log: state.log };
}