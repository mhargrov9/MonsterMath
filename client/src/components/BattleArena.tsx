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
  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  // State for the full teams
  const [playerTeam, setPlayerTeam] = useState<UserMonster[]>([]);
  const [aiTeam, setAiTeam] = useState<Monster[]>([]);

  // State to track the INDEX of the active monster in the team arrays
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeAiIndex, setActiveAiIndex] = useState(0);

  // State to manage whose turn it is and the battle phase
  const [turn, setTurn] = useState<'player' | 'ai' | 'pre-battle'>('pre-battle');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);

  // Abilities for AI monsters
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
    // Step 1: Get base stats from the correct monster object type
    const attackerPower = 'power' in attackingMonster ? attackingMonster.power : attackingMonster.monster.power;
    const defenderDefense = 'defense' in defendingMonster ? defendingMonster.defense : defendingMonster.monster.defense;
    const defenderResistances = 'resistances' in defendingMonster ? defendingMonster.resistances : defendingMonster.monster.resistances;
    const defenderWeaknesses = 'weaknesses' in defendingMonster ? defendingMonster.weaknesses : defendingMonster.monster.weaknesses;

    // Step 2: Calculate the raw attack power based on the ability
    // Using a base of 50 to make the power stat more impactful
    const attackPower = (attackerPower + 50) * ability.power_multiplier;

    // --- NEW DAMAGE LOGIC ---
    // Step 3: Subtract defender's defense from the attack power
    let rawDamage = attackPower - defenderDefense;

    // Step 4: Apply a damage floor to ensure at least some damage is always dealt
    // This also prevents negative damage from healing the opponent
    rawDamage = Math.max(rawDamage, attackPower * 0.1); // Does at least 10% of the raw attack power

    // Step 5: Apply affinity multiplier (e.g., Fire vs Water)
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderResistances, defenderWeaknesses);
    rawDamage *= affinityMultiplier;

    // Step 6: Apply critical hit modifier
    const critChance = 0.05 + (ability.crit_chance_modifier || 0);
    const isCritical = Math.random() < critChance;
    if (isCritical) {
      rawDamage *= 1.5; // Critical hits do 50% more damage
    }

    // Step 7: Apply a random variance of +/- 10%
    const variance = 0.9 + Math.random() * 0.2; 
    rawDamage *= variance;

    // Step 8: Round to the nearest integer for the final damage
    const finalDamage = Math.round(Math.max(1, rawDamage)); // Ensure at least 1 damage is always done

    // --- Status Effect Logic (Unchanged) ---
    let statusEffect: StatusEffect | undefined;
    if (ability.status_effect_applies &&
        ability.status_effect_chance &&
        Math.random() < ability.status_effect_chance) {
      statusEffect = {
        effectName: ability.status_effect_applies,
        duration: ability.status_effect_duration || 0,
        value: ability.status_effect_value || 0,
        valueType: ability.status_effect_value_type || 'flat'
      };
    }

    return {
      damage: finalDamage,
      isCritical,
      affinityMultiplier,
      statusEffect
    };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  // AI Decision Making Function with Detailed Logging
  const decideAiAction = (): { action: 'attack'; ability: Ability | null } | { action: 'swap'; newIndex: number } => {
    console.log("--- AI: Deciding action ---");

    const activeAiMonster = aiTeam[activeAiIndex];
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const benchedAiMonsters = aiTeam.filter((_, index) => index !== activeAiIndex && _.hp > 0);

    console.log(`AI: Active monster is ${activeAiMonster.name} with ${activeAiMonster.hp}/${activeAiMonster.max_hp} HP.`);

    // 1. Self-Preservation Check
    const hpPercent = activeAiMonster.hp / activeAiMonster.max_hp;
    if (hpPercent < 0.25 && benchedAiMonsters.length > 0) {
      console.log("AI: HP is low, considering a swap.");
      const healthyBenchMonsterIndex = aiTeam.findIndex((m, i) => i !== activeAiIndex && (m.hp / m.max_hp) > 0.5 && m.hp > 0);
      if (healthyBenchMonsterIndex !== -1) {
        console.log(`AI: Decided to SWAP to ${aiTeam[healthyBenchMonsterIndex].name}.`);
        return { action: 'swap', newIndex: healthyBenchMonsterIndex };
      }
    }

    // 2. Tactical Disadvantage Check
    const playerAffinity = activePlayerMonster.monster.affinity;
    const isAtDisadvantage = activeAiMonster.weaknesses && activeAiMonster.weaknesses.includes(playerAffinity);
    if (isAtDisadvantage && benchedAiMonsters.length > 0) {
      console.log("AI: Is at a tactical disadvantage, considering a swap.");
      const betterMatchupIndex = aiTeam.findIndex((m, i) => i !== activeAiIndex && (!m.weaknesses || !m.weaknesses.includes(playerAffinity)) && m.hp > 0);
      if (betterMatchupIndex !== -1) {
        console.log(`AI: Decided to SWAP to ${aiTeam[betterMatchupIndex].name}.`);
        return { action: 'swap', newIndex: betterMatchupIndex };
      }
    }

    // 3. Default to Attack
    console.log("AI: Defaulting to attack.");
    const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];
    console.log(`AI: Available abilities for ${activeAiMonster.name}:`, aiAbilities.map(a => `${a.name} (${a.mp_cost} MP)`));

    const affordableAbilities = aiAbilities.filter(
      ability => ability.ability_type === 'ACTIVE' && activeAiMonster.mp >= ability.mp_cost
    );
    console.log(`AI: Affordable abilities:`, affordableAbilities.map(a => `${a.name} (${a.mp_cost} MP)`));

    if (affordableAbilities.length > 0) {
      const selectedAbility = affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)];
      console.log(`AI: Chose affordable ability: ${selectedAbility.name}.`);
      return { action: 'attack', ability: selectedAbility };
    } else {
      console.error("AI: CRITICAL - No affordable abilities found!");
      return { action: 'attack', ability: null };
    }
  };

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);

    if (!selectedTeam || selectedTeam.length === 0) {
      console.error("handleBattleStart called with no selected team.");
      setIsLoading(false);
      return;
    }

    try {
      setPlayerTeam(selectedTeam);

      // Convert generated opponent to proper Monster array
      const aiMonsters = generatedOpponent.scaledMonsters;

      setAiTeam(aiMonsters);

      // Pre-load AI abilities for all monsters
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

    // AI randomly selects its lead
    const randomAiIndex = Math.floor(Math.random() * aiTeam.length);
    setActiveAiIndex(randomAiIndex);

    setBattleLog(prev => [
      ...prev,
      `${playerTeam[index].monster.name} will start for you!`,
      `Your opponent sends out ${aiTeam[randomAiIndex].name}!`
    ]);

    // Determine first turn based on speed and start the battle
    determineFirstTurn(playerTeam[index], aiTeam[randomAiIndex]);
    setBattleMode('combat');
  };

  const determineFirstTurn = (playerMonster: UserMonster, aiMonster: Monster) => {
    const playerSpeed = playerMonster.speed;
    const aiSpeed = aiMonster.speed;

    if (playerSpeed >= aiSpeed) {
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

    // Check if player has enough MP
    if (activePlayerMonster.mp < ability.mp_cost) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} doesn't have enough MP to use ${ability.name}!`]);
      return;
    }

    // Deduct MP cost
    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = {
      ...activePlayerMonster,
      mp: activePlayerMonster.mp - ability.mp_cost
    };
    setPlayerTeam(updatedPlayerTeam);

    // Calculate damage
    const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);

    // Apply damage to AI monster
    const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = {
      ...activeAiMonster,
      hp: newAiHp,
      is_fainted: newAiHp === 0
    };
    setAiTeam(updatedAiTeam);

    // Build battle log message
    let logMessage = `${activePlayerMonster.monster.name} used ${ability.name}! `;
    if (damageResult.isCritical) {
      logMessage += "A Critical Hit! ";
    }
    logMessage += `Dealt ${damageResult.damage} damage to ${activeAiMonster.name}.`;

    const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
    if (effectivenessMsg) {
      logMessage += ` ${effectivenessMsg}`;
    }

    // Handle status effect application
    if (damageResult.statusEffect) {
      logMessage += ` ${activeAiMonster.name} is now affected by ${damageResult.statusEffect.effectName}!`;
    }

    setBattleLog(prev => [...prev, logMessage]);

    // Check if AI monster is defeated
    if (newAiHp === 0) {
      setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);

      // Check if AI has more monsters
      const remainingAiMonsters = updatedAiTeam.filter(monster => monster.hp > 0);
      if (remainingAiMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You win the battle!"]);
        setBattleEnded(true);
        setWinner('player');
        return;
      } else {
        // AI automatically switches to next available monster
        const nextAiIndex = updatedAiTeam.findIndex(monster => monster.hp > 0);
        setActiveAiIndex(nextAiIndex);
        setBattleLog(prev => [...prev, `Your opponent sends out ${updatedAiTeam[nextAiIndex].name}!`]);
      }
    }

    // End player turn
    setTurn('ai');
  };

  const handleSwapMonster = (newIndex: number) => {
    if (newIndex === activePlayerIndex || turn !== 'player' || battleEnded) return;

    const newActiveMonster = playerTeam[newIndex];

    // Check if the monster is fainted
    if (newActiveMonster.hp <= 0) {
      setBattleLog(prev => [...prev, `${newActiveMonster.monster.name} is unable to battle!`]);
      return;
    }

    setActivePlayerIndex(newIndex);
    setBattleLog(prev => [...prev, `You called back your monster and sent out ${newActiveMonster.monster.name}!`]);
    setTurn('ai'); // Swapping costs the turn
  };

  const handleAiAbility = () => {
    if (battleEnded) return;

    const activeAiMonster = aiTeam[activeAiIndex];
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const aiAbilities = aiMonsterAbilities[activeAiMonster.id] || [];

    if (aiAbilities.length === 0) {
      setBattleLog(prev => [...prev, `${activeAiMonster.name} has no abilities!`]);
      setTurn('player');
      return;
    }

    // AI selects a random ability it can afford
    const affordableAbilities = aiAbilities.filter(
      ability => ability.ability_type === 'ACTIVE' && activeAiMonster.mp >= ability.mp_cost
    );

    const selectedAbility = affordableAbilities.length > 0
      ? affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)]
      : aiAbilities[0]; // Fallback to first ability if none affordable

    // Deduct AI MP cost
    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = {
      ...activeAiMonster,
      mp: Math.max(0, activeAiMonster.mp - selectedAbility.mp_cost)
    };
    setAiTeam(updatedAiTeam);

    // Calculate AI damage
    const aiDamageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);

    // Apply damage to player monster
    const newPlayerHp = Math.max(0, activePlayerMonster.hp - aiDamageResult.damage);
    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = {
      ...activePlayerMonster,
      hp: newPlayerHp
    };
    setPlayerTeam(updatedPlayerTeam);

    // Build AI attack log message
    let aiLogMessage = `${activeAiMonster.name} used ${selectedAbility.name}! `;
    if (aiDamageResult.isCritical) {
      aiLogMessage += "A Critical Hit! ";
    }
    aiLogMessage += `Dealt ${aiDamageResult.damage} damage to ${activePlayerMonster.monster.name}.`;

    const aiEffectivenessMsg = getEffectivenessMessage(aiDamageResult.affinityMultiplier);
    if (aiEffectivenessMsg) {
      aiLogMessage += ` ${aiEffectivenessMsg}`;
    }

    // Handle AI status effect application
    if (aiDamageResult.statusEffect) {
      aiLogMessage += ` ${activePlayerMonster.monster.name} is now affected by ${aiDamageResult.statusEffect.effectName}!`;
    }

    setBattleLog(prev => [...prev, aiLogMessage]);

    // Check if player monster is defeated
    if (newPlayerHp === 0) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);

      // Check if player has more monsters
      const remainingPlayerMonsters = updatedPlayerTeam.filter(monster => monster.hp > 0);
      if (remainingPlayerMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You lose the battle!"]);
        setBattleEnded(true);
        setWinner('ai');
        return;
      } else {
        // Player must choose next monster - this will be handled in UI
        setBattleLog(prev => [...prev, "Choose your next monster!"]);
        setTurn('player'); // Player needs to swap
        return;
      }
    }

    // End AI turn
    setTurn('player');
  };

  // AI Turn Logic
  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      // Add a timeout for dramatic effect
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

  // Team selection view
  if (battleMode === 'team-select') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>
        <BattleTeamSelector onBattleStart={handleBattleStart} />
      </div>
    );
  }

  // Lead monster selection view
  if (battleMode === 'lead-select') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playerTeam.map((userMonster, index) => (
            <Card key={userMonster.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <MonsterCard
                  monster={userMonster.monster}
                  userMonster={userMonster}
                  size="small"
                />
                <Button
                  onClick={() => selectLeadMonster(index)}
                  className="w-full mt-4"
                  disabled={userMonster.hp <= 0}
                >
                  {userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Combat view
  if (battleMode === 'combat') {
    // Add this loading check right at the top
    if (isLoading) {
      return <div className="text-center p-8">Loading battle...</div>;
    }

    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];

    // Add this guard clause
    if (!activePlayerMonster || !activeAiMonster) {
      return <div className="text-center p-8">Setting up combatants...</div>;
    }

    const benchedMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const needsToSwap = activePlayerMonster.hp <= 0 && playerTeam.some(monster => monster.hp > 0);

    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>

        {/* Active Monsters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Your Active Monster</h2>
            <MonsterCard
              monster={{
                ...activePlayerMonster.monster,
                hp: activePlayerMonster.hp,
                max_hp: activePlayerMonster.maxHp,
                mp: activePlayerMonster.mp,
                max_mp: activePlayerMonster.maxMp,
                power: activePlayerMonster.power,
                defense: activePlayerMonster.defense,
                speed: activePlayerMonster.speed,
                level: activePlayerMonster.level
              }}
              onAbilityClick={handlePlayerAbility}
              battleMode={true}
              isPlayerTurn={turn === 'player' && !needsToSwap}
              battleMp={activePlayerMonster.mp}
              battleHp={activePlayerMonster.hp}
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Opponent's Active Monster</h2>
            <MonsterCard
              monster={activeAiMonster}
              onAbilityClick={() => {}}
              showAbilities={true}
              battleHp={activeAiMonster.hp}
            />
          </div>
        </div>

        {/* Bench Management */}
        {benchedMonsters.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center">Your Bench</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {benchedMonsters.map((monster, benchIndex) => {
                const originalIndex = playerTeam.findIndex(m => m.id === monster.id);
                return (
                  <Card key={monster.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-2">
                      <MonsterCard
                        monster={monster.monster}
                        userMonster={monster}
                        size="small"
                      />
                      <Button
                        onClick={() => handleSwapMonster(originalIndex)}
                        className="w-full mt-2"
                        size="sm"
                        disabled={turn !== 'player' || monster.hp <= 0 || battleEnded}
                        variant={needsToSwap && monster.hp > 0 ? "default" : "outline"}
                      >
                        {monster.hp <= 0 ? 'Fainted' : needsToSwap ? 'Send Out!' : 'Swap In'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Opponent's Bench */}
        {aiTeam.length > 1 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center text-red-600">Opponent's Bench</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {aiTeam.map((monster, index) => {
                // Only show monsters that are not the active AI monster
                if (index === activeAiIndex) return null;
                
                return (
                  <Card key={monster.id} className="opacity-80">
                    <CardContent className="p-2">
                      <MonsterCard
                        monster={monster}
                        size="small"
                        battleHp={monster.hp}
                        showAbilities={false}
                      />
                      <div className="text-center mt-2 text-sm">
                        <span className={`font-medium ${monster.hp <= 0 ? 'text-red-500' : 'text-gray-600'}`}>
                          {monster.hp <= 0 ? 'Fainted' : 'Ready'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Battle Log */}
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Battle Log</h3>
          <div className="h-40 overflow-y-auto bg-white p-3 rounded border">
            {battleLog.length === 0 ? (
              <p className="text-gray-500 italic">Battle will begin soon...</p>
            ) : (
              battleLog.map((log, index) => (
                <p key={index} className="mb-1 text-sm">{log}</p>
              ))
            )}
          </div>
        </div>

        {/* Turn Status */}
        <div className="text-center">
          {battleEnded ? (
            <div>
              <p className="text-2xl font-bold mb-4">
                {winner === 'player' ? '🎉 Victory! 🎉' : '💀 Defeat 💀'}
              </p>
              <Button onClick={resetBattle} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                New Battle
              </Button>
            </div>
          ) : needsToSwap ? (
            <p className="text-lg font-semibold text-red-600">
              Your monster is down! Choose a replacement from your bench!
            </p>
          ) : (
            <p className="text-lg font-semibold">
              {turn === 'player'
                ? "Your Turn - Attack or Swap!"
                : `${activeAiMonster.name} is thinking...`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default BattleArena;
