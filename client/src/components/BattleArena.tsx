import React, { useState, useEffect, useMemo, useRef } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// --- INTERFACES (Aligned with Onboarding Brief v19) ---

// Describes a single, atomic stat change.
interface StatModifier {
  stat: 'power' | 'defense' | 'speed' | 'maxHp' | 'maxMp';
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
  duration?: number;
}

// An active in-battle effect, tied to a specific monster.
interface ActiveEffect {
  sourceAbilityId: number;
  sourceMonsterId: number;
  targetMonsterId: number;
  modifier: StatModifier;
  turnsRemaining: number;
}

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
  stat_modifiers?: StatModifier[]; // NEW: Aligns with schema
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
}

type TargetingMode = {
  ability: Ability;
  sourceMonsterId: number;
} | null;

// A simple hook to get the current user's ID
const useUserId = () => {
    const { data: user } = useQuery<{ id: string, rank_xp: number }>({ queryKey: ['user'] });
    return user;
};


const BattleArena: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useUserId();

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

  // NEW: State to manage all active effects for all monsters in battle.
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);

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

  // --- Core Calculation Logic (Refactored for New System) ---

  const getBaseStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
      if ('monster' in monster) { // It's a UserMonster
          return monster[statName];
      }
      // It's a base Monster for the AI team
      return (monster as any)[statName] || 0;
  }

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    const baseStat = getBaseStat(monster, statName);
    const effectsForMonster = activeEffects.filter(e => e.targetMonsterId === monster.id && e.modifier.stat === statName);

    // 1. Apply FLAT modifiers first
    const flatModifiedStat = effectsForMonster
      .filter(e => e.modifier.type === 'FLAT')
      .reduce((currentStat, effect) => currentStat + effect.modifier.value, baseStat);

    // 2. Apply PERCENTAGE modifiers to the result of the flat modifications
    const finalStat = effectsForMonster
      .filter(e => e.modifier.type === 'PERCENTAGE')
      .reduce((currentStat, effect) => currentStat * (1 + effect.modifier.value / 100), flatModifiedStat);

    return Math.round(finalStat);
  };

  const getAffinityMultiplier = (attackAffinity: string, defenderResistances: string[], defenderWeaknesses: string[]): number => {
    if (!attackAffinity) return 1.0;
    const lower = attackAffinity.toLowerCase();
    if (defenderWeaknesses?.map(w => w.toLowerCase()).includes(lower)) return 2.0;
    if (defenderResistances?.map(r => r.toLowerCase()).includes(lower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attackingMonster: UserMonster | Monster, defendingMonster: UserMonster | Monster, ability: Ability): DamageResult => {
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attackingMonster, scalingStatName);
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

    return { damage: finalDamage, isCritical, affinityMultiplier };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  // --- Passive & Effect System (Refactored) ---

  const handlePassiveTriggers = (triggerType: Ability['activation_trigger'], targetMonster: UserMonster | Monster) => {
    const abilities = ('monster' in targetMonster ? playerMonsterAbilities?.[targetMonster.monster.id] : aiMonsterAbilities?.[targetMonster.id]) || [];

    abilities.forEach(ability => {
      if (ability.ability_type !== 'PASSIVE' || ability.activation_trigger !== triggerType) return;
      if (!ability.stat_modifiers) return;

      const monsterIsActive = ('monster' in targetMonster && playerTeam[activePlayerIndex]?.id === targetMonster.id) || (aiTeam[activeAiIndex]?.id === targetMonster.id);
      if (ability.activation_scope === 'ACTIVE' && !monsterIsActive) return;

      let conditionMet = false;
      if (ability.trigger_condition_type === 'HP_PERCENT' && ability.trigger_condition_operator === 'LESS_THAN_OR_EQUAL') {
        const currentHpPercent = (targetMonster.hp / targetMonster.max_hp) * 100;
        if (currentHpPercent <= (ability.trigger_condition_value || 0)) {
          conditionMet = true;
        }
      }
      // Future-proof: Add other trigger condition types here

      const effectsFromThisAbility = activeEffects.filter(e => e.sourceAbilityId === ability.id && e.targetMonsterId === targetMonster.id);

      if (conditionMet && effectsFromThisAbility.length === 0) {
        // Apply all modifiers from this one ability
        const newEffects: ActiveEffect[] = [];
        ability.stat_modifiers.forEach(modifier => {
          newEffects.push({
            sourceAbilityId: ability.id,
            sourceMonsterId: targetMonster.id,
            targetMonsterId: targetMonster.id,
            modifier: modifier,
            turnsRemaining: modifier.duration || Infinity,
          });
        });
        setActiveEffects(prev => [...prev, ...newEffects]);
        setBattleLog(prev => [...prev, `${targetMonster.name}'s ${ability.name} triggered!`]);
      } else if (!conditionMet && effectsFromThisAbility.length > 0) {
        // Remove all effects from this one ability
        setActiveEffects(prev => prev.filter(e => e.sourceAbilityId !== ability.id || e.targetMonsterId !== targetMonster.id));
        setBattleLog(prev => [...prev, `${targetMonster.name}'s ${ability.name} wore off.`]);
      }
    });
  };

  const endTurn = (currentTurn: 'player' | 'ai', nextPlayerTeam: UserMonster[], nextAiTeam: Monster[]) => {
    // End of Turn Phase: Decrease effect durations and remove expired ones.
    const updatedEffects = activeEffects.map(effect => ({
      ...effect,
      turnsRemaining: effect.turnsRemaining - 1,
    })).filter(effect => effect.turnsRemaining > 0);

    setActiveEffects(updatedEffects);

    // TODO: Apply healing/damage over time effects here

    setPlayerTeam(nextPlayerTeam);
    setAiTeam(nextAiTeam);

    // Finally, pass control to the other combatant
    setTurn(currentTurn === 'player' ? 'ai' : 'player');
  };

    // --- Battle Completion ---
  const handleBattleCompletion = async (winner: 'player' | 'ai') => {
      setBattleEnded(true);
      setWinner(winner);

      if (winner === 'player' && user?.id) {
          try {
              const currentXp = user.rank_xp;
              setBattleLog(prev => [...prev, `You are victorious! Gaining rank_xp...`]);
              const response = await fetch('/api/battle/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ winnerId: user.id }),
              });
              if (response.ok) {
                  const result = await response.json();
                  setBattleLog(prev => [...prev, `Gained ${result.newXpTotal - currentXp} XP!`]);
                  queryClient.invalidateQueries({ queryKey: ['user'] }); // Refetch user data
              }
          } catch (error) {
              console.error("Failed to award rank XP:", error);
          }
      } else if (winner === 'ai') {
          setBattleLog(prev => [...prev, "You have been defeated..."]);
      }
  };


  // --- Action Handlers ---

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded || targetingMode) return;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    if (activePlayerMonster.mp < ability.mp_cost) {
        setBattleLog(prev => [...prev, "Not enough MP!"]); return;
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

    if (newAiHp === 0) {
      setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
      const remainingAi = updatedAiTeam.filter(m => m.hp > 0);
      if (remainingAi.length === 0) {
          handleBattleCompletion('player');
          setPlayerTeam(updatedPlayerTeam);
          setAiTeam(updatedAiTeam);
          return;
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
    const usableAbilities = aiAbilities.filter(a => activeAiMonster.mp >= a.mp_cost && a.ability_type === 'ACTIVE');

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

    // Check passives for the defending player monster after damage is dealt
    const defenderWithNewHp = updatedPlayerTeam.find(m => m.id === activePlayerMonster.id);
    if (defenderWithNewHp) {
      handlePassiveTriggers('ON_HP_THRESHOLD', defenderWithNewHp);
    }

    if (newPlayerHp === 0) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
      const remainingPlayer = updatedPlayerTeam.filter(m => m.hp > 0);
      if (remainingPlayer.length === 0) {
        handleBattleCompletion('ai');
        setPlayerTeam(updatedPlayerTeam);
        setAiTeam(updatedAiTeam);
        return;
      }
    }
    endTurn('ai', updatedPlayerTeam, updatedAiTeam);
  };

  // NOTE: Target selection for healing/buffing allies is simplified for this pass.
  const handleTargetSelection = (targetIndex: number) => { /* ... */ };
  const handleSwapMonster = (newIndex: number) => { /* ... */ };

  // --- Battle Setup and Flow ---
  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timer = setTimeout(handleAiAbility, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded, activeAiIndex, playerTeam, activePlayerIndex]);

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);
    setActiveEffects([]); // Reset effects at start of battle
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

  if (battleMode === 'team-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1><BattleTeamSelector onBattleStart={handleBattleStart} /></div>;
  if (battleMode === 'lead-select') return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1><div className="flex flex-wrap justify-center gap-6">{playerTeam.map((userMonster, index) => (<div key={userMonster.id}><MonsterCard monster={{...userMonster.monster, abilities: playerMonsterAbilities?.[userMonster.monster.id] || []}} userMonster={userMonster} size="medium" /><Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>{userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}</Button></div>))}</div></div>;

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
                    monster={{...activePlayerMonster.monster, abilities: playerMonsterAbilities?.[activePlayerMonster.monster.id] || []}} 
                    userMonster={activePlayerMonster}
                    onAbilityClick={handlePlayerAbility} 
                    battleMode={true}
                    isPlayerTurn={turn === 'player' && !targetingMode && !battleEnded} 
                    startExpanded={true}
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
                                    <MonsterCard monster={{...monster.monster, abilities: playerMonsterAbilities?.[monster.monster.id] || []}} userMonster={monster} size="tiny" isToggleable={!targetingMode} isTargetable={!!targetingMode} onCardClick={targetingMode ? () => handleTargetSelection(originalIndex) : undefined} />
                                    <Button onClick={() => handleSwapMonster(originalIndex)} disabled={!!targetingMode || turn !== 'player' || monster.hp <= 0} size="sm" className="mt-1 w-full">Swap</Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
                <MonsterCard monster={{...activeAiMonster, abilities: aiMonsterAbilities?.[activeAiMonster.id] || []}} userMonster={activeAiMonster} showAbilities={true} size="large" isToggleable={true}/>
                {benchedAiMonsters.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {benchedAiMonsters.map((monster) => (
                            <MonsterCard key={monster.id} monster={{...monster, abilities: aiMonsterAbilities?.[monster.id] || []}} userMonster={monster} size="tiny" isToggleable={true}/>
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