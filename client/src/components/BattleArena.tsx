import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

// --- INTERFACES ---
interface Ability {
    id: number;
    name: string;
    description: string;
    ability_type: string;
    mp_cost: number;
    affinity: string;
    power_multiplier: number;
    scaling_stat?: string;
    healing_power?: number;
    target?: string;
    status_effect_applies?: string;
    status_effect_chance?: number;
    status_effect_duration?: number;
    status_effect_value?: number;
    status_effect_value_type?: string;
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

type TargetingMode = {
  ability: Ability;
  sourceMonsterId: number;
} | null;

const BattleArena: React.FC = () => {
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

    const playerMonsterIds = playerTeam.map(um => um.monster.id);
    const { data: playerMonsterAbilities } = useQuery<Record<number, Ability[]>>({
        queryKey: ['playerAbilities', playerMonsterIds],
        queryFn: async () => {
            if (playerMonsterIds.length === 0) return {};
            try {
                const response = await fetch(`/api/monster-abilities-batch?ids=${playerMonsterIds.join(',')}`);
                if (response.ok) return await response.json();
                throw new Error('Failed to fetch player monster abilities');
            } catch (e) {
                console.error(e);
                return {};
            }
        },
        enabled: playerTeam.length > 0,
    });

    const getAffinityMultiplier = (attackAffinity: string, defenderResistances: string[], defenderWeaknesses: string[]): number => {
        if (!attackAffinity) return 1.0;
        const lower = attackAffinity.toLowerCase();
        if (defenderWeaknesses?.map(w => w.toLowerCase()).includes(lower)) return 2.0;
        if (defenderResistances?.map(r => r.toLowerCase()).includes(lower)) return 0.5;
        return 1.0;
    };

    const calculateDamage = (attackingMonster: Monster | UserMonster, defendingMonster: Monster | UserMonster, ability: Ability): DamageResult => {
        const getStat = (monster: Monster | UserMonster, stat: string) => ('monster' in monster ? monster[stat as keyof UserMonster] : monster[stat as keyof Monster]) as number || 0;
        const scalingStatValue = getStat(attackingMonster, ability.scaling_stat || 'power');
        const defenderDefense = getStat(defendingMonster, 'defense');
        const attackPower = scalingStatValue * (ability.power_multiplier || 1.0); // Temporarily default to 1.0 for testing if power_multiplier is null or 0
        const damage = Math.round(Math.max(1, attackPower * (100 / (100 + defenderDefense))));
        return { damage, isCritical: false, affinityMultiplier: 1, statusEffect: undefined };
    };

    // FIX #4: Centralized end-of-turn logic to handle passives like Soothing Aura
    const endTurn = (currentTurn: 'player' | 'ai') => {
        let newLogMessages: string[] = [];
        let finalPlayerTeam = [...playerTeam];

        if (currentTurn === 'player') {
            playerTeam.forEach((monster) => {
                const abilities = playerMonsterAbilities?.[monster.monster.id] || [];
                const soothingAura = abilities.find(a => a.name === 'Soothing Aura' && a.ability_type === 'PASSIVE');
                if (soothingAura) {
                    const monsterInTeam = finalPlayerTeam.find(m => m.id === monster.id);
                    if (monsterInTeam && monsterInTeam.hp > 0 && monsterInTeam.hp < monsterInTeam.maxHp) {
                        const healingAmount = Math.round(monsterInTeam.maxHp * 0.03);
                        const newHp = Math.min(monsterInTeam.maxHp, monsterInTeam.hp + healingAmount);
                        newLogMessages.push(`${monster.monster.name}'s Soothing Aura restores ${healingAmount} HP!`);
                        finalPlayerTeam = finalPlayerTeam.map(m => m.id === monster.id ? { ...m, hp: newHp } : m);
                    }
                }
            });
        }

        if(newLogMessages.length > 0) {
            setPlayerTeam(finalPlayerTeam);
            setBattleLog(prev => [...prev, ...newLogMessages]);
        }

        setTurn(currentTurn === 'player' ? 'ai' : 'player');
    };

    const handlePlayerAbility = (ability: Ability) => {
        if (turn !== 'player' || battleEnded || targetingMode) return;
        const activePlayerMonster = playerTeam[activePlayerIndex];
        if (activePlayerMonster.mp < ability.mp_cost) {
            setBattleLog(prev => [...prev, "Not enough MP!"]);
            return;
        }
        const targetType = ability.target || 'OPPONENT';
        if (targetType === 'ALLY' || targetType === 'SELF') {
            setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} prepares to use ${ability.name}. Select a target!`]);
            setTargetingMode({ ability, sourceMonsterId: activePlayerMonster.id });
            return;
        }
        const activeAiMonster = aiTeam[activeAiIndex];
        const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
        const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
        setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, hp: newAiHp } : m));
        setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m));
        setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`]);
        if (newAiHp === 0) {
            setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
             const remainingAi = aiTeam.filter(m => m.hp > 0 && m.id !== activeAiMonster.id);
            if (remainingAi.length === 0) {
                setBattleEnded(true); setWinner('player'); return;
            }
            const nextAiIndex = aiTeam.findIndex(m => m.hp > 0 && m.id !== activeAiMonster.id);
            setActiveAiIndex(nextAiIndex);
            setBattleLog(prev => [...prev, `Your opponent sends out ${aiTeam[nextAiIndex].name}!`]);
        }
        endTurn('player');
    };

    const handleAiAbility = () => {
        if (turn !== 'ai' || battleEnded) return;
        const activeAiMonster = aiTeam[activeAiIndex];
        const activePlayerMonster = playerTeam[activePlayerIndex];
        const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];
        const usableAbilities = aiAbilities.filter(a => a.mp_cost <= activeAiMonster.mp && a.ability_type === 'ACTIVE');
        if (usableAbilities.length === 0) {
            endTurn('ai'); return;
        }
        const selectedAbility = usableAbilities[Math.floor(Math.random() * usableAbilities.length)];
        const damageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);
        const newPlayerHp = Math.max(0, activePlayerMonster.hp - damageResult.damage);
        setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, hp: newPlayerHp } : m));
        setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - selectedAbility.mp_cost } : m));
        setBattleLog(prev => [...prev, `${activeAiMonster.name} used ${selectedAbility.name}, dealing ${damageResult.damage} damage!`]);
        if (newPlayerHp === 0) {
            setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
             const remainingPlayer = playerTeam.filter(m => m.hp > 0 && m.id !== activePlayerMonster.id);
            if (remainingPlayer.length === 0) {
                 setBattleEnded(true); setWinner('ai'); return;
            }
        }
        endTurn('ai');
    };

    // FIX #1: More robust state update for healing
    const handleTargetSelection = (targetIndex: number) => {
        if (!targetingMode) return;
        const { ability, sourceMonsterId } = targetingMode;
        let teamAfterHeal = [...playerTeam];
        const sourceMonster = teamAfterHeal.find(m => m.id === sourceMonsterId);
        const targetMonster = teamAfterHeal[targetIndex];

        if (!sourceMonster || !targetMonster) {
            setTargetingMode(null);
            return;
        }

        let healingAmount = ability.healing_power || 0;
        const newHp = Math.min(targetMonster.maxHp, targetMonster.hp + healingAmount);

        teamAfterHeal = teamAfterHeal.map(monster => {
            if (monster.id === targetMonster.id) return { ...monster, hp: newHp };
            if (monster.id === sourceMonsterId) return { ...monster, mp: monster.mp - ability.mp_cost };
            return monster;
        });

        setPlayerTeam(teamAfterHeal);
        setBattleLog(prev => [...prev, `${sourceMonster.monster.name} used ${ability.name}, healing ${targetMonster.monster.name} for ${healingAmount} HP!`]);
        setTargetingMode(null);
        endTurn('player');
    };

    const handleSwapMonster = (newIndex: number) => {
        if (turn !== 'player' || battleEnded || targetingMode) return;
        const currentActiveMonster = playerTeam[activePlayerIndex];
        const newActiveMonster = playerTeam[newIndex];
        if (newActiveMonster.hp <= 0) return;
        setBattleLog(prev => [...prev, `You withdraw ${currentActiveMonster.monster.name} and send out ${newActiveMonster.monster.name}!`]);
        setActivePlayerIndex(newIndex);
        endTurn('player');
    };

    useEffect(() => {
        if (turn === 'ai' && !battleEnded) {
            const timer = setTimeout(handleAiAbility, 1500);
            return () => clearTimeout(timer);
        }
    }, [turn, battleEnded, activeAiIndex]);

    const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
        setIsLoading(true);
        setPlayerTeam(selectedTeam);
        setAiTeam(generatedOpponent.scaledMonsters);
        const aiMonsterIds = generatedOpponent.scaledMonsters.map((m: Monster) => m.id);
        const abilitiesMap: Record<number, Ability[]> = {};
        if (aiMonsterIds.length > 0) {
            try {
                const response = await fetch(`/api/monster-abilities-batch?ids=${aiMonsterIds.join(',')}`);
                if (response.ok) {
                    const data = await response.json();
                    Object.assign(abilitiesMap, data);
                } else {
                    console.error('Failed to fetch AI monster abilities batch');
                }
            } catch (error) {
                console.error(error);
            }
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
        if (playerMonster.speed >= aiMonster.speed) setTurn('player');
        else setTurn('ai');
    };

    const resetBattle = () => setBattleMode('team-select');

    if (battleMode === 'team-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1><BattleTeamSelector onBattleStart={handleBattleStart} /></div>;
    if (battleMode === 'lead-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1><div className="flex flex-wrap justify-center gap-6">{playerTeam.map((userMonster, index) => (<div key={userMonster.id}><MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" /><Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>{userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}</Button></div>))}</div></div>;

    if (battleMode === 'combat') {
        if (isLoading || playerTeam.length === 0 || aiTeam.length === 0) return <div className="text-center p-8">Loading battle...</div>;
        const activePlayerMonster = playerTeam[activePlayerIndex];
        const activeAiMonster = aiTeam[activeAiIndex];
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
                                            {/* FIX #3 & #2: Bench cards are toggleable and targetable */}
                                            <MonsterCard monster={monster.monster} userMonster={monster} size="tiny" isToggleable={true} isTargetable={!!targetingMode} onCardClick={targetingMode ? () => handleTargetSelection(originalIndex) : undefined} />
                                            {/* FIX #5: Swap button is back and functional */}
                                            <Button onClick={() => handleSwapMonster(originalIndex)} disabled={!!targetingMode || turn !== 'player' || monster.hp <= 0} size="sm" className="mt-1 w-full">Swap</Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
                        <MonsterCard monster={activeAiMonster} showAbilities={true} size="large" isToggleable={true}/>
                        {benchedAiMonsters.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                {benchedAiMonsters.map((monster) => (
                                    <MonsterCard key={monster.id} monster={monster} size="tiny" isToggleable={true}/>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4 max-w-3xl mx-auto">
                    <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-white border border-gray-700">
                        <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Battle Log</h3>
                        <div className="h-40 overflow-y-auto bg-gray-800/60 p-3 rounded font-mono text-sm" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                            {battleLog.map((log, index) => <p key={index} className="mb-1 animate-fadeIn">{`> ${log}`}</p>)}
                        </div>
                    </div>
                    <div className="text-center text-white">
                        <p className="text-lg font-semibold">
                            {turn === 'player' ? "Your Turn!" : "Opponent is thinking..."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default BattleArena;