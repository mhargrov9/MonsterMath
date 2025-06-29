import { UserMonster, Monster, Ability } from '../shared/schema';

// This is the server-side game engine. It takes the current state and an action,
// and returns the definitive new state of the battle.

type BattleState = {
    playerTeam: UserMonster[];
    aiTeam: Monster[];
    activePlayerIndex: number;
    activeAiIndex: number;
};

type Action = {
    type: 'USE_ABILITY';
    payload: {
        abilityId: number;
        casterId: number; // Player's UserMonster ID
        targetId: number; // AI's Monster ID
    };
};

const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    if ('monster' in monster) { // UserMonster
        return monster[statName];
    }
    const key = `base${statName.charAt(0).toUpperCase() + statName.slice(1)}` as keyof Monster;
    return (monster as any)[key] || 0;
};

const getAffinityMultiplier = (attackAffinity: string | null, defender: UserMonster | Monster): number => {
    if (!attackAffinity) return 1.0;
    const lower = attackAffinity.toLowerCase();

    const defenderBase = 'monster' in defender ? defender.monster : defender;

    const weaknesses = defenderBase.weaknesses as string[] || [];
    const resistances = defenderBase.resistances as string[] || [];

    if (weaknesses.map(w => w.toLowerCase()).includes(lower)) return 2.0;
    if (resistances.map(r => r.toLowerCase()).includes(lower)) return 0.5;
    return 1.0;
  };

const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): number => {
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attacker, scalingStatName);
    const defendingDefense = getModifiedStat(defender, 'defense');
    const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
    const damageMultiplier = 100 / (100 + defendingDefense);
    let rawDamage = attackPower * damageMultiplier;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defender);
    rawDamage *= affinityMultiplier;
    const finalDamage = Math.round(Math.max(1, rawDamage));
    return finalDamage;
};

export function processBattleAction(initialState: BattleState, action: Action, allAbilities: Ability[]): BattleState {
    let { playerTeam, aiTeam, activePlayerIndex, activeAiIndex } = initialState;

    playerTeam = JSON.parse(JSON.stringify(playerTeam));
    aiTeam = JSON.parse(JSON.stringify(aiTeam));

    // --- Player's Turn ---
    if (action.type === 'USE_ABILITY') {
        const { abilityId, casterId, targetId } = action.payload;
        const ability = allAbilities.find(a => a.id === abilityId);
        if (!ability) throw new Error(`Ability with ID ${abilityId} not found.`);

        const attacker = playerTeam.find(p => p.id === casterId);
        const defender = aiTeam.find(a => a.id === targetId);
        if (!attacker || !defender) throw new Error('Attacker or Defender not found in battle state.');

        const damageToAi = calculateDamage(attacker, defender, ability);
        aiTeam = aiTeam.map(a => a.id === targetId ? { ...a, hp: Math.max(0, a.hp - damageToAi) } : a);
        playerTeam = playerTeam.map(p => p.id === casterId ? { ...p, mp: p.mp - (ability.mp_cost || 0) } : p);
    }

    // --- AI's Immediate Counter-Attack ---
    const activeAi = aiTeam[activeAiIndex];
    const playerDefender = playerTeam[activePlayerIndex];

    if (activeAi.hp > 0 && playerDefender.hp > 0) {
        const aiAbility = activeAi.abilities?.find(a => a.name === "Basic Attack");

        if(aiAbility && activeAi.mp >= (aiAbility.mp_cost || 0)) {
            const damageToPlayer = calculateDamage(activeAi, playerDefender, aiAbility);

            playerTeam = playerTeam.map((p, i) => i === activePlayerIndex ? { ...p, hp: Math.max(0, p.hp - damageToPlayer) } : p);
            aiTeam = aiTeam.map((a, i) => i === activeAiIndex ? { ...a, mp: a.mp - (aiAbility.mp_cost || 0) } : a);
        }
    }

    return { playerTeam, aiTeam, activePlayerIndex, activeAiIndex };
}