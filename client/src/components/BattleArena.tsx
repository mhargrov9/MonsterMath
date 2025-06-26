import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
  min_hits?: number;
  max_hits?: number;
  status_effect_applies?: string;
  status_effect_chance?: number;
  status_effect_duration?: number;
  status_effect_value?: number;
  status_effect_value_type?: string;
  status_effect_trigger_affinity?: string;
  priority?: number;
  crit_chance_modifier?: number;
  lifesteal_percent?: number;
  target_stat_modifier?: string;
  stat_modifier_value?: number;
  stat_modifier_duration?: number;
}

interface StatusEffect {
  effectName: string;
  duration: number;
  value: number;
  valueType: string;
}

interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
  statusEffect?: StatusEffect;
}

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

  const getAffinityMultiplier = (
    attackAffinity: string,
    defenderResistances: string[],
    defenderWeaknesses: string[]
  ): number => {
    const attackAffinityLower = attackAffinity.toLowerCase();
    const resistancesLower = defenderResistances?.map(r => r.toLowerCase()) || [];
    const weaknessesLower = defenderWeaknesses?.map(w => w.toLowerCase()) || [];

    if (weaknessesLower.includes(attackAffinityLower)) {
      return 2.0;
    }
    if (resistancesLower.includes(attackAffinityLower)) {
      return 0.5;
    }
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
    const attackPower = scalingStatValue * ability.power_multiplier;
    const damageMultiplier = 100 / (100 + defenderDefense);
    let rawDamage = attackPower * damageMultiplier;

    const defenderResistances = 'resistances' in defendingMonster ? defendingMonster.resistances : defendingMonster.monster.resistances;
    const defenderWeaknesses = 'weaknesses' in defendingMonster ? defendingMonster.weaknesses : defendingMonster.monster.weaknesses;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderResistances, defenderWeaknesses);
    rawDamage *= affinityMultiplier;

    const critChance = 0.05 + (ability.crit_chance_modifier || 0);
    const isCritical = Math.random() < critChance;
    if (isCritical) {
      rawDamage *= 1.5;
    }

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

  const decideAiAction = (): { action: 'attack'; ability: Ability | null } | { action: 'swap'; newIndex: number } => {
    const activeAiMonster = aiTeam[activeAiIndex];
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const benchedAiMonsters = aiTeam.filter((_, index) => index !== activeAiIndex && _.hp > 0);

    const hpPercent = activeAiMonster.hp / activeAiMonster.max_hp;
    if (hpPercent < 0.25 && benchedAiMonsters.length > 0) {
      const healthyBenchMonsterIndex = aiTeam.findIndex((m, i) => i !== activeAiIndex && (m.hp / m.max_hp) > 0.5 && m.hp > 0);
      if (healthyBenchMonsterIndex !== -1) {
        return { action: 'swap', newIndex: healthyBenchMonsterIndex };
      }
    }

    const playerAffinity = activePlayerMonster.monster.affinity;
    const isAtDisadvantage = activeAiMonster.weaknesses && activeAiMonster.weaknesses.includes(playerAffinity);
    if (isAtDisadvantage && benchedAiMonsters.length > 0) {
      const betterMatchupIndex = aiTeam.findIndex((m, i) => i !== activeAiIndex && (!m.weaknesses || !m.weaknesses.includes(playerAffinity)) && m.hp > 0);
      if (betterMatchupIndex !== -1) {
        return { action: 'swap', newIndex: betterMatchupIndex };
      }
    }

    const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];
    const affordableAbilities = aiAbilities.filter(
      ability => ability.ability_type === 'ACTIVE' && activeAiMonster.mp >= ability.mp_cost
    );

    if (affordableAbilities.length > 0) {
      const selectedAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
      return { action: 'attack', ability: selectedAbility };
    } else {
      return { action: 'attack', ability: null };
    }
  };

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);

    if (!selectedTeam || selectedTeam.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setPlayerTeam(selectedTeam);
      const aiMonsters = generatedOpponent.scaledMonsters;
      setAiTeam(aiMonsters);

      const abilitiesMap: Record<number, Ability[]> = {};
      for (const monster of aiMonsters) {
        try {
          const response = await fetch(`/api/monster-abilities/${monster.id}`);
          const abilities = await response.json();
          abilitiesMap[monster.id] = abilities;
        } catch (error) {
          console.error(`Failed to fetch abilities for monster ${monster.id}:`, error);
          abilitiesMap[monster.id] = [];
        }
      }

      setAiMonsterAbilities(abilitiesMap);
      setBattleLog([`Battle is about to begin! Select your starting monster.`]);
      setBattleMode('lead-select');
      setTurn('pre-battle');

    } catch (error) {
      console.error('Error starting battle:', error);
    }

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
      setBattleLog(prev => [...prev, `${playerMonster.monster.name} is faster and gets the first turn!`]);
    } else {
      setTurn('ai');
      setBattleLog(prev => [...prev, `${aiMonster.name} is faster and gets the first turn!`]);
    }
  };

  const handlePlayerAbility = async (ability: Ability) => {
    if (turn !== 'player' || battleEnded) return;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];

    if (activePlayerMonster.mp < ability.mp_cost) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} doesn't have enough MP!`]);
      return;
    }

    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = {
      ...activePlayerMonster,
      mp: activePlayerMonster.mp - ability.mp_cost
    };
    setPlayerTeam(updatedPlayerTeam);

    const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
    const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = {
      ...activeAiMonster,
      hp: newAiHp,
      is_fainted: newAiHp === 0
    };
    setAiTeam(updatedAiTeam);

    let logMessage = `${activePlayerMonster.monster.name} used ${ability.name}! `;
    if (damageResult.isCritical) logMessage += "A Critical Hit! ";
    logMessage += `Dealt ${damageResult.damage} damage to ${activeAiMonster.name}.`;
    const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
    if (effectivenessMsg) logMessage += ` ${effectivenessMsg}`;
    if (damageResult.statusEffect) logMessage += ` ${activePlayerMonster.monster.name} is now affected by ${damageResult.statusEffect.effectName}!`;
    setBattleLog(prev => [...prev, logMessage]);

    if (newAiHp === 0) {
      setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
      const remainingAiMonsters = updatedAiTeam.filter(monster => monster.hp > 0);
      if (remainingAiMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You win the battle!"]);
        setBattleEnded(true);
        setWinner('player');
        return;
      } else {
        const nextAiIndex = updatedAiTeam.findIndex(monster => monster.hp > 0);
        setActiveAiIndex(nextAiIndex);
        setBattleLog(prev => [...prev, `Your opponent sends out ${updatedAiTeam[nextAiIndex].name}!`]);
      }
    }
    setTurn('ai');
  };

  const handleSwapMonster = (newIndex: number) => {
    if (newIndex === activePlayerIndex || turn !== 'player' || battleEnded) return;
    const newActiveMonster = playerTeam[newIndex];
    if (newActiveMonster.hp <= 0) {
      setBattleLog(prev => [...prev, `${newActiveMonster.monster.name} is unable to battle!`]);
      return;
    }
    setActivePlayerIndex(newIndex);
    setBattleLog(prev => [...prev, `You called back your monster and sent out ${newActiveMonster.monster.name}!`]);
    setTurn('ai');
  };

  const handleAiAbility = () => {
    if (battleEnded) return;
    const action = decideAiAction();
    const activeAiMonster = aiTeam[activeAiIndex];

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

    const activePlayerMonster = playerTeam[activePlayerIndex];
    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = {
      ...activeAiMonster,
      mp: Math.max(0, activeAiMonster.mp - selectedAbility.mp_cost)
    };
    setAiTeam(updatedAiTeam);

    const aiDamageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);
    const newPlayerHp = Math.max(0, activePlayerMonster.hp - aiDamageResult.damage);
    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = {
      ...activePlayerMonster,
      hp: newPlayerHp
    };
    setPlayerTeam(updatedPlayerTeam);

    let aiLogMessage = `${activeAiMonster.name} used ${selectedAbility.name}! `;
    if (aiDamageResult.isCritical) aiLogMessage += "A Critical Hit! ";
    aiLogMessage += `Dealt ${aiDamageResult.damage} damage to ${activePlayerMonster.monster.name}.`;
    const aiEffectivenessMsg = getEffectivenessMessage(aiDamageResult.affinityMultiplier);
    if (aiEffectivenessMsg) aiLogMessage += ` ${aiEffectivenessMsg}`;
    if (aiDamageResult.statusEffect) aiLogMessage += ` ${activePlayerMonster.monster.name} is now affected by ${aiDamageResult.statusEffect.effectName}!`;
    setBattleLog(prev => [...prev, aiLogMessage]);

    if (newPlayerHp === 0) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
      const remainingPlayerMonsters = updatedPlayerTeam.filter(monster => monster.hp > 0);
      if (remainingPlayerMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You lose the battle!"]);
        setBattleEnded(true);
        setWinner('ai');
        return;
      } else {
        setBattleLog(prev => [...prev, "Choose your next monster!"]);
        setTurn('player');
        return;
      }
    }
    setTurn('player');
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      setTimeout(() => {
        handleAiAbility();
      }, 1500);
    }
  }, [turn, battleEnded]);

  const resetBattle = () => {
    setBattleMode('team-select');
    setPlayerTeam([]);
    setAiTeam([]);
    setActivePlayerIndex(0);
    setActiveAiIndex(0);
    setTurn('pre-battle');
    setBattleLog([]);
    setBattleEnded(false);
    setWinner(null);
    setAiMonsterAbilities({});
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
                <MonsterCard
                  monster={userMonster}
                  userMonster={userMonster}
                  size="medium"
                />
                <Button
                  onClick={() => selectLeadMonster(index)}
                  className="w-full mt-4"
                  disabled={userMonster.hp <= 0}
                >
                  {userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}
                </Button>
              </div>
          ))}
        </div>
      </div>
    );
  }

  if (battleMode === 'combat') {
    if (isLoading) {
      return <div className="text-center p-8">Loading battle...</div>;
    }

    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];

    if (!activePlayerMonster || !activeAiMonster) {
      return <div className="text-center p-8">Setting up combatants...</div>;
    }

    const benchedPlayerMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const needsToSwap = activePlayerMonster.hp <= 0 && playerTeam.some(monster => monster.hp > 0);

    return (
      <div className="max-w-7xl mx-auto p-4">
        {/* Active Monsters Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 items-start">
          {/* Player Side */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400">Your Team</h2>
            <MonsterCard
              monster={activePlayerMonster}
              userMonster={activePlayerMonster}
              onAbilityClick={handlePlayerAbility}
              battleMode={true}
              isPlayerTurn={turn === 'player' && !needsToSwap}
              startExpanded={true}
              isToggleable={false}
              size="large"
            />
            {/* Player Bench */}
            {benchedPlayerMonsters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {playerTeam.map((monster, index) => {
                    if (index === activePlayerIndex) return null;
                    return (
                      <div key={monster.id} className="text-center">
                        <MonsterCard
                          monster={monster}
                          userMonster={monster}
                          size="tiny"
                        />
                        <Button
                          onClick={() => handleSwapMonster(index)}
                          className="w-full mt-1"
                          size="sm"
                          disabled={turn !== 'player' || monster.hp <= 0 || battleEnded}
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

          {/* AI Side */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-2 text-red-400">Opponent's Team</h2>
            <MonsterCard
              monster={aiTeam[activeAiIndex]}
              showAbilities={true}
              size="large"
            />
            {/* AI Bench */}
            {aiTeam.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {aiTeam.map((monster, index) => {
                    if (index === activeAiIndex) return null;
                    return (
                        <MonsterCard
                          key={monster.id}
                          monster={monster}
                          size="tiny"
                          showAbilities={true} 
                        />
                    );
                  })}
                </div>
            )}
          </div>
        </div>

        {/* Battle Log & Status */}
        <div className="mt-4 max-w-3xl mx-auto">
          <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-white border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Battle Log</h3>
            <div className="h-40 overflow-y-auto bg-gray-800/60 p-3 rounded font-mono text-sm" ref={el => el?.scrollTo(0, el.scrollHeight)}>
              {battleLog.map((log, index) => <p key={index} className="mb-1 animate-fadeIn">{`> ${log}`}</p>)}
            </div>
          </div>

          <div className="text-center text-white">
            {battleEnded ? (
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
                {turn === 'player' ? "Your Turn - Attack or Swap!" : `${activeAiMonster.name} is thinking...`}
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