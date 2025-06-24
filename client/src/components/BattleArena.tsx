import React, { useState } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';

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
  level: number; // Added level property
}

interface UserMonster {
  id: number;
  user_id: number;
  monster_id: number;
  monster: Monster;
  level: number; // Added level property
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

interface BattleState {
  turn: 'player' | 'ai';
  phase: 'select' | 'animating' | 'processing';
  playerMonster: Monster;
  aiMonster: Monster;
  battleLog: string[];
  battleEnded: boolean;
  winner?: 'player' | 'ai';
}

const BattleArena: React.FC = () => {
  const [battleMode, setBattleMode] = useState<'team-select' | 'combat'>('team-select');
  const [playerMonster, setPlayerMonster] = useState<UserMonster | null>(null);
  const [aiMonster, setAiMonster] = useState<Monster | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [aiMonsterAbilities, setAiMonsterAbilities] = useState<Ability[]>([]);

  const getAffinityMultiplier = (
    attackAffinity: string,
    defenderResistances: string[],
    defenderWeaknesses: string[]
  ): number => {
    // Convert to lowercase for case-insensitive comparison
    const attackAffinityLower = attackAffinity.toLowerCase();
    const resistancesLower = defenderResistances?.map(r => r.toLowerCase()) || [];
    const weaknessesLower = defenderWeaknesses?.map(w => w.toLowerCase()) || [];

    // Check for weakness (2x damage)
    if (weaknessesLower.includes(attackAffinityLower)) {
      return 2.0;
    }

    // Check for resistance (0.5x damage)
    if (resistancesLower.includes(attackAffinityLower)) {
      return 0.5;
    }

    // Normal effectiveness (1x damage)
    return 1.0;
  };

  const calculateDamage = (
    attackingMonster: Monster,
    defendingMonster: Monster,
    ability: Ability
  ): DamageResult => {
    // Determine which stat to use for scaling
    const scalingStat = ability.scaling_stat === 'DEFENSE'
      ? attackingMonster.defense
      : attackingMonster.power;

    // Base damage calculation using ability's power multiplier
    let baseDamage = scalingStat * ability.power_multiplier;

    // Add random variance (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    baseDamage *= variance;

    // Apply affinity multiplier using real monster resistances and weaknesses
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defendingMonster.resistances, defendingMonster.weaknesses);
    baseDamage *= affinityMultiplier;

    // Apply defense reduction (30%)
    baseDamage *= 0.7;

    // Check for critical hit (base 5% + ability modifier)
    const critChance = 0.05 + (ability.crit_chance_modifier || 0);
    const isCritical = Math.random() < critChance;

    if (isCritical) {
      baseDamage *= 1.5;
    }

    const finalDamage = Math.round(Math.max(1, baseDamage));

    // Check for status effect application
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

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    if (!selectedTeam || selectedTeam.length === 0) {
      console.error("handleBattleStart called with no selected team.");
      // We can add a user-facing error message here later if we want.
      return;
    }

    try {
      // Set the first monster from the selected team as player monster
      setPlayerMonster(selectedTeam[0]);

      // Set the AI monster from the generated opponent
      setAiMonster(generatedOpponent.scaledMonsters[0].monster);

      // Fetch AI monster abilities
      const aiAbilitiesResponse = await fetch(`/api/monster-abilities/${generatedOpponent.scaledMonsters[0].monster.id}`);
      const aiAbilities = await aiAbilitiesResponse.json();
      setAiMonsterAbilities(aiAbilities);

      // Initialize battle state - FIXED VERSION with level property included
      setBattleState({
        turn: 'player',
        phase: 'select',
        playerMonster: {
          ...selectedTeam[0].monster,
          hp: selectedTeam[0].hp,
          max_hp: selectedTeam[0].maxHp,
          mp: selectedTeam[0].mp,
          max_mp: selectedTeam[0].maxMp,
          power: selectedTeam[0].power,
          defense: selectedTeam[0].defense,
          speed: selectedTeam[0].speed,
          level: selectedTeam[0].level // Include the level
        },
        aiMonster: {
          ...generatedOpponent.scaledMonsters[0].monster,
          hp: generatedOpponent.scaledMonsters[0].hp,
          max_hp: generatedOpponent.scaledMonsters[0].hp,
          mp: generatedOpponent.scaledMonsters[0].mp,
          max_mp: generatedOpponent.scaledMonsters[0].mp,
          power: generatedOpponent.scaledMonsters[0].monster.basePower,
          defense: generatedOpponent.scaledMonsters[0].monster.baseDefense,
          speed: generatedOpponent.scaledMonsters[0].monster.baseSpeed,
          level: generatedOpponent.scaledMonsters[0].level // Include the level
        },
        battleLog: [`Battle begins! ${selectedTeam[0].monster.name} (Lv.${selectedTeam[0].level}) vs ${generatedOpponent.scaledMonsters[0].monster.name} (Lv.${generatedOpponent.scaledMonsters[0].level})!`],
        battleEnded: false
      });

      // Switch to combat mode
      setBattleMode('combat');

    } catch (error) {
      console.error('Error starting battle:', error);
    }
  };

  // Refactored onAbilityClick handler - now receives full ability object
  const onAbilityClick = async (ability: Ability) => {
    if (!playerMonster || !aiMonster || !battleState || battleState.turn !== 'player' || battleState.phase !== 'select') return;

    // Check if player has enough MP
    if (battleState.playerMonster.mp < ability.mp_cost) {
      setBattleState(prev => prev ? {
        ...prev,
        battleLog: [...prev.battleLog, `${playerMonster.monster.name} doesn't have enough MP to use ${ability.name}!`]
      } : prev);
      return;
    }

    // Deduct MP cost and update battle state
    const updatedPlayerMonster = {
      ...battleState.playerMonster,
      mp: battleState.playerMonster.mp - ability.mp_cost
    };

    // Calculate damage using the full ability object
    const damageResult = calculateDamage(updatedPlayerMonster, battleState.aiMonster, ability);

    // Apply damage to AI monster
    const newAiHp = Math.max(0, battleState.aiMonster.hp - damageResult.damage);
    const updatedAiMonster = {
      ...battleState.aiMonster,
      hp: newAiHp,
      is_fainted: newAiHp === 0
    };

    // Build battle log message
    let logMessage = `${playerMonster.monster.name} used ${ability.name}! `;

    if (damageResult.isCritical) {
      logMessage += "A Critical Hit! ";
    }

    logMessage += `Dealt ${damageResult.damage} damage to ${battleState.aiMonster.name}.`;

    const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
    if (effectivenessMsg) {
      logMessage += ` ${effectivenessMsg}`;
    }

    // Handle status effect application
    if (damageResult.statusEffect) {
      logMessage += ` ${battleState.aiMonster.name} is now affected by ${damageResult.statusEffect.effectName}!`;
    }

    // Update battle state
    setBattleState(prev => prev ? {
      ...prev,
      playerMonster: updatedPlayerMonster,
      aiMonster: updatedAiMonster,
      battleLog: [...prev.battleLog, logMessage],
      turn: 'ai',
      phase: 'processing'
    } : prev);

    // Check if AI monster is defeated
    if (updatedAiMonster.is_fainted) {
      setBattleState(prev => prev ? {
        ...prev,
        battleLog: [...prev.battleLog, `${battleState.aiMonster.name} has been defeated! You win!`],
        battleEnded: true,
        winner: 'player'
      } : prev);
      return;
    }

    // AI counter-attack with delay
    setTimeout(() => {
      if (aiMonsterAbilities.length > 0 && battleState) {
        // AI selects a random ability it can afford
        const affordableAbilities = aiMonsterAbilities.filter(
          ability => ability.ability_type === 'ACTIVE' && updatedAiMonster.mp >= ability.mp_cost
        );

        const selectedAbility = affordableAbilities.length > 0
          ? affordableAbilities[Math.floor(Math.random() * affordableAbilities.length)]
          : aiMonsterAbilities[0]; // Fallback to first ability if none affordable

        // Deduct AI MP cost
        const updatedAiMonsterWithMp = {
          ...updatedAiMonster,
          mp: Math.max(0, updatedAiMonster.mp - selectedAbility.mp_cost)
        };

        // Calculate AI damage using full ability object
        const aiDamageResult = calculateDamage(updatedAiMonsterWithMp, updatedPlayerMonster, selectedAbility);

        // Apply damage to player monster
        const newPlayerHp = Math.max(0, updatedPlayerMonster.hp - aiDamageResult.damage);
        const finalPlayerMonster = {
          ...updatedPlayerMonster,
          hp: newPlayerHp,
          is_fainted: newPlayerHp === 0
        };

        // Build AI attack log message
        let aiLogMessage = `${updatedAiMonsterWithMp.name} used ${selectedAbility.name}! `;

        if (aiDamageResult.isCritical) {
          aiLogMessage += "A Critical Hit! ";
        }

        aiLogMessage += `Dealt ${aiDamageResult.damage} damage to ${playerMonster.monster.name}.`;

        const aiEffectivenessMsg = getEffectivenessMessage(aiDamageResult.affinityMultiplier);
        if (aiEffectivenessMsg) {
          aiLogMessage += ` ${aiEffectivenessMsg}`;
        }

        // Handle AI status effect application
        if (aiDamageResult.statusEffect) {
          aiLogMessage += ` ${playerMonster.monster.name} is now affected by ${aiDamageResult.statusEffect.effectName}!`;
        }

        setBattleState(prev => prev ? {
          ...prev,
          playerMonster: finalPlayerMonster,
          aiMonster: updatedAiMonsterWithMp,
          battleLog: [...prev.battleLog, aiLogMessage],
          turn: 'player',
          phase: 'select'
        } : prev);

        // Check if player monster is defeated
        if (finalPlayerMonster.is_fainted) {
          setBattleState(prev => prev ? {
            ...prev,
            battleLog: [...prev.battleLog, `${playerMonster.monster.name} has been defeated! You lose!`],
            battleEnded: true,
            winner: 'ai'
          } : prev);
          return;
        }
      }
    }, 2000);
  };

  const resetBattle = () => {
    setBattleMode('team-select');
    setPlayerMonster(null);
    setAiMonster(null);
    setBattleState(null);
    setAiMonsterAbilities([]);
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

  // Combat view
  if (!playerMonster || !aiMonster || !battleState) {
    return <div className="flex justify-center items-center h-64">Loading battle...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Your Monster</h2>
          <MonsterCard
            monster={playerMonster.monster}
            onAbilityClick={onAbilityClick}
            battleMode={true}
            isPlayerTurn={battleState.turn === 'player' && battleState.phase === 'select'}
            battleMp={battleState.playerMonster.mp}
            battleHp={battleState.playerMonster.hp}
          />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Opponent</h2>
          <MonsterCard
            monster={aiMonster}
            onAbilityClick={() => {}}
            showAbilities={true}
            battleHp={battleState.aiMonster.hp}
          />
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2">Battle Log</h3>
        <div className="h-40 overflow-y-auto bg-white p-3 rounded border">
          {battleState.battleLog.length === 0 ? (
            <p className="text-gray-500 italic">Battle will begin when you select an ability...</p>
          ) : (
            battleState.battleLog.map((log, index) => (
              <p key={index} className="mb-1 text-sm">{log}</p>
            ))
          )}
        </div>
      </div>

      <div className="text-center">
        {battleState.battleEnded ? (
          <button
            onClick={resetBattle}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            New Battle
          </button>
        ) : (
          <p className="text-lg font-semibold">
            {battleState.turn === 'player' && battleState.phase === 'select'
              ? "Your Turn - Select an ability!"
              : "Opponent's turn..."}
          </p>
        )}
      </div>
    </div>
  );
};

export default BattleArena;
