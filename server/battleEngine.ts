import { UserMonster, Monster, Ability, PlayerCombatMonster, AiCombatMonster, ActiveEffect, StatModifier } from '../shared/schema';
import { storage } from './storage';
import { nanoid } from 'nanoid';

// (Type Definitions remain the same)
// ...

const calculateDamage = (attacker: PlayerCombatMonster | AiCombatMonster, defender: PlayerCombatMonster | AiCombatMonster, ability: Ability): number => {
    const power = 'monster' in attacker ? attacker.power : (attacker as AiCombatMonster).basePower;
    const defense = 'monster' in defender ? defender.defense : (defender as AiCombatMonster).baseDefense;
    const powerMultiplier = parseFloat(ability.power_multiplier as any) || 0.5;
    const damage = Math.round(((power * powerMultiplier) / (defense + 25)) * 10);
    return Math.round(Math.max(1, damage));
};

// --- Main Action Processor ---
// This function now only processes ONE action and returns the resulting state.
export async function processAction(initialState: BattleState, action: Action): Promise<{ nextState: BattleState, log: string[] }> {
    let state: BattleState = JSON.parse(JSON.stringify(initialState));
    state.log = [];
    state.activeEffects = state.activeEffects || [];

    if (action.type === 'USE_ABILITY') {
        const isPlayerAction = state.playerTeam.some(p => p.id === action.payload.casterId);

        const attacker = isPlayerAction 
            ? state.playerTeam.find(p => p.id === action.payload.casterId)
            : state.aiTeam.find(a => a.id === action.payload.casterId);

        let defender = isPlayerAction 
            ? state.aiTeam.find(a => a.id === action.payload.targetId)
            : state.playerTeam.find(p => p.id === action.payload.targetId);

        if (!attacker || !defender) throw new Error("Attacker or Defender not found in battle state.");

        const attackerName = 'monster' in attacker ? attacker.monster.name : attacker.name;
        const defenderName = 'monster' in defender ? defender.monster.name : defender.name;

        const abilities = await storage.getMonsterAbilities('monster' in attacker ? attacker.monsterId : attacker.id as number);
        const ability = abilities.find((a: Ability) => a.id === action.payload.abilityId);

        if ((attacker.hp ?? 0) > 0 && ability) {
            const damage = calculateDamage(attacker, defender, ability);

            if ('monster' in defender) { // Defender is a PlayerCombatMonster
                state.playerTeam = state.playerTeam.map(p => p.id === defender!.id ? { ...p, hp: Math.max(0, (p.hp ?? 0) - damage) } : p);
            } else { // Defender is an AiCombatMonster
                state.aiTeam = state.aiTeam.map(a => a.id === defender!.id ? { ...a, hp: Math.max(0, a.hp - damage) } : a);
            }

            if ('monster' in attacker) { // Attacker is a PlayerCombatMonster
                 state.playerTeam = state.playerTeam.map(p => p.id === attacker!.id ? { ...p, mp: (p.mp ?? 0) - (ability.mp_cost || 0) } : p);
            } else { // Attacker is an AiCombatMonster
                state.aiTeam = state.aiTeam.map(a => a.id === attacker!.id ? { ...a, mp: a.mp - (ability.mp_cost || 0) } : a);
            }

            state.log.push(`${attackerName} used ${ability.name}, dealing ${damage} damage to ${defenderName}!`);
        }
    } else if (action.type === 'SWAP_MONSTER') {
        const newIndex = state.playerTeam.findIndex((p: PlayerCombatMonster) => p.id === action.payload.monsterId);
        if (newIndex !== -1 && (state.playerTeam[newIndex].hp ?? 0) > 0 && newIndex !== state.activePlayerIndex) {
            state.log.push(`You withdrew ${state.playerTeam[state.activePlayerIndex].monster.name}.`);
            state.activePlayerIndex = newIndex;
            state.log.push(`Go, ${state.playerTeam[state.activePlayerIndex].monster.name}!`);
        }
    }

    return { nextState: state, log: state.log };
}

// This new function determines the AI's move.
export function getAiAction(battleState: BattleState): Action {
    const attacker = battleState.aiTeam[battleState.activeAiIndex];
    const target = battleState.playerTeam[battleState.activePlayerIndex];

    // For now, AI always uses its first available active ability
    const ability = attacker.abilities.find(a => a.ability_type === 'ACTIVE');

    return {
        type: 'USE_ABILITY',
        payload: {
            abilityId: ability!.id,
            casterId: attacker.id,
            targetId: target.id
        }
    };
}