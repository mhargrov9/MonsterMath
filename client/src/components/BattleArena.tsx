import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Interfaces (assuming these are defined in a shared types file eventually)
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
  // ... other ability fields
}

interface StatusEffect {
  effectName: string;
  duration: number;
  value: number;
  valueType: string;
}

interface ActiveStatusEffect {
  name: string;
  duration: number;
  value: number;
  effectType?: string; // e.g., 'HEAL_OVER_TIME'
  sourceAbilityName: string;
}

interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
  statusEffect?: StatusEffect;
}

// NEW: Type for targeting mode state
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
  const [playerStatusEffects, setPlayerStatusEffects] = useState<Map<number, ActiveStatusEffect[]>>(new Map());
  const [aiStatusEffects, setAiStatusEffects] = useState<Map<number, ActiveStatusEffect[]>>(new Map());
  const [targetingMode, setTargetingMode] = useState<TargetingMode>(null);

  const getAffinityMultiplier = (
    attackAffinity: string,
    defenderResistances: string[],
    defenderWeaknesses: string[]
  ): number => {
    const attackAffinityLower = attackAffinity.toLowerCase();
    const resistancesLower = defenderResistances?.map(r => r.toLowerCase()) || [];
    const weaknessesLower = defenderWeaknesses?.map(w => w.toLowerCase()) || [];

    if (weaknessesLower.includes(attackAffinityLower)) return 2.0;
    if (resistancesLower.includes(attackAffinityLower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (
    attackingMonster: Monster | UserMonster,
    defendingMonster: Monster | UserMonster,
    ability: Ability
  ): DamageResult => {
    let scalingStatValue: number;
    const scalingStatName = ability.scaling_stat || 'power';
    if ('monster' in attackingMonster) {
        switch (scalingStatName) {
            case 'defense': scalingStatValue = attackingMonster.defense; break;
            case 'speed': scalingStatValue = attackingMonster.speed; break;
            default: scalingStatValue = attackingMonster.power; break;
        }
    } else {
        switch (scalingStatName) {
            case 'defense': scalingStatValue = attackingMonster.defense; break;
            case 'speed': scalingStatValue = attackingMonster.speed; break;
            default: scalingStatValue = attackingMonster.power; break;
        }
    }
    const defenderDefense = 'defense' in defendingMonster ? defendingMonster.defense : defendingMonster.monster.defense;
    const attackPower = (scalingStatValue || 0) * (ability.power_multiplier || 0);
    const damageMultiplier = 100 / (100 + defenderDefense);
    let rawDamage = attackPower * damageMultiplier;
    const defenderResistances = 'resistances' in defendingMonster ? defendingMonster.resistances : defendingMonster.monster.resistances;
    const defenderWeaknesses = 'weaknesses' in defendingMonster ? defendingMonster.weaknesses : defendingMonster.monster.weaknesses;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderResistances, defenderWeaknesses);
    rawDamage *= affinityMultiplier;
    const critChance = 0.05 + (ability.crit_chance_modifier || 0);
    const isCritical = Math.random() < critChance;
    if (isCritical) rawDamage *= 1.5;
    const variance = 0.9 + Math.random() * 0.2;
    rawDamage *= variance;
    const finalDamage = Math.round(Math.max(1, rawDamage));

    let statusEffect: StatusEffect | undefined;
    if (ability.status_effect_applies && ability.status_effect_chance && Math.random() < ability.status_effect_chance) {
        statusEffect = { effectName: ability.status_effect_applies, duration: ability.status_effect_duration || 0, value: ability.status_effect_value || 0, valueType: ability.status_effect_value_type || 'flat' };
    }
    return { damage: finalDamage, isCritical, affinityMultiplier, statusEffect };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  const processEndOfTurnEffects = (whoseTurnEnded: 'player' | 'ai') => {
      // This is a placeholder for a more advanced passive system.
  };

  const decideAiAction = (): { action: 'attack'; ability: Ability | null } | { action: 'swap'; newIndex: number } => {
    // ... same as before
    return { action: 'attack', ability: null }; // Simplified for brevity
  };
  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    // ... same as before
  };
  const selectLeadMonster = (index: number) => {
    // ... same as before
  };
  const determineFirstTurn = (playerMonster: UserMonster, aiMonster: Monster) => {
    // ... same as before
  };
  const handleTargetSelection = (targetIndex: number) => {
    if (!targetingMode) return;
    const { ability, sourceMonsterId } = targetingMode;
    const sourceMonster = playerTeam.find(m => m.id === sourceMonsterId);
    const targetMonster = playerTeam[targetIndex];
    if (!sourceMonster || !targetMonster) {
      setTargetingMode(null);
      return;
    }
    let healingAmount = 0;
    if (ability.healing_power && ability.scaling_stat && sourceMonster[ability.scaling_stat as keyof UserMonster]) {
        const scalingStatValue = sourceMonster[ability.scaling_stat as keyof UserMonster] as number;
        healingAmount = Math.round(ability.healing_power * scalingStatValue);
    } else if (ability.healing_power) {
        healingAmount = ability.healing_power; // Flat heal
    }
    const newHp = Math.min(targetMonster.maxHp, targetMonster.hp + healingAmount);
    setPlayerTeam(prev => prev.map((monster, index) => index === targetIndex ? { ...monster, hp: newHp } : monster));
    setBattleLog(prev => [...prev, `${sourceMonster.monster.name} used ${ability.name}, healing ${targetMonster.monster.name} for ${healingAmount} HP!`]);
    setPlayerTeam(prev => prev.map(m => m.id === sourceMonsterId ? { ...m, mp: m.mp - ability.mp_cost } : m));
    setTargetingMode(null);
    setTurn('ai');
  };

  const handlePlayerAbility = async (ability: Ability) => {
    if (turn !== 'player' || battleEnded || targetingMode) return;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    if (activePlayerMonster.mp < ability.mp_cost) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} doesn't have enough MP!`]);
      return;
    }
    const targetType = ability.target || 'OPPONENT';
    if (targetType === 'OPPONENT') {
      const activeAiMonster = aiTeam[activeAiIndex];
      const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
      const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
      setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, hp: newAiHp, is_fainted: newAiHp === 0 } : m));
      let logMessage = `${activePlayerMonster.monster.name} used ${ability.name}! `;
      if (damageResult.isCritical) logMessage += "A Critical Hit! ";
      logMessage += `Dealt ${damageResult.damage} damage to ${activeAiMonster.name}.`;
      const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
      if (effectivenessMsg) logMessage += ` ${effectivenessMsg}`;
      if (damageResult.statusEffect) {
          logMessage += ` ${activeAiMonster.name} is now affected by ${damageResult.statusEffect.effectName}!`;
          setAiStatusEffects(prev => {
              const newMap = new Map(prev);
              const existingEffects = newMap.get(activeAiMonster.id) || [];
              const newEffect: ActiveStatusEffect = { 
                  name: damageResult.statusEffect!.effectName, 
                  duration: damageResult.statusEffect!.duration, 
                  value: damageResult.statusEffect!.value,
                  sourceAbilityName: ability.name,
              };
              newMap.set(activeAiMonster.id, [...existingEffects, newEffect]);
              return newMap;
          });
      }
      setBattleLog(prev => [...prev, logMessage]);
      setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m));
      if (newAiHp === 0) {
        // ... fainted logic
      }
      setTurn('ai');
    } else if (targetType === 'ALLY' || targetType === 'SELF') {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} is using ${ability.name}. Select a target!`]);
      setTargetingMode({ ability, sourceMonsterId: activePlayerMonster.id });
    }
  };

  const handleSwapMonster = (newIndex: number) => {
    // ... same as before
  };
  const handleAiAbility = () => {
    // ... same as before
  };
  useEffect(() => {
    // ... same as before
  }, [turn, battleEnded, activeAiIndex]);
  const resetBattle = () => {
    // ... same as before
  };

  // --- RENDER LOGIC ---
  if (battleMode === 'team-select') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>
        <BattleTeamSelector onBattleStart={handleBattleStart} />
      </div>
    );
  }

  if (battleMode === 'lead-select') {
    // ... same as before
     return <div>Lead Select...</div>;
  }

  if (battleMode === 'combat') {
    if (isLoading) return <div className="text-center p-8">Loading battle...</div>;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];
    if (!activePlayerMonster || !activeAiMonster) return <div className="text-center p-8">Setting up combatants...</div>;
    const benchedPlayerMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const needsToSwap = activePlayerMonster.hp <= 0 && playerTeam.some(monster => monster.hp > 0);

    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 items-start">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400">Your Team</h2>
            <MonsterCard
              monster={activePlayerMonster.monster}
              userMonster={activePlayerMonster}
              onAbilityClick={handlePlayerAbility}
              battleMode={true}
              isPlayerTurn={turn === 'player' && !targetingMode && !needsToSwap}
              startExpanded={true}
              isToggleable={false}
              size="large"
              isTargeting={targetingMode?.target === 'SELF' && targetingMode?.sourceMonsterId === activePlayerMonster.id}
              onCardClick={() => targetingMode && handleTargetSelection(activePlayerIndex)}
            />
            {benchedPlayerMonsters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {playerTeam.map((monster, index) => {
                    if (index === activePlayerIndex) return null;
                    return (
                      <div key={monster.id} className="text-center">
                        <MonsterCard
                          monster={monster.monster}
                          userMonster={monster}
                          size="tiny"
                          isTargeting={!!targetingMode}
                          onCardClick={() => targetingMode && handleTargetSelection(index)}
                        />
                        <Button
                          onClick={() => handleSwapMonster(index)}
                          className="w-full mt-1"
                          size="sm"
                          disabled={turn !== 'player' || monster.hp <= 0 || battleEnded || !!targetingMode}
                          variant={needsToSwap && monster.hp > 0 ? "default" : "outline"}
                        >
                          {monster.hp <= 0 ? 'Fainted' : needsToSwap ? 'Send!' : 'Swap'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
            <MonsterCard
              monster={aiTeam[activeAiIndex]}
              showAbilities={true}
              size="large"
            />
             {aiTeam.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {aiTeam.map((monster, index) => {
                    if (index === activeAiIndex) return null;
                    return <MonsterCard key={monster.id} monster={monster} size="tiny" showAbilities={true} />;
                  })}
                </div>
            )}
          </div>
        </div>

        <div className="mt-4 max-w-3xl mx-auto">
          <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-white border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Battle Log</h3>
            <div className="h-40 overflow-y-auto bg-gray-800/60 p-3 rounded font-mono text-sm" ref={el => el?.scrollTo(0, el.scrollHeight)}>
              {battleLog.map((log, index) => <p key={index} className="mb-1 animate-fadeIn">{`> ${log}`}</p>)}
            </div>
          </div>
          {/* FIX: Corrected render logic with valid JSX */}
          <div className="text-center text-white">
            {targetingMode ? (
              <p className="text-lg font-semibold text-green-400 animate-pulse">
                  Choose a target for {targetingMode.ability.name}!
              </p>
            ) : battleEnded ? (
               <div>
                <p className="text-2xl font-bold mb-4">
                  {winner === 'player' ? '🎉 Victory! 🎉' : '💀 Defeat 💀'}
                </p>
                <Button onClick={resetBattle}>New Battle</Button>
              </div>
            ) : needsToSwap ? (
              <p className="text-lg font-semibold text-red-500 animate-pulse">
                Your monster has fainted! Choose a replacement!
              </p>
            ) : (
              <p className="text-lg font-semibold">
                {turn === 'player' ? "Your Turn - Attack or Swap!" : activeAiMonster ? `${activeAiMonster.name} is thinking...` : "Opponent is thinking..."}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BattleArena;