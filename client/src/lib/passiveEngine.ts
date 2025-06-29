import { UserMonster, Monster, Ability, ActiveEffect, StatModifier } from '@/types/game';

type TeamState = {
    playerTeam: UserMonster[];
    aiTeam: Monster[];
    activePlayerIndex: number;
    activeAiIndex: number;
}

type PassiveResult = {
    newPlayerTeam: UserMonster[];
    newAiTeam: Monster[];
    newEffects: ActiveEffect[];
    logEntries: string[];
}

export function applyPassives(
    trigger: 'ON_HP_THRESHOLD' | 'END_OF_TURN',
    teams: TeamState,
    activeEffects: ActiveEffect[],
    triggerer: 'player' | 'ai',
    damagedMonsterId?: number | string
): PassiveResult {
    let newPlayerTeam = JSON.parse(JSON.stringify(teams.playerTeam));
    let newAiTeam = JSON.parse(JSON.stringify(teams.aiTeam));
    let newEffects = JSON.parse(JSON.stringify(activeEffects));
    const logEntries: string[] = [];

    const allMonsters = [...newPlayerTeam, ...newAiTeam];
    const triggererIsPlayer = triggerer === 'player';

    for (const monster of allMonsters) {
        const isPlayerMonster = 'monster' in monster;
        const base = isPlayerMonster ? monster.monster : monster;

        const passives = base.abilities?.filter(a => a.ability_type === 'PASSIVE' && a.activation_trigger === trigger) || [];

        for (const passive of passives) {
            let conditionMet = false;

            if (trigger === 'ON_HP_THRESHOLD') {
                if (monster.id === damagedMonsterId) {
                    const hpPercent = (monster.hp / monster.maxHp) * 100;
                    conditionMet = hpPercent <= (passive.trigger_condition_value || 0);
                }
            } else if (trigger === 'END_OF_TURN') {
                const scope = passive.activation_scope || 'SELF';
                const isMyTurn = (isPlayerMonster && triggererIsPlayer) || (!isPlayerMonster && !triggererIsPlayer);

                if (!isMyTurn) continue; // Only trigger END_OF_TURN passives on the owner's turn

                if (scope === 'ACTIVE') {
                    const isActive = (isPlayerMonster && teams.activePlayerIndex === newPlayerTeam.findIndex(p => p.id === monster.id)) ||
                                     (!isPlayerMonster && teams.activeAiIndex === newAiTeam.findIndex(a => a.id === monster.id));
                    if (isActive) conditionMet = true;
                } else if (scope === 'BENCH') {
                    conditionMet = true; // Applies to the whole team
                }
            }

            if (conditionMet) {
                const alreadyActive = newEffects.some(e => e.sourceAbilityId === passive.id && e.targetMonsterId === base.id);
                if (alreadyActive && trigger === 'ON_HP_THRESHOLD') continue;

                logEntries.push(`${base.name}'s ${passive.name} activates!`);

                // Handle Soothing Aura specifically
                if (passive.name === 'Soothing Aura') {
                    const activePlayerMonster = newPlayerTeam[teams.activePlayerIndex];
                    const healAmount = Math.round(activePlayerMonster.maxHp * (parseFloat(passive.status_effect_value as any) / 100));
                    newPlayerTeam = newPlayerTeam.map(m => m.id === activePlayerMonster.id ? { ...m, hp: Math.min(m.maxHp, m.hp + healAmount)} : m);
                    logEntries.push(`${base.name} heals ${activePlayerMonster.monster.name} for ${healAmount} HP!`);
                }

                // Handle stat modifier passives like Crystalize
                if (passive.stat_modifiers) {
                    (passive.stat_modifiers as StatModifier[]).forEach(mod => {
                        newEffects.push({
                            id: `${base.id}-${passive.id}-${mod.stat}`,
                            sourceAbilityId: passive.id, targetMonsterId: base.id, modifier: mod,
                            duration: mod.duration || Infinity,
                        });
                    });
                }
            }
        }
    }

    return { newPlayerTeam, newAiTeam, newEffects, logEntries };
}