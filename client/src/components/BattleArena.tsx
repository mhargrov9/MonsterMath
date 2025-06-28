import React, { useState, useEffect, useMemo, useRef } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

// --- INTERFACES ---
interface Ability {
    id: number;
    name: string;
    description: string;
    ability_type: 'ACTIVE' | 'PASSIVE';
    mp_cost: number;
    affinity: string;
    power_multiplier: number;
    scaling_stat?: string;
    healing_power?: number;
    target_scope?: 'ACTIVE_OPPONENT' | 'ANY_OPPONENT' | 'SELF' | 'ANY_ALLY' | 'ALL_OPPONENTS' | 'ALL_ALLIES';
    max_targets?: number;
    activation_scope?: 'BENCH' | 'ACTIVE';
    activation_trigger?: 'END_OF_TURN' | 'ON_BATTLE_START' | 'ON_BEING_HIT' | 'ON_ABILITY_USE' | 'ON_HP_THRESHOLD';
    trigger_condition_type?: 'HP_PERCENT' | 'MP_PERCENT';
    trigger_condition_operator?: 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN';
    trigger_condition_value?: number;
    status_effect_applies?: string;
    status_effect_chance?: number;
    status_effect_duration?: number;
    status_effect_value?: number;
    status_effect_value_type?: 'FLAT_HP' | 'PERCENT_MAX_HP';
    target_stat_modifier?: string; 
    stat_modifier_value?: number;
    stat_modifier_duration?: number;
}

interface Monster {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  power: number;
  defense: number;
  speed: number;
  mp: number;
  max_mp: number;
  affinity: string;
  image_url?: string;
  is_fainted: boolean;
  resistances: string[];
  weaknesses: string[];
  level: number;
  abilities?: Ability[];
}

interface UserMonster {
  id: number;
  user_id: number;
  monster_id: number;
  monster: Monster;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  power: number;
  defense: number;
  speed: number;
}

interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
  statusEffect?: { name: string; duration: number; value: number; };
}

interface ActiveBuff {
    sourceAbilityId: number;
    name: string;
    stat_modifier: string;
    value: number;
    duration?: number;
}

type TargetingMode = {
  ability: Ability;
  sourceMonsterId: number;
} | null;

const BattleArena: React.FC = () => {
    // Core Battle State
    const [battleMode, setBattleMode] = useState<'team-select' | 'lead-select' | 'combat'>('team-select');
    const [isLoading, setIsLoading] = useState(false);
    const [playerTeam, setPlayerTeam] = useState<UserMonster[]>([]);
    const [aiTeam, setAiTeam] = useState<Monster[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [activeAiIndex, setActiveAiIndex] = useState(0);
    const [turn, setTurn] = useState<'player' | 'ai' | 'pre-battle'>('pre-battle');
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [battleEnded, setBattleEnded] = useState(false);
    const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
    const [aiMonsterAbilities, setAiMonsterAbilities] = useState<Record<number, Ability[]>>({});
    const [targetingMode, setTargetingMode] = useState<TargetingMode>(null);

    // NEW: State to manage active buffs and debuffs for both teams
    const [activeBuffs, setActiveBuffs] = useState<Record<number, ActiveBuff[]>>({});

    const { data: playerMonsterAbilities } = useQuery<Record<number, Ability[]>>({
        queryKey: ['playerAbilities', playerTeam.map(um => um.monster.id)],
        queryFn: async () => {
            const abilitiesMap: Record<number, Ability[]> = {};
            for (const um of playerTeam) {
                try {
                    const response = await fetch(`/api/monster-abilities/${um.monster.id}`);
                    if (response.ok) abilitiesMap[um.monster.id] = await response.json();
                } catch (e) { console.error(e); }
            }
            return abilitiesMap;
        },
        enabled: playerTeam.length > 0,
    });

    // --- Core Calculation Logic with Buffs ---

    // NEW: Helper function to get a monster's stat with active buffs applied
    const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
        const baseStat = (monster as any)[statName] || 0;
        const buffs = activeBuffs[monster.id] || [];
        let finalStat = baseStat;

        buffs.forEach(buff => {
            if (buff.stat_modifier.toLowerCase() === statName) {
                // Assuming value is a percentage modifier for now
                finalStat *= (1 + buff.value / 100);
            }
        });
        return Math.round(finalStat);
    };

    const getAffinityMultiplier = (attackAffinity: string, defenderResistances: string[], defenderWeaknesses: string[]): number => {
        if (!attackAffinity) return 1.0;
        const lower = attackAffinity.toLowerCase();
        if (defenderWeaknesses?.map(w => w.toLowerCase()).includes(lower)) return 2.0;
        if (defenderResistances?.map(r => r.toLowerCase()).includes(lower)) return 0.5;
        return 1.0;
    };

    // UPDATED: Now uses getModifiedStat to calculate damage with buffed/debuffed stats
    const calculateDamage = (attackingMonster: UserMonster | Monster, defendingMonster: UserMonster | Monster, ability: Ability): DamageResult => {
        const scalingStatName = ability.scaling_stat?.toLowerCase() || 'power';

        const attackingPower = getModifiedStat(attackingMonster, scalingStatName as any);
        const defendingDefense = getModifiedStat(defendingMonster, 'defense');

        const attackPower = attackingPower * (ability.power_multiplier || 0.5);
        const damageMultiplier = 100 / (100 + defendingDefense);
        let rawDamage = attackPower * damageMultiplier;

        const defenderResistances = 'monster' in defendingMonster ? defendingMonster.monster.resistances : defendingMonster.resistances;
        const defenderWeaknesses = 'monster' in defendingMonster ? defendingMonster.monster.weaknesses : defendingMonster.weaknesses;
        const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderResistances, defenderWeaknesses);
        rawDamage *= affinityMultiplier;

        const isCritical = Math.random() < 0.05;
        if (isCritical) rawDamage *= 1.5;

        const variance = 0.9 + Math.random() * 0.2;
        rawDamage *= variance;
        const finalDamage = Math.round(Math.max(1, rawDamage));

        let statusEffect;
        if (ability.status_effect_applies && (ability.status_effect_chance || 0) > Math.random()) {
            statusEffect = { name: ability.status_effect_applies, duration: ability.status_effect_duration || 0, value: ability.status_effect_value || 0 };
        }
        return { damage: finalDamage, isCritical, affinityMultiplier, statusEffect };
    };

    const getEffectivenessMessage = (multiplier: number): string => {
        if (multiplier > 1.0) return "It's super effective!";
        if (multiplier < 1.0) return "It's not very effective...";
        return "";
    };

    // --- Passive Ability System ---

    // NEW: Centralized, data-driven function to check and apply/remove passive buffs
    const handlePassiveTriggers = (
        triggerType: Ability['activation_trigger'],
        targetMonster: UserMonster | Monster,
        team: (UserMonster | Monster)[],
        setTeam: React.Dispatch<React.SetStateAction<any[]>>
    ) => {
        const abilities = ('monster' in targetMonster ? playerMonsterAbilities?.[targetMonster.monster.id] : aiMonsterAbilities?.[targetMonster.id]) || [];

        abilities.forEach(ability => {
            if (ability.ability_type !== 'PASSIVE' || ability.activation_trigger !== triggerType) return;

            const monsterIsActive = ('monster' in targetMonster && playerTeam[activePlayerIndex]?.id === targetMonster.id) || (aiTeam[activeAiIndex]?.id === targetMonster.id);
            if (ability.activation_scope === 'ACTIVE' && !monsterIsActive) return;

            // Data-driven condition check
            let conditionMet = false;
            const currentHpPercent = (targetMonster.hp / targetMonster.max_hp) * 100;

            if (ability.trigger_condition_type === 'HP_PERCENT' && ability.trigger_condition_operator === 'LESS_THAN_OR_EQUAL') {
                if (currentHpPercent <= (ability.trigger_condition_value || 0)) {
                    conditionMet = true;
                }
            }
            // Add other condition types here (MP_PERCENT, etc.)

            const buffIsActive = activeBuffs[targetMonster.id]?.some(b => b.sourceAbilityId === ability.id);

            // Apply buff if condition is met and buff is not already active
            if (conditionMet && !buffIsActive) {
                const newBuff: ActiveBuff = {
                    sourceAbilityId: ability.id,
                    name: ability.name,
                    stat_modifier: ability.target_stat_modifier || '',
                    value: ability.stat_modifier_value || 0,
                };
                setActiveBuffs(prev => ({
                    ...prev,
                    [targetMonster.id]: [...(prev[targetMonster.id] || []), newBuff]
                }));
                setBattleLog(prev => [...prev, `${targetMonster.name}'s ${ability.name} triggered!`]);
            } 
            // Remove buff if condition is no longer met and buff is active
            else if (!conditionMet && buffIsActive) {
                setActiveBuffs(prev => ({
                    ...prev,
                    [targetMonster.id]: prev[targetMonster.id].filter(b => b.sourceAbilityId !== ability.id)
                }));
                 setBattleLog(prev => [...prev, `${targetMonster.name}'s ${ability.name} wore off.`]);
            }
        });
    };

    // REFACTORED: Now only handles 'END_OF_TURN' passives
    const endTurn = (currentTurn: 'player' | 'ai', nextPlayerTeam: UserMonster[], nextAiTeam: Monster[]) => {
        let teamAfterPassives = [...nextPlayerTeam];
        const newLogMessages: string[] = [];

        if (currentTurn === 'player') {
            const hpChanges: Record<number, number> = {};
            teamAfterPassives.forEach((monster, index) => {
                const abilities = playerMonsterAbilities?.[monster.monster.id] || [];
                abilities.forEach(ability => {
                    if (ability.ability_type === 'PASSIVE' && ability.activation_trigger === 'END_OF_TURN') {
                        const isInScope = ability.activation_scope === 'BENCH' || (ability.activation_scope === 'ACTIVE' && index === activePlayerIndex);
                        if (isInScope) {
                            const chance = ability.status_effect_chance || 1.0;
                            if (Math.random() > chance) return;
                            if (ability.status_effect_applies === 'HEALING') {
                                const targetMonster = ability.activation_scope === 'BENCH' ? teamAfterPassives[activePlayerIndex] : monster;
                                if (targetMonster.hp > 0 && targetMonster.hp < targetMonster.maxHp) {
                                    let healingAmount = ability.status_effect_value_type === 'PERCENT_MAX_HP'
                                        ? Math.round(targetMonster.maxHp * ((ability.status_effect_value || 0) / 100))
                                        : (ability.status_effect_value || 0);
                                    if (!hpChanges[targetMonster.id]) hpChanges[targetMonster.id] = 0;
                                    hpChanges[targetMonster.id] += healingAmount;
                                    newLogMessages.push(`${monster.monster.name}'s ${ability.name} restores ${healingAmount} HP for ${targetMonster.monster.name}!`);
                                }
                            }
                        }
                    }
                });
            });
            if (Object.keys(hpChanges).length > 0) {
                 teamAfterPassives = teamAfterPassives.map(m => {
                    if (hpChanges[m.id]) {
                        const newHp = Math.min(m.maxHp, m.hp + hpChanges[m.id]);
                        return { ...m, hp: newHp };
                    }
                    return m;
                });
            }
        }

        setPlayerTeam(teamAfterPassives);
        setAiTeam(nextAiTeam);
        if (newLogMessages.length > 0) {
            setBattleLog(prev => [...prev, ...newLogMessages]);
        }
        setTurn(currentTurn === 'player' ? 'ai' : 'player');
    };

    // --- Action Handlers ---

    const handlePlayerAbility = (ability: Ability) => {
        if (turn !== 'player' || battleEnded || targetingMode) return;
        const activePlayerMonster = playerTeam[activePlayerIndex];
        if (getModifiedStat(activePlayerMonster, 'mp') < ability.mp_cost) {
            setBattleLog(prev => [...prev, "Not enough MP!"]); return;
        }
        const targetType = ability.target_scope || 'ACTIVE_OPPONENT';
        if (targetType === 'ANY_ALLY' || targetType === 'SELF') {
            setTargetingMode({ ability, sourceMonsterId: activePlayerMonster.id }); return;
        }

        const activeAiMonster = aiTeam[activeAiIndex];
        const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
        const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
        const updatedAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: newAiHp } : m);
        let updatedPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m);
        let logMessage = `${activePlayerMonster.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`;
        const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
        if (effectivenessMsg) logMessage += ` ${effectivenessMsg}`;
        setBattleLog(prev => [...prev, logMessage]);

        // BUG FIX: AI SWAP ON FAINT
        if (newAiHp === 0) {
            setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
            const remainingAi = updatedAiTeam.filter(m => m.hp > 0);
            if (remainingAi.length === 0) {
                setBattleEnded(true); setWinner('player'); setPlayerTeam(updatedPlayerTeam); setAiTeam(updatedAiTeam); return;
            }
            const nextAiIndex = updatedAiTeam.findIndex(m => m.hp > 0);
            setActiveAiIndex(nextAiIndex);
            setAiTeam(updatedAiTeam); 
            setPlayerTeam(updatedPlayerTeam); 
            setBattleLog(prev => [...prev, `Your opponent sends out ${updatedAiTeam[nextAiIndex].name}!`]);
        } else {
             endTurn('player', updatedPlayerTeam, updatedAiTeam);
        }
    };

    const handleAiAbility = () => {
        if (turn !== 'ai' || battleEnded) return;
        const activeAiMonster = aiTeam[activeAiIndex];
        const activePlayerMonster = playerTeam[activePlayerIndex];
        const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];
        const usableAbilities = aiAbilities.filter(a => getModifiedStat(activeAiMonster, 'mp') >= a.mp_cost && a.ability_type === 'ACTIVE');
        if (usableAbilities.length === 0) { endTurn('ai', playerTeam, aiTeam); return; }
        const selectedAbility = usableAbilities[Math.floor(Math.random() * usableAbilities.length)];
        const damageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);

        const newPlayerHp = Math.max(0, activePlayerMonster.hp - damageResult.damage);
        let updatedPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, hp: newPlayerHp } : m);
        const updatedAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - selectedAbility.mp_cost } : m);

        let logMessage = `${activeAiMonster.name} used ${selectedAbility.name}, dealing ${damageResult.damage} damage!`;
        const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
        if (effectivenessMsg) logMessage += ` ${effectivenessMsg}`;
        setBattleLog(prev => [...prev, logMessage]);

        // Check passives for the defending player monster
        const defenderWithNewHp = updatedPlayerTeam[activePlayerIndex];
        if(defenderWithNewHp) {
             handlePassiveTriggers('ON_HP_THRESHOLD', defenderWithNewHp, updatedPlayerTeam, setPlayerTeam);
        }

        if (newPlayerHp === 0) {
            setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
            const remainingPlayer = updatedPlayerTeam.filter(m => m.hp > 0);
            if (remainingPlayer.length === 0) {
                setBattleEnded(true); setWinner('ai'); setPlayerTeam(updatedPlayerTeam); setAiTeam(updatedAiTeam); return;
            }
        }
        endTurn('ai', updatedPlayerTeam, updatedAiTeam);
    };

    const handleTargetSelection = (targetIndex: number) => {
        if (!targetingMode) return;
        const { ability, sourceMonsterId } = targetingMode;
        let teamAfterAction = [...playerTeam];
        const sourceMonster = teamAfterAction.find(m => m.id === sourceMonsterId);
        const targetMonster = teamAfterAction[targetIndex];
        if (!sourceMonster || !targetMonster) { setTargetingMode(null); return; }

        const healingAmount = ability.healing_power || 0;
        const newHp = Math.min(targetMonster.maxHp, targetMonster.hp + healingAmount);
        setBattleLog(prev => [...prev, `${sourceMonster.monster.name} used ${ability.name}, healing ${targetMonster.monster.name} for ${healingAmount} HP!`]);

        teamAfterAction = teamAfterAction.map(monster => {
            let updatedMonster = { ...monster };
            if (monster.id === targetMonster.id) updatedMonster.hp = newHp;
            if (monster.id === sourceMonsterId) updatedMonster.mp = monster.mp - ability.mp_cost;
            return updatedMonster;
        });

        // Handle passive trigger for healing (e.g., check if HP went above a threshold)
        handlePassiveTriggers('ON_HP_THRESHOLD', teamAfterAction[targetIndex], teamAfterAction, setPlayerTeam);

        setTargetingMode(null);
        endTurn('player', teamAfterAction, aiTeam);
    };

    const handleSwapMonster = (newIndex: number) => {
        if (turn !== 'player' || battleEnded || targetingMode) return;
        const newActiveMonster = playerTeam[newIndex];
        if (newActiveMonster.hp <= 0) {
             setBattleLog(prev => [...prev, `${newActiveMonster.monster.name} is unable to battle!`]);
             return;
        }
        setBattleLog(prev => [...prev, `You withdraw ${playerTeam[activePlayerIndex].monster.name} and send out ${newActiveMonster.monster.name}!`]);
        setActivePlayerIndex(newIndex);
        endTurn('player', playerTeam, aiTeam);
    };

    // --- Battle Setup and Flow ---
    useEffect(() => {
        if (turn === 'ai' && !battleEnded) {
            const timer = setTimeout(handleAiAbility, 1500);
            return () => clearTimeout(timer);
        }
    }, [turn, battleEnded, activeAiIndex, playerTeam]); // Added playerTeam to deps

    const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
        setIsLoading(true);
        setActiveBuffs({}); // Reset buffs at start of battle
        setPlayerTeam(selectedTeam);
        setAiTeam(generatedOpponent.scaledMonsters);
        const abilitiesMap: Record<number, Ability[]> = {};
        for (const monster of generatedOpponent.scaledMonsters) {
            try {
                const response = await fetch(`/api/monster-abilities/${monster.id}`);
                if (response.ok) abilitiesMap[monster.id] = await response.json();
            } catch (error) { abilitiesMap[monster.id] = []; }
        }
        setAiMonsterAbilities(abilitiesMap);
        setBattleLog([`Battle is about to begin! Select your starting monster.`]);
        setBattleMode('lead-select');
        setTurn('pre-battle');
        setTargetingMode(null);
        setBattleEnded(false);
        setWinner(null);
        setIsLoading(false);
    };

    const selectLeadMonster = (index: number) => {
        setActivePlayerIndex(index);
        const randomAiIndex = Math.floor(Math.random() * aiTeam.length);
        setActiveAiIndex(randomAiIndex);
        setBattleLog(prev => [...prev, `${playerTeam[index].monster.name} will start for you!`, `Your opponent sends out ${aiTeam[randomAiIndex].name}!`]);
        determineFirstTurn(playerTeam[index], aiTeam[randomAiIndex]);
        setBattleMode('combat');
    };

    const determineFirstTurn = (playerMonster: UserMonster, aiMonster: Monster) => {
        if (getModifiedStat(playerMonster, 'speed') >= getModifiedStat(aiMonster, 'speed')) setTurn('player');
        else setTurn('ai');
    };

    const resetBattle = () => setBattleMode('team-select');

    const battleLogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (battleLogRef.current) {
            battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
        }
    }, [battleLog]);

    // --- Render Logic ---

    // NEW: Memoized calculation to get monster stats with buffs for rendering
    const getMonsterWithBuffs = (monster: UserMonster | Monster): UserMonster | Monster => {
        if (!activeBuffs[monster.id]) return monster;

        const modifiedMonster = { ...monster };
        (modifiedMonster as any).power = getModifiedStat(monster, 'power');
        (modifiedMonster as any).defense = getModifiedStat(monster, 'defense');
        (modifiedMonster as any).speed = getModifiedStat(monster, 'speed');

        return modifiedMonster;
    };

    if (battleMode === 'team-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1><BattleTeamSelector onBattleStart={handleBattleStart} /></div>;
    if (battleMode === 'lead-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1><div className="flex flex-wrap justify-center gap-6">{playerTeam.map((userMonster, index) => (<div key={userMonster.id}><MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" /><Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>{userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}</Button></div>))}</div></div>;

    if (battleMode === 'combat') {
        if (isLoading || playerTeam.length === 0 || aiTeam.length === 0) return <div className="text-center p-8">Loading battle...</div>;

        const activePlayerMonster = getMonsterWithBuffs(playerTeam[activePlayerIndex]) as UserMonster;
        const activeAiMonster = getMonsterWithBuffs(aiTeam[activeAiIndex]) as Monster;

        if (!activePlayerMonster || !activeAiMonster) return <div className="text-center p-8">Setting up combatants...</div>;

        const benchedPlayerMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
        const benchedAiMonsters = aiTeam.filter((_, index) => index !== activeAiIndex);

        return (
            <div className="max-w-7xl mx-auto p-4">
                {targetingMode && (<div className="text-center p-2 mb-4 bg-green-900/50 rounded-lg animate-pulse"><p className="text-lg font-semibold text-green-300">Choose a target for {targetingMode.ability.name}!</p></div>)}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 items-start">
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-semibold mb-2 text-cyan-400">Your Team</h2>
                        <MonsterCard
                            monster={activePlayerMonster.monster} userMonster={activePlayerMonster}
                            onAbilityClick={handlePlayerAbility} battleMode={true}
                            isPlayerTurn={turn === 'player' && !targetingMode} startExpanded={true}
                            isToggleable={false} size="large"
                            isTargetable={!!targetingMode}
                            onCardClick={targetingMode ? () => handleTargetSelection(activePlayerIndex) : undefined}
                        />
                        {benchedPlayerMonsters.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                {benchedPlayerMonsters.map((monster) => {
                                    const originalIndex = playerTeam.findIndex(p => p.id === monster.id);
                                    return (
                                        <div key={monster.id} className="text-center">
                                            <MonsterCard monster={monster.monster} userMonster={getMonsterWithBuffs(monster) as UserMonster} size="tiny" isToggleable={!targetingMode} isTargetable={!!targetingMode} onCardClick={targetingMode ? () => handleTargetSelection(originalIndex) : undefined} />
                                            <Button onClick={() => handleSwapMonster(originalIndex)} disabled={!!targetingMode || turn !== 'player' || monster.hp <= 0} size="sm" className="mt-1 w-full">Swap</Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
                        <MonsterCard monster={activeAiMonster} userMonster={activeAiMonster} showAbilities={true} size="large" isToggleable={true}/>
                        {benchedAiMonsters.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                {benchedAiMonsters.map((monster) => (
                                    <MonsterCard key={monster.id} monster={monster} userMonster={getMonsterWithBuffs(monster)} size="tiny" isToggleable={true}/>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4 max-w-3xl mx-auto">
                    <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-white border border-gray-700">
                        <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Battle Log</h3>
                        <div className="h-40 overflow-y-auto bg-gray-800/60 p-3 rounded font-mono text-sm" ref={battleLogRef}>
                            {battleLog.map((log, index) => <p key={index} className="mb-1 animate-fadeIn">{`> ${log}`}</p>)}
                        </div>
                    </div>
                    <div className="text-center text-white">
                        <p className="text-lg font-semibold">
                            {turn === 'player' ? "Your Turn!" : "Opponent is thinking..."}
                        </p>
                    </div>
                    {battleEnded && (
                        <div className="text-center mt-4">
                            <h2 className="text-2xl font-bold text-yellow-400">{winner === 'player' ? "You are victorious!" : "You have been defeated..."}</h2>
                            <Button onClick={resetBattle} className="mt-4">Play Again</Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export default BattleArena;
