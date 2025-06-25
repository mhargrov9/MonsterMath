import React, { useState, useEffect } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// --- TYPE DEFINITIONS ---
interface Monster {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  power: number;
  defense: number;
  speed: number;
  affinity: string;
  resistances: string[];
  weaknesses: string[];
  level: number;
  is_fainted: boolean;
  baseHp: number;
  baseMp: number;
  // Add other base stats if they exist on the flattened object
}

interface UserMonster {
  id: number;
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
  crit_chance_modifier?: number;
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

interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
  statusEffect?: StatusEffect;
}

// --- COMPONENT ---
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

  const addBattleLogMessage = (message: string) => {
    setBattleLog(prev => [...prev, message]);
  };

  const getAffinityMultiplier = (attackAffinity: string, defenderResistances: string[], defenderWeaknesses: string[]): number => {
    if (!attackAffinity || (!defenderResistances && !defenderWeaknesses)) return 1.0;
    const attackAffinityLower = attackAffinity.toLowerCase();
    const resistancesLower = defenderResistances?.map(r => r.toLowerCase()) || [];
    const weaknessesLower = defenderWeaknesses?.map(w => w.toLowerCase()) || [];
    if (weaknessesLower.includes(attackAffinityLower)) return 2.0;
    if (resistancesLower.includes(attackAffinityLower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attackingMonster: UserMonster | Monster, defendingMonster: UserMonster | Monster, ability: Ability): DamageResult => {
    const attackerPower = 'monster' in attackingMonster ? attackingMonster.power : attackingMonster.power;
    const defenderDefense = 'monster' in defendingMonster ? defendingMonster.defense : defendingMonster.defense;
    const defenderResistances = 'monster' in defendingMonster ? defendingMonster.monster.resistances : defendingMonster.resistances;
    const defenderWeaknesses = 'monster' in defendingMonster ? defendingMonster.monster.weaknesses : defendingMonster.weaknesses;
    const attackPower = (attackerPower + 50) * ability.power_multiplier;
    let rawDamage = attackPower - defenderDefense;
    rawDamage = Math.max(rawDamage, attackPower * 0.1);
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

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => { /* Function body unchanged */ };
  const selectLeadMonster = (index: number) => { /* Function body unchanged */ };
  const determineFirstTurn = (playerMonster: UserMonster, aiMonster: Monster) => { /* Function body unchanged */ };
  const handlePlayerAbility = async (ability: Ability) => { /* Function body unchanged */ };
  const handleSwapMonster = (newIndex: number) => { /* Function body unchanged */ };
  const handleAiAbility = () => { /* Function body unchanged */ };
  const resetBattle = () => { /* Function body unchanged */ };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timeout = setTimeout(() => handleAiAbility(), 1500);
      return () => clearTimeout(timeout);
    }
  }, [turn, battleEnded]);

  if (battleMode === 'team-select') {
    return <div className="max-w-6xl mx-auto p-6"><h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1><BattleTeamSelector onBattleStart={handleBattleStart} /></div>;
  }

  if (battleMode === 'lead-select') { /* Omitted for brevity */ }

  if (battleMode === 'combat') {
    if (isLoading || !playerTeam.length || !aiTeam.length) return <div className="text-center p-8">Loading battle...</div>;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];
    if (!activePlayerMonster || !activeAiMonster) return <div className="text-center p-8">Setting up combatants...</div>;

    const benchedMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const aiBenchedMonsters = aiTeam.filter((_, index) => index !== activeAiIndex);
    const needsToSwap = activePlayerMonster.hp <= 0 && playerTeam.some(monster => monster.hp > 0);

    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Battle Arena</h1>
        {/* Active Monsters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Your Active Monster</h2>
            <MonsterCard monster={activePlayerMonster.monster} userMonster={activePlayerMonster} onAbilityClick={handlePlayerAbility} isPlayerTurn={turn === 'player' && !needsToSwap} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-400">Opponent's Active Monster</h2>
            <MonsterCard monster={activeAiMonster} onAbilityClick={() => {}} showAbilities={true} />
          </div>
        </div>

        {/* Benches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Player's Bench */}
            {benchedMonsters.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">Your Bench</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {benchedMonsters.map((monster, benchIndex) => {
                    const originalIndex = playerTeam.findIndex(m => m.id === monster.id);
                    return (<Card key={monster.id} className="cursor-pointer hover:shadow-lg"><CardContent className="p-2"><MonsterCard monster={monster.monster} userMonster={monster} size="small" /><Button onClick={() => handleSwapMonster(originalIndex)} className="w-full mt-2" size="sm" disabled={turn !== 'player' || monster.hp <= 0 || battleEnded} variant={needsToSwap && monster.hp > 0 ? "default" : "outline"}>{monster.hp <= 0 ? 'Fainted' : needsToSwap ? 'Send Out!' : 'Swap In'}</Button></CardContent></Card>);
                  })}
                </div>
              </div>
            )}
            {/* Opponent's Bench */}
            {aiBenchedMonsters.length > 0 && (
                <div className="mt-0 md:mt-0"> {/* Adjusted margin for alignment */}
                    <h3 className="text-lg font-semibold mb-4 text-center">Opponent's Bench</h3>
                    <div className="flex justify-center items-start gap-2 flex-wrap">
                        {aiBenchedMonsters.map(monster => (
                            <div key={monster.id} className="opacity-70"><MonsterCard monster={monster} size="tiny" showAbilities={false} /></div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Battle Log & Turn Status */}
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Battle Log</h3>
          <div className="h-40 overflow-y-auto bg-gray-900/75 p-3 rounded border border-gray-700">{battleLog.map((log, index) => (<p key={index} className="mb-1 text-sm">{log}</p>))}</div>
        </div>
        <div className="text-center mt-4">
          {battleEnded ? (<div><p className="text-2xl font-bold mb-4">{winner === 'player' ? '🎉 Victory! 🎉' : '💀 Defeat 💀'}</p><Button onClick={resetBattle}>New Battle</Button></div>) : needsToSwap ? (<p className="text-lg font-semibold text-yellow-400">Your monster is down! Choose a replacement!</p>) : (<p className="text-lg font-semibold">{turn === 'player' ? "Your Turn - Attack or Swap!" : `${activeAiMonster.name} is thinking...`}</p>)}
        </div>
      </div>
    );
  }

  return null;
};

export default BattleArena;