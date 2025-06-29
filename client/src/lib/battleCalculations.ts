import { UserMonster, Monster, Ability, ActiveEffect } from '@/types/game';

export const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed', activeEffects: ActiveEffect[]): number => {
    const monsterId = monster.id;
    let baseStat: number;

    if ('monster' in monster) { // UserMonster
        baseStat = monster[statName];
    } else { // AI Monster or Base Monster
        const key = `base${statName.charAt(0).toUpperCase() + statName.slice(1)}` as keyof Monster;
        baseStat = (monster as any)[key] ?? 0;
    }

    if(typeof baseStat !== 'number') baseStat = 0;

    const effectsForStat = activeEffects.filter(e => e.targetMonsterId === monsterId && e.modifier.stat.toLowerCase() === statName.toLowerCase());
    let finalStat = baseStat;

    effectsForStat.filter(e => e.modifier.type === 'FLAT').forEach(e => finalStat += e.modifier.value);
    effectsForStat.filter(e => e.modifier.type === 'PERCENTAGE').forEach(e => finalStat *= (1 + e.modifier.value / 100));

    return Math.round(finalStat);
};

export const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability, activeEffects: ActiveEffect[]): number => {
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