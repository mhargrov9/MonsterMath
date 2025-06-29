import { UserMonster, Monster, Ability } from '../shared/schema';
import { storage } from './storage'; // To fetch master ability data

type BattleState = {
    playerTeam: UserMonster[];
    aiTeam: Monster[];
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

const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): number => {
    const power = 'monster' in attacker ? attacker.power : (attacker as any).basePower;
    const defense = 'monster' in defender ? defender.defense : (defender as any).baseDefense;
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
        const ability = (await storage.getMonsterAbilities(attacker.monsterId)).find(a => a.id === action.payload.abilityId);

        if (attacker.hp > 0 && ability) {
            const damage = calculateDamage(attacker, defender, ability);
            aiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m);
            playerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
            log.push(`Your ${attacker.monster.name} used ${ability.name}, dealing ${damage} damage!`);
        }
    } else if (action.type === 'SWAP_MONSTER') {
        const newIndex = playerTeam.findIndex(p => p.id === action.payload.monsterId);
        if (newIndex !== -1 && playerTeam[newIndex].hp > 0) {
            log.push(`You withdrew ${playerTeam[activePlayerIndex].monster.name} and sent out ${playerTeam[newIndex].monster.name}!`);
            activePlayerIndex = newIndex;
        }
    }

    // --- AI Turn Phase ---
    let activeAi = aiTeam[activeAiIndex];
    if (activeAi.hp <= 0) {
        const nextIndex = aiTeam.findIndex(m => m.hp > 0);
        if (nextIndex !== -1) {
            log.push(`Opponent's ${activeAi.name} fainted! Opponent sends out ${aiTeam[nextIndex].name}.`);
            activeAiIndex = nextIndex;
        }
    }

    // AI attacks if its active monster is alive
    activeAi = aiTeam[activeAiIndex];
    if (activeAi.hp > 0) {
        const playerDefender = playerTeam[activePlayerIndex];
        if (playerDefender.hp > 0) {
            const aiAbility = activeAi.abilities?.find(a => a.ability_type === 'ACTIVE');
            if (aiAbility) {
                const damage = calculateDamage(activeAi, playerDefender, aiAbility);
                playerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m);
                aiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (aiAbility.mp_cost || 0)} : m);
                log.push(`Opponent's ${activeAi.name} used ${aiAbility.name}, dealing ${damage} damage!`);
            }
        }
    }

    const nextState = { playerTeam, aiTeam, activePlayerIndex, activeAiIndex };
    return { nextState, log };
}