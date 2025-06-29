import { UserMonster, Monster, Ability } from '../shared/schema';
import { storage } from './storage';

// --- Corrected Type Definitions for Combat ---
type PlayerCombatMonster = UserMonster & { monster: Monster };
type AiCombatMonster = Monster & { abilities: Ability[] };

type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
};

type Action = {
    type: 'USE_ABILITY' | 'SWAP_MONSTER';
    payload: {
        abilityId?: number;
        targetId?: number | string;
        monsterId?: number;
    };
};

const calculateDamage = (attacker: PlayerCombatMonster | AiCombatMonster, defender: PlayerCombatMonster | AiCombatMonster, ability: Ability): number => {
    const power = 'monster' in attacker ? attacker.power : (attacker as AiCombatMonster).basePower;
    const defense = 'monster' in defender ? defender.defense : (defender as AiCombatMonster).baseDefense;
    const powerMultiplier = parseFloat(ability.power_multiplier as any) || 0.5;
    const damage = Math.round(((power * powerMultiplier) / (defense + 25)) * 10);
    return Math.max(1, damage);
};

export async function processBattleAction(initialState: BattleState, action: Action) {
    let { playerTeam, aiTeam, activePlayerIndex, activeAiIndex } = JSON.parse(JSON.stringify(initialState));
    const log: string[] = [];

    // --- Player Action Phase ---
    if (action.type === 'USE_ABILITY') {
        const attacker = playerTeam[activePlayerIndex];
        const defender = aiTeam[activeAiIndex];

        const abilities = await storage.getMonsterAbilities(attacker.monsterId);
        const ability = abilities.find((a: Ability) => a.id === action.payload.abilityId);

        if (attacker.hp > 0 && ability) {
            const damage = calculateDamage(attacker, defender, ability);
            aiTeam = aiTeam.map((m: AiCombatMonster, i: number) => i === activeAiIndex ? { ...m, hp: Math.max(0, (m.hp ?? 0) - damage) } : m);
            playerTeam = playerTeam.map((m: PlayerCombatMonster, i: number) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
            log.push(`Your ${attacker.monster.name} used ${ability.name}, dealing ${damage} damage!`);
        }
    } else if (action.type === 'SWAP_MONSTER') {
        const newIndex = playerTeam.findIndex((p: PlayerCombatMonster) => p.id === action.payload.monsterId);
        if (newIndex !== -1 && playerTeam[newIndex].hp > 0) {
            log.push(`You withdrew ${playerTeam[activePlayerIndex].monster.name} and sent out ${playerTeam[newIndex].monster.name}!`);
            activePlayerIndex = newIndex;
        }
    }

    // --- AI Turn Phase ---
    let activeAi = aiTeam[activeAiIndex];
    if (activeAi.hp <= 0) {
        const nextIndex = aiTeam.findIndex((m: AiCombatMonster) => m.hp > 0);
        if (nextIndex !== -1) {
            log.push(`Opponent's ${activeAi.name} fainted! Opponent sends out ${aiTeam[nextIndex].name}.`);
            activeAiIndex = nextIndex;
        }
    }

    activeAi = aiTeam[activeAiIndex];
    if (activeAi.hp > 0) {
        const playerDefender = playerTeam[activePlayerIndex];
        if (playerDefender.hp > 0) {
            const aiAbility = activeAi.abilities.find((a: Ability) => a.ability_type === 'ACTIVE');

            if (aiAbility) {
                const damage = calculateDamage(activeAi, playerDefender, aiAbility);
                // *** THIS IS THE FIX ***
                playerTeam = playerTeam.map((m: PlayerCombatMonster, i: number) => i === activePlayerIndex ? { ...m, hp: Math.max(0, (m.hp ?? 0) - damage) } : m);
                aiTeam = aiTeam.map((m: AiCombatMonster, i: number) => i === activeAiIndex ? { ...m, mp: m.baseMp - (aiAbility.mp_cost || 0)} : m);
                log.push(`Opponent's ${activeAi.name} used ${aiAbility.name}, dealing ${damage} damage!`);
            }
        }
    }

    const nextState = { playerTeam, aiTeam, activePlayerIndex, activeAiIndex };
    return { nextState, log };
}