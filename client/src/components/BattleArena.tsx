import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// --- INTERFACES ---
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
  sourceAbilityName: string;
}

interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
  statusEffect?: StatusEffect;
}

type TargetingMode = {
  ability: Ability;
  sourceMonsterId: number;
} | null;

// --- MAIN COMPONENT ---
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
    let scalingStatValue = ('monster' in attackingMonster ? attackingMonster.power : attackingMonster.power) || 0;
    const defenderDefense = 'monster' in defendingMonster ? defendingMonster.monster.defense : defendingMonster.defense;
    const attackPower = scalingStatValue * (ability.power_multiplier || 0);
    const finalDamage = Math.round(Math.max(1, attackPower * (100 / (100 + defenderDefense))));

    let statusEffect: StatusEffect | undefined;
    if (ability.status_effect_applies && ability.status_effect_chance && Math.random() < ability.status_effect_chance) {
        statusEffect = { effectName: ability.status_effect_applies, duration: ability.status_effect_duration || 0, value: ability.status_effect_value || 0, valueType: ability.status_effect_value_type || 'flat' };
    }
    return { damage: finalDamage, isCritical: false, affinityMultiplier: 1, statusEffect };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  const processEndOfTurnEffects = () => {
    // Placeholder for future, more advanced passive processing
  };

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);
    setPlayerTeam(selectedTeam);
    setAiTeam(generatedOpponent.scaledMonsters);
    const abilitiesMap: Record<number, Ability[]> = {};
    for (const monster of generatedOpponent.scaledMonsters) {
      try {
        const response = await fetch(`/api/monster-abilities/${monster.id}`);
        abilitiesMap[monster.id] = await response.json();
      } catch (error) {
        abilitiesMap[monster.id] = [];
      }
    }
    setAiMonsterAbilities(abilitiesMap);
    setBattleLog([`Battle is about to begin! Select your starting monster.`]);
    setBattleMode('lead-select');
    setTurn('pre-battle');
    setPlayerStatusEffects(new Map());
    setAiStatusEffects(new Map());
    setTargetingMode(null);
    setBattleEnded(false);
    setWinner(null);
    setIsLoading(false);
  };

  const selectLeadMonster = (index: number) => {
    setActivePlayerIndex(index);
    const randomAiIndex = Math.floor(Math.random() * aiTeam.length);
    setActiveAiIndex(randomAiIndex);
    setBattleLog(prev => [
      ...prev,
      `${playerTeam[index].monster.name} will start for you!`,
      `Your opponent sends out ${aiTeam[randomAiIndex].name}!`
    ]);
    determineFirstTurn(playerTeam[index], aiTeam[randomAiIndex]);
    setBattleMode('combat');
  };

  const determineFirstTurn = (playerMonster: UserMonster, aiMonster: Monster) => {
    if (playerMonster.speed >= aiMonster.speed) {
      setTurn('player');
    } else {
      setTurn('ai');
    }
  };

  const handleTargetSelection = (targetIndex: number) => {
    if (!targetingMode) return;
    const { ability, sourceMonsterId } = targetingMode;
    const sourceMonster = playerTeam.find(m => m.id === sourceMonsterId);
    let targetMonster = playerTeam[targetIndex];
    if (!sourceMonster || !targetMonster) {
      setTargetingMode(null);
      return;
    }
    let healingAmount = ability.healing_power || 0;
    const newHp = Math.min(targetMonster.maxHp, targetMonster.hp + healingAmount);
    setPlayerTeam(prev => prev.map((monster, index) => index === targetIndex ? { ...monster, hp: newHp } : monster));
    setBattleLog(prev => [...prev, `${sourceMonster.monster.name} used ${ability.name}, healing ${targetMonster.monster.name} for ${healingAmount} HP!`]);
    setPlayerTeam(prev => prev.map(m => m.id === sourceMonsterId ? { ...m, mp: m.mp - ability.mp_cost } : m));
    setTargetingMode(null);
    setTurn('ai');
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
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} is using ${ability.name}. Select a target!`]);
      setTargetingMode({ ability, sourceMonsterId: activePlayerMonster.id });
      return;
    }
    const activeAiMonster = aiTeam[activeAiIndex];
    const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
    const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
    setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, hp: newAiHp, is_fainted: newAiHp === 0 } : m));
    setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m));
    setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`]);
    if (newAiHp === 0) {
        setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
        const remainingAi = aiTeam.filter(m => m.hp > 0);
        if (remainingAi.length === 0) {
            setBattleLog(prev => [...prev, "You win the battle!"]);
            setBattleEnded(true);
            setWinner('player');
            return;
        }
        const nextAiIndex = aiTeam.findIndex(m => m.hp > 0);
        setActiveAiIndex(nextAiIndex);
        setBattleLog(prev => [...prev, `Your opponent sends out ${aiTeam[nextAiIndex].name}!`]);
    }
    setTurn('ai');
  };

  const decideAiAction = (): { action: 'attack'; ability: Ability | null } | { action: 'swap'; newIndex: number } => {
    const activeAiMonster = aiTeam[activeAiIndex];
    const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];
    const affordableAbilities = aiAbilities.filter(ability => ability.ability_type === 'ACTIVE' && activeAiMonster.mp >= ability.mp_cost);
    if (affordableAbilities.length > 0) {
      const selectedAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
      return { action: 'attack', ability: selectedAbility };
    }
    return { action: 'attack', ability: null };
  };

  // FIX: Added full AI turn logic
  const handleAiAbility = () => {
    if (turn !== 'ai' || battleEnded) return;

    const action = decideAiAction();
    const activeAiMonster = aiTeam[activeAiIndex];
    const activePlayerMonster = playerTeam[activePlayerIndex];

    if (action.action === 'swap') {
        setActiveAiIndex(action.newIndex);
        setBattleLog(prev => [...prev, `The opponent withdraws ${activeAiMonster.name} and sends out ${aiTeam[action.newIndex].name}!`]);
        setTurn('player');
        return;
    }

    const selectedAbility = action.ability;
    if (!selectedAbility) {
        setBattleLog(prev => [...prev, `${activeAiMonster.name} couldn't find a move to use!`]);
        setTurn('player');
        return;
    }

    const damageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);
    const newPlayerHp = Math.max(0, activePlayerMonster.hp - damageResult.damage);
    setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, hp: newPlayerHp } : m));
    setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - selectedAbility.mp_cost } : m));
    setBattleLog(prev => [...prev, `${activeAiMonster.name} used ${selectedAbility.name}, dealing ${damageResult.damage} damage!`]);

    if (newPlayerHp === 0) {
        setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
        const remainingPlayer = playerTeam.filter(m => m.hp > 0);
        if (remainingPlayer.length <= 1) { // <= 1 because state update is pending
            setBattleLog(prev => [...prev, "You have been defeated!"]);
            setBattleEnded(true);
            setWinner('ai');
            return;
        }
        // In a real game, you'd force the player to swap here
    }
    setTurn('player');
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timer = setTimeout(handleAiAbility, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded]);

  const resetBattle = () => {
    setBattleMode('team-select');
  };

  if (battleMode === 'team-select') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>
        <BattleTeamSelector onBattleStart={handleBattleStart} />
      </div>
    );
  }

  if (battleMode === 'lead-select') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1>
        <div className="flex flex-wrap justify-center gap-6">
          {playerTeam.map((userMonster, index) => (
              <div key={userMonster.id}>
                <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" />
                <Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>
                  {userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}
                </Button>
              </div>
          ))}
        </div>
      </div>
    );
  }

  if (battleMode === 'combat') {
    if (isLoading) return <div className="text-center p-8">Loading battle...</div>;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];
    if (!activePlayerMonster || !activeAiMonster) {
      return <div className="text-center p-8">Setting up combatants...</div>;
    }

    // FIX: Correctly define benched monsters
    const benchedPlayerMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const benchedAiMonsters = aiTeam.filter((_, index) => index !== activeAiIndex);

    return (
      <div className="max-w-7xl mx-auto p-4">
        {targetingMode && (
          <div className="text-center p-2 mb-4 bg-green-900/50 rounded-lg animate-pulse">
            <p className="text-lg font-semibold text-green-300">Choose a target for {targetingMode.ability.name}!</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 items-start">
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400">Your Team</h2>
            <MonsterCard
              monster={activePlayerMonster.monster}
              userMonster={activePlayerMonster}
              onAbilityClick={handlePlayerAbility}
              battleMode={true}
              isPlayerTurn={turn === 'player' && !targetingMode}
              startExpanded={true}
              isToggleable={false}
              size="large"
              isTargetable={targetingMode?.target === 'SELF' || targetingMode?.target === 'ALLY'}
              onCardClick={() => targetingMode && handleTargetSelection(activePlayerIndex)}
            />
            {/* FIX: Correctly render player bench */}
            {benchedPlayerMonsters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {benchedPlayerMonsters.map((monster, index) => {
                      const originalIndex = playerTeam.findIndex(p => p.id === monster.id);
                      return (
                          <div key={monster.id} className="text-center">
                              <MonsterCard monster={monster.monster} userMonster={monster} size="tiny" isTargetable={!!targetingMode} onCardClick={() => targetingMode && handleTargetSelection(originalIndex)} />
                          </div>
                      );
                  })}
                </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
            <MonsterCard monster={activeAiMonster} showAbilities={true} size="large" />
             {/* FIX: Correctly render AI bench */}
            {benchedAiMonsters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {benchedAiMonsters.map((monster) => (
                      <MonsterCard key={monster.id} monster={monster} size="tiny" />
                  ))}
                </div>
            )}
          </div>
        </div>
        <div className="mt-4 max-w-3xl mx-auto">
          <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-white border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Battle Log</h3>
            <div className="h-40 overflow-y-auto bg-gray-800/60 p-3 rounded font-mono text-sm">
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