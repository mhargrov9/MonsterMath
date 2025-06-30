import { UserMonster, Monster, Ability, PlayerCombatMonster, AiCombatMonster } from '../shared/schema';
import { storage } from './storage';

// --- Type Definitions ---
type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
    log: string[];
};

type Action = {
    type: 'USE_ABILITY' | 'SWAP_MONSTER';
    payload: { 
        abilityId?: number; 
        casterId?: number | string;
        targetId?: number | string;
        monsterId?: number;
    };
};

const calculateDamage = (attacker: PlayerCombatMonster | AiCombatMonster, defender: PlayerCombatMonster | AiCombatMonster, ability: Ability): number => {
    const power = 'monster' in attacker ? attacker.power : attacker.basePower;
    const defense = 'monster' in defender ? defender.defense : defender.baseDefense;
    const powerMultiplier = parseFloat(ability.power_multiplier as any) || 0.5;
    const damage = Math.round(((power * powerMultiplier) / (defense + 25)) * 10);
    return Math.max(1, damage);
};

export async function processAction(initialState: BattleState, action: Action): Promise<{ nextState: BattleState, log: string[] }> {
    let state: BattleState = JSON.parse(JSON.stringify(initialState));
    state.log = [];

    if (action.type === 'USE_ABILITY') {
        const isPlayerAction = !!state.playerTeam.find(p => p.id === action.payload.casterId);

        const attacker = isPlayerAction 
            ? state.playerTeam.find(p => p.id === action.payload.casterId)
            : state.aiTeam.find(a => a.id === action.payload.casterId);

        let defender = isPlayerAction 
            ? state.aiTeam.find(a => a.id === action.payload.targetId)
            : state.playerTeam.find(p => p.id === action.payload.targetId);

        if (!attacker || !defender) throw new Error("Attacker or Defender not found");

        const abilities = await storage.getMonsterAbilities('monster' in attacker ? attacker.monsterId : attacker.id as number);
        const ability = abilities.find((a: Ability) => a.id === action.payload.abilityId);

        if ((attacker.hp ?? 0) > 0 && ability) {
            const attackerName = 'monster' in attacker ? attacker.monster.name : attacker.name;

            if (ability.healing_power && ability.healing_power > 0) {
                const target = state.playerTeam.find(p => p.id === action.payload.targetId);
                if (target) {
                    const healAmount = ability.healing_power;
                    state.log.push(`${attackerName} used ${ability.name}, healing ${target.monster.name} for ${healAmount} HP!`);
                    state.playerTeam = state.playerTeam.map(p => 
                        p.id === target.id ? { ...p, hp: Math.min(p.maxHp!, (p.hp ?? 0) + healAmount) } : p
                    );
                }
            } else {
                const defenderName = 'monster' in defender ? defender.monster.name : defender.name;
                const damage = calculateDamage(attacker, defender, ability);
                state.log.push(`${attackerName} used ${ability.name}, dealing ${damage} damage to ${defenderName}!`);

                if ('monster' in defender) {
                    state.playerTeam = state.playerTeam.map(p => p.id === defender!.id ? { ...p, hp: Math.max(0, (p.hp ?? 0) - damage) } : p);
                } else {
                    state.aiTeam = state.aiTeam.map(a => a.id === defender!.id ? { ...a, hp: Math.max(0, a.hp - damage) } : a);
                }
            }

            if ('monster' in attacker) { 
                 state.playerTeam = state.playerTeam.map(p => p.id === attacker!.id ? { ...p, mp: Math.max(0, (p.mp ?? 0) - (ability.mp_cost || 0)) } : p);
            } else {
                state.aiTeam = state.aiTeam.map(a => a.id === attacker!.id ? { ...a, mp: Math.max(0, a.mp - (ability.mp_cost || 0)) } : a);
            }
        }
    } else if (action.type === 'SWAP_MONSTER') {
        const newIndex = state.playerTeam.findIndex(p => p.id === action.payload.monsterId);
        if (newIndex !== -1 && (state.playerTeam[newIndex].hp ?? 0) > 0) {
            state.log.push(`You withdrew ${state.playerTeam[state.activePlayerIndex].monster.name}. Go, ${state.playerTeam[newIndex].monster.name}!`);
            state.activePlayerIndex = newIndex;
        }
    }

    return { nextState: state, log: state.log };
}

export function getAiAction(battleState: BattleState): Action {
    const attacker = battleState.aiTeam[battleState.activeAiIndex];
    const target = battleState.playerTeam[battleState.activePlayerIndex];
    const ability = attacker.abilities.find(a => a.ability_type === 'ACTIVE' && !a.healing_power);
    return {
        type: 'USE_ABILITY',
        payload: {
            abilityId: ability!.id,
            casterId: attacker.id,
            targetId: target.id
        }
    };
}