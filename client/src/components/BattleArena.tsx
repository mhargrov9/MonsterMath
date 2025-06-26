import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
// FIX: Corrected the import path to point to the file with the named export
import { BattleTeamSelector } from './MonsterLab';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// --- (Interfaces are unchanged) ---
interface Monster {
  id: number; name: string; hp: number; max_hp: number; power: number; defense: number; speed: number; mp: number; max_mp: number; affinity: string; image_url?: string; is_fainted: boolean; resistances: string[]; weaknesses: string[]; level: number;
}
interface UserMonster {
  id: number; user_id: number; monster_id: number; monster: Monster; level: number; hp: number; maxHp: number; mp: number; maxMp: number; power: number; defense: number; speed: number;
}
interface Ability {
  id: number; name: string; description: string; ability_type: string; mp_cost: number; affinity: string; power_multiplier: number; scaling_stat?: string; healing_power?: number; target?: string; min_hits?: number; max_hits?: number; status_effect_applies?: string; status_effect_chance?: number; status_effect_duration?: number; status_effect_value?: number; status_effect_value_type?: string; status_effect_trigger_affinity?: string; priority?: number; crit_chance_modifier?: number; lifesteal_percent?: number; target_stat_modifier?: string; stat_modifier_value?: number; stat_modifier_duration?: number;
}
interface StatusEffect {
  effectName: string; duration: number; value: number; valueType: string;
}
interface ActiveStatusEffect {
  name: string;
  duration: number;
  value: number; 
}
interface DamageResult {
  damage: number; isCritical: boolean; affinityMultiplier: number; statusEffect?: StatusEffect;
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
  const [playerStatusEffects, setPlayerStatusEffects] = useState<Map<number, ActiveStatusEffect[]>>(new Map());
  const [aiStatusEffects, setAiStatusEffects] = useState<Map<number, ActiveStatusEffect[]>>(new Map());

  // FIX: Added a handler to receive data from BattleTeamSelector
  const handleBattleStart = (selectedMonsters: UserMonster[], opponentTeam: any) => {
    setPlayerTeam(selectedMonsters);
    setAiTeam(opponentTeam.monsters);
    setAiMonsterAbilities(opponentTeam.abilities);
    setBattleMode('combat'); 
    // Determine who goes first based on speed
    const playerSpeed = selectedMonsters[0]?.speed ?? 0;
    const aiSpeed = opponentTeam.monsters[0]?.speed ?? 0;
    setTurn(playerSpeed >= aiSpeed ? 'player' : 'ai');
    setBattleLog([`Battle begins! ${selectedMonsters[0].monster.name} vs. ${opponentTeam.monsters[0].name}!`]);
  };

  const getAffinityMultiplier = (attackAffinity: string, defenderResistances: string[], defenderWeaknesses: string[]): number => {
    const attackAffinityLower = attackAffinity.toLowerCase();
    const resistancesLower = defenderResistances?.map(r => r.toLowerCase()) || [];
    const weaknessesLower = defenderWeaknesses?.map(w => w.toLowerCase()) || [];
    if (weaknessesLower.includes(attackAffinityLower)) return 2.0;
    if (resistancesLower.includes(attackAffinityLower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attackingMonster: Monster | UserMonster, defendingMonster: Monster | UserMonster, ability: Ability): DamageResult => {
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

  const decideAiAction = (): { action: 'attack'; ability: Ability | null } | { action: 'swap'; newIndex: number } => {
    // This is a placeholder for more complex AI logic
    const activeAiMonster = aiTeam[activeAiIndex];
    const availableAbilities = (aiMonsterAbilities[activeAiMonster.id] || []).filter(a => a.mp_cost <= activeAiMonster.mp);
    if (availableAbilities.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableAbilities.length);
        return { action: 'attack', ability: availableAbilities[randomIndex] };
    }
    // Fallback if no abilities are usable
    return { action: 'attack', ability: null };
  };

  const processEndOfTurnEffects = (whoseTurnEnded: 'player' | 'ai') => {
    let newLogMessages: string[] = [];
    if (whoseTurnEnded === 'player') {
      const activePlayerMonster = playerTeam[activePlayerIndex];
      const effects = playerStatusEffects.get(activePlayerMonster.id) || [];
      if (effects.length > 0) {
        let totalDamage = 0;
        const remainingEffects = effects.map(effect => {
          if (effect.name.toLowerCase() === 'burn' || effect.name.toLowerCase() === 'poison') {
            const dotDamage = Math.round(activePlayerMonster.maxHp * effect.value);
            totalDamage += dotDamage;
            newLogMessages.push(`${activePlayerMonster.monster.name} is hurt by ${effect.name}! It took ${dotDamage} damage.`);
          }
          return { ...effect, duration: effect.duration - 1 };
        }).filter(effect => effect.duration > 0);

        if (totalDamage > 0) {
            const newHp = Math.max(0, activePlayerMonster.hp - totalDamage);
            setPlayerTeam(prev => prev.map((m, i) => i === activePlayerIndex ? { ...m, hp: newHp } : m));
        }
        setPlayerStatusEffects(prev => {
            const newMap = new Map(prev);
            if (remainingEffects.length > 0) newMap.set(activePlayerMonster.id, remainingEffects);
            else newMap.delete(activePlayerMonster.id);
            return newMap;
        });
      }
    } else { // AI's turn ended
      const activeAiMonster = aiTeam[activeAiIndex];
      const effects = aiStatusEffects.get(activeAiMonster.id) || [];
      if (effects.length > 0) {
        let totalDamage = 0;
        const remainingEffects = effects.map(effect => {
          if (effect.name.toLowerCase() === 'burn' || effect.name.toLowerCase() === 'poison') {
            const dotDamage = Math.round(activeAiMonster.max_hp * effect.value);
            totalDamage += dotDamage;
            newLogMessages.push(`${activeAiMonster.name} is hurt by ${effect.name}! It took ${dotDamage} damage.`);
          }
          return { ...effect, duration: effect.duration - 1 };
        }).filter(effect => effect.duration > 0);

        if (totalDamage > 0) {
            const newHp = Math.max(0, activeAiMonster.hp - totalDamage);
            setAiTeam(prev => prev.map((m, i) => i === activeAiIndex ? { ...m, hp: newHp } : m));
        }
        setAiStatusEffects(prev => {
            const newMap = new Map(prev);
            if (remainingEffects.length > 0) newMap.set(activeAiMonster.id, remainingEffects);
            else newMap.delete(activeAiMonster.id);
            return newMap;
        });
      }
    }
    if (newLogMessages.length > 0) {
        setBattleLog(prev => [...prev, ...newLogMessages]);
    }
  };

  const handlePlayerAbility = async (ability: Ability) => {
    if (turn !== 'player' || battleEnded) return;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];

    const playerEffects = playerStatusEffects.get(activePlayerMonster.id) || [];
    for (const effect of playerEffects) {
      if (effect.name.toLowerCase() === 'drowsiness' || effect.name.toLowerCase() === 'paralysis' || effect.name.toLowerCase() === 'frozen') {
        if (Math.random() < effect.value) {
          setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} is ${effect.name} and couldn't move!`]);
          processEndOfTurnEffects('player');
          setTurn('ai');
          return;
        }
      }
    }

    if (activePlayerMonster.mp < ability.mp_cost) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} doesn't have enough MP!`]);
      return;
    }

    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = { ...activePlayerMonster, mp: activePlayerMonster.mp - ability.mp_cost };
    setPlayerTeam(updatedPlayerTeam);
    const damageResult = calculateDamage(activePlayerMonster, activeAiMonster, ability);
    const newAiHp = Math.max(0, activeAiMonster.hp - damageResult.damage);
    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = { ...activeAiMonster, hp: newAiHp, is_fainted: newAiHp === 0 };
    setAiTeam(updatedAiTeam);
    let logMessage = `${activePlayerMonster.monster.name} used ${ability.name}! `;
    if (damageResult.isCritical) logMessage += "A Critical Hit! ";
    logMessage += `Dealt ${damageResult.damage} damage to ${activeAiMonster.name}.`;
    const effectivenessMsg = getEffectivenessMessage(damageResult.affinityMultiplier);
    if (effectivenessMsg) logMessage += ` ${effectivenessMsg}`;

    if (damageResult.statusEffect) {
      logMessage += ` ${activeAiMonster.name} is now affected by ${damageResult.statusEffect.effectName}!`;
      setAiStatusEffects(prev => {
        const newEffects = new Map(prev);
        const existingEffects = newEffects.get(activeAiMonster.id) || [];
        const newEffect: ActiveStatusEffect = { name: damageResult.statusEffect!.effectName, duration: damageResult.statusEffect!.duration, value: damageResult.statusEffect!.value };
        newEffects.set(activeAiMonster.id, [...existingEffects, newEffect]);
        return newEffects;
      });
    }
    setBattleLog(prev => [...prev, logMessage]);

    if (newAiHp === 0) {
      setBattleLog(prev => [...prev, `${activeAiMonster.name} has been defeated!`]);
      const remainingAiMonsters = updatedAiTeam.filter(monster => monster.hp > 0);
      if (remainingAiMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You win the battle!"]); setBattleEnded(true); setWinner('player'); return;
      } else {
        const nextAiIndex = updatedAiTeam.findIndex(monster => monster.hp > 0);
        setActiveAiIndex(nextAiIndex);
        setBattleLog(prev => [...prev, `Your opponent sends out ${updatedAiTeam[nextAiIndex].name}!`]);
      }
    }
    processEndOfTurnEffects('player');
    setTurn('ai');
  };

  const handleAiAbility = () => {
    if (battleEnded) return;
    const activeAiMonster = aiTeam[activeAiIndex];
    const activePlayerMonster = playerTeam[activePlayerIndex];

    const aiEffects = aiStatusEffects.get(activeAiMonster.id) || [];
    for (const effect of aiEffects) {
      if (effect.name.toLowerCase() === 'drowsiness' || effect.name.toLowerCase() === 'paralysis' || effect.name.toLowerCase() === 'frozen') {
        if (Math.random() < effect.value) {
          setBattleLog(prev => [...prev, `${activeAiMonster.name} is ${effect.name} and couldn't move!`]);
          processEndOfTurnEffects('ai');
          setTurn('player');
          return;
        }
      }
    }

    const action = decideAiAction();
    if (action.action === 'swap') {
        setActiveAiIndex(action.newIndex);
        setBattleLog(prev => [...prev, `The opponent withdraws ${activeAiMonster.name} and sends out ${aiTeam[action.newIndex].name}!`]);
        processEndOfTurnEffects('ai'); 
        setTurn('player');
        return;
    }
    const selectedAbility = action.ability;
    if (!selectedAbility) {
        setBattleLog(prev => [...prev, `${activeAiMonster.name} couldn't find a move to use!`]);
        processEndOfTurnEffects('ai');
        setTurn('player');
        return;
    }

    const updatedAiTeam = [...aiTeam];
    updatedAiTeam[activeAiIndex] = { ...activeAiMonster, mp: Math.max(0, activeAiMonster.mp - selectedAbility.mp_cost) };
    setAiTeam(updatedAiTeam);
    const aiDamageResult = calculateDamage(activeAiMonster, activePlayerMonster, selectedAbility);
    const newPlayerHp = Math.max(0, activePlayerMonster.hp - aiDamageResult.damage);
    const updatedPlayerTeam = [...playerTeam];
    updatedPlayerTeam[activePlayerIndex] = { ...activePlayerMonster, hp: newPlayerHp };
    setPlayerTeam(updatedPlayerTeam);
    let aiLogMessage = `${activeAiMonster.name} used ${selectedAbility.name}! `;
    if (aiDamageResult.isCritical) aiLogMessage += "A Critical Hit! ";
    aiLogMessage += `Dealt ${aiDamageResult.damage} damage to ${activePlayerMonster.monster.name}.`;
    const aiEffectivenessMsg = getEffectivenessMessage(aiDamageResult.affinityMultiplier);
    if (aiEffectivenessMsg) aiLogMessage += ` ${aiEffectivenessMsg}`;

    if (aiDamageResult.statusEffect) {
      aiLogMessage += ` ${activePlayerMonster.monster.name} is now affected by ${aiDamageResult.statusEffect.effectName}!`;
      setPlayerStatusEffects(prev => {
        const newEffects = new Map(prev);
        const existingEffects = newEffects.get(activePlayerMonster.id) || [];
        const newEffect: ActiveStatusEffect = { name: aiDamageResult.statusEffect!.effectName, duration: aiDamageResult.statusEffect!.duration, value: aiDamageResult.statusEffect!.value };
        newEffects.set(activePlayerMonster.id, [...existingEffects, newEffect]);
        return newEffects;
      });
    }
    setBattleLog(prev => [...prev, aiLogMessage]);

    if (newPlayerHp === 0) {
      setBattleLog(prev => [...prev, `${activePlayerMonster.monster.name} has been defeated!`]);
      const remainingPlayerMonsters = updatedPlayerTeam.filter(monster => monster.hp > 0);
      if (remainingPlayerMonsters.length === 0) {
        setBattleLog(prev => [...prev, "You lose the battle!"]); setBattleEnded(true); setWinner('ai'); return;
      } else {
        setBattleLog(prev => [...prev, "Choose your next monster!"]);
        setTurn('player'); return;
      }
    }
    processEndOfTurnEffects('ai');
    setTurn('player');
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timer = setTimeout(() => {
        handleAiAbility();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded, activeAiIndex]);

  // FIX: This entire return block was missing.
  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      {battleMode === 'team-select' && (
        <BattleTeamSelector onBattleStart={handleBattleStart} />
      )}

      {battleMode === 'combat' && playerTeam.length > 0 && aiTeam.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* AI's Active Monster */}
            <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Opponent's Monster</h2>
                <div className="inline-block">
                    <MonsterCard monster={aiTeam[activeAiIndex]} size="medium" />
                </div>
            </div>

            {/* Player's Active Monster */}
            <div className="text-center mt-8">
                <h2 className="text-xl font-bold mb-2">Your Active Monster</h2>
                <div className="inline-block">
                   <MonsterCard 
                        monster={playerTeam[activePlayerIndex].monster}
                        userMonster={playerTeam[activePlayerIndex]}
                        size="medium" 
                        isActivePlayer={true}
                        onAbilityClick={handlePlayerAbility}
                        isTurn={turn === 'player'}
                    />
                </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Battle Log */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-2">Battle Log</h3>
                <div className="h-48 overflow-y-auto bg-gray-900 rounded p-2 text-sm">
                  {battleLog.map((msg, index) => (
                    <p key={index} className="mb-1">{msg}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Player's Bench */}
            <div>
              <h3 className="text-lg font-bold mb-2">Your Bench</h3>
              <div className="grid grid-cols-3 gap-2">
                {playerTeam.map((monster, index) => (
                  index !== activePlayerIndex && monster.hp > 0 && (
                     <div key={monster.id} className="cursor-pointer hover:scale-105 transition-transform" onClick={() => {
                        if (turn === 'player') {
                           setActivePlayerIndex(index);
                           setBattleLog(prev => [...prev, `You withdraw ${playerTeam[activePlayerIndex].monster.name} and send out ${monster.monster.name}!`]);
                           processEndOfTurnEffects('player');
                           setTurn('ai');
                        }
                     }}>
                        <MonsterCard monster={monster.monster} userMonster={monster} size="tiny"/>
                     </div>
                  )
                ))}
              </div>
            </div>

             {/* Battle End Screen */}
            {battleEnded && (
                <div className="text-center p-4 bg-gray-800 rounded-lg">
                    <h2 className="text-3xl font-bold">{winner === 'player' ? 'You Won!' : 'You Were Defeated!'}</h2>
                    <Button onClick={() => setBattleMode('team-select')} className="mt-4">Play Again</Button>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleArena;