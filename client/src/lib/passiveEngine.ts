// --- Self-Contained, Correct Type Definitions ---
interface StatModifier {
    stat: 'power' | 'defense' | 'speed';
    type: 'FLAT' | 'PERCENTAGE';
    value: number;
    duration?: number;
}

interface Ability {
    id: number;
    name: string;
    ability_type: 'ACTIVE' | 'PASSIVE';
    activation_trigger?: 'ON_HP_THRESHOLD' | 'END_OF_TURN' | 'ON_ABILITY_USE' | 'ON_BATTLE_START' | 'ON_BEING_HIT' | null;
    activation_scope?: 'SELF' | 'ACTIVE' | 'BENCH' | null;
    trigger_condition_value?: number | null;
    status_effect_value?: string | null;
    stat_modifiers?: StatModifier[] | null;
}

interface ActiveEffect {
    id: string;
    sourceAbilityId: number;
    targetMonsterId: number | string;
    modifier: StatModifier;
    duration: number;
}

interface BaseMonster {
  id: number | string;
  name: string;
  abilities?: Ability[] | null;
  maxHp?: number | null;
}

interface BaseUserMonster {
  id: number;
  maxHp?: number | null;
}

type PlayerCombatMonster = BaseUserMonster & { 
    monster: BaseMonster; 
    hp: number | null;
};
type AiCombatMonster = BaseMonster & { 
    abilities: Ability[];
    hp: number;
};
type CombatMonster = PlayerCombatMonster | AiCombatMonster;

type TeamState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
}

type PassiveResult = {
    newPlayerTeam: PlayerCombatMonster[];
    newAiTeam: AiCombatMonster[];
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
    let newPlayerTeam: PlayerCombatMonster[] = JSON.parse(JSON.stringify(teams.playerTeam));
    let newAiTeam: AiCombatMonster[] = JSON.parse(JSON.stringify(teams.aiTeam));
    let newEffects: ActiveEffect[] = JSON.parse(JSON.stringify(activeEffects));
    const logEntries: string[] = [];

    const allMonsters: CombatMonster[] = [...newPlayerTeam, ...newAiTeam];
    const triggererIsPlayer = triggerer === 'player';

    for (const monster of allMonsters) {
        const isPlayerMonster = 'monster' in monster;
        const base = isPlayerMonster ? monster.monster : monster;

        const passives = base.abilities?.filter(a => a.ability_type === 'PASSIVE' && a.activation_trigger === trigger) || [];

        for (const passive of passives) {
            let conditionMet = false;

            if (trigger === 'ON_HP_THRESHOLD') {
                if (monster.id === damagedMonsterId) {
                    const currentHp = monster.hp ?? 0;
                    const maxHp = monster.maxHp ?? 1;
                    const hpPercent = (currentHp / maxHp) * 100;
                    conditionMet = hpPercent <= (passive.trigger_condition_value || 0);
                }
            } else if (trigger === 'END_OF_TURN') {
                const scope = passive.activation_scope || 'SELF';
                const isMyTurn = (isPlayerMonster && triggererIsPlayer) || (!isPlayerMonster && !triggererIsPlayer);

                if (!isMyTurn) continue;

                if (scope === 'ACTIVE' || scope === 'SELF') {
                    const isActive = (isPlayerMonster && teams.activePlayerIndex === newPlayerTeam.findIndex(p => p.id === monster.id)) ||
                                     (!isPlayerMonster && teams.activeAiIndex === newAiTeam.findIndex(a => a.id === monster.id));
                    if (isActive) conditionMet = true;
                } else if (scope === 'BENCH') {
                    conditionMet = true;
                }
            }

            if (conditionMet) {
                const alreadyActive = newEffects.some(e => e.sourceAbilityId === passive.id && e.targetMonsterId === base.id);
                if (alreadyActive && trigger === 'ON_HP_THRESHOLD') continue;

                logEntries.push(`${base.name}'s ${passive.name} activates!`);

                if (passive.name === 'Soothing Aura') {
                    const activePlayerMonster = newPlayerTeam[teams.activePlayerIndex];
                    const maxHp = activePlayerMonster.maxHp ?? 1;
                    const healAmount = Math.round(maxHp * (parseFloat(passive.status_effect_value as any) / 100));

                    newPlayerTeam = newPlayerTeam.map(m => {
                        if (m.id === activePlayerMonster.id) {
                            const currentHp = m.hp ?? 0;
                            const newHp = Math.min(maxHp, currentHp + healAmount);
                            return { ...m, hp: newHp };
                        }
                        return m;
                    });
                    logEntries.push(`${base.name} heals ${activePlayerMonster.monster.name} for ${healAmount} HP!`);
                }

                if (passive.stat_modifiers) {
                    (passive.stat_modifiers as StatModifier[]).forEach(mod => {
                        newEffects.push({
                            id: `${base.id}-${passive.id}-${mod.stat}`,
                            sourceAbilityId: passive.id, 
                            targetMonsterId: base.id, 
                            modifier: mod,
                            duration: mod.duration || Infinity,
                        });
                    });
                }
            }
        }
    }

    return { newPlayerTeam, newAiTeam, newEffects, logEntries };
}