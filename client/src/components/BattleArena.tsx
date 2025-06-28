import React, { useState, useEffect, useRef } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { CombatView } from './CombatView';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, StatModifier, ActiveEffect, DamageResult } from '@/types/game';

interface BattleArenaProps {
  onRetreat: () => void;
}

const useUser = () => {
    return useQuery<{ id: string, rank_xp: number }>({ queryKey: ['user'] }).data;
};

const BattleArena: React.FC<BattleArenaProps> = ({ onRetreat }) => {
  const queryClient = useQueryClient();
  const user = useUser();

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
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    const baseStat = 'monster' in monster ? monster[statName] : (monster as any)[statName] || 0;
    const effects = activeEffects.filter(e => e.targetMonsterId === monster.id && e.modifier.stat === statName);
    const flatVal = effects.filter(e => e.modifier.type === 'FLAT').reduce((s, e) => s + e.modifier.value, baseStat);
    return Math.round(effects.filter(e => e.modifier.type === 'PERCENTAGE').reduce((s, e) => s * (1 + e.modifier.value / 100), flatVal));
  };

  const getAffinityMultiplier = (attackAffinity: string, defender: Monster): number => {
    if (!attackAffinity) return 1.0;
    const lower = attackAffinity.toLowerCase();
    if (defender.weaknesses?.map(w => w.toLowerCase()).includes(lower)) return 2.0;
    if (defender.resistances?.map(r => r.toLowerCase()).includes(lower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => {
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attacker, scalingStatName);
    const defendingDefense = getModifiedStat(defender, 'defense');
    const attackPower = attackingPower * (ability.power_multiplier || 0.5);
    const damageMultiplier = 100 / (100 + defendingDefense);
    let rawDamage = attackPower * damageMultiplier;
    const defenderMonster = 'monster' in defender ? defender.monster : defender;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderMonster);
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

  const handlePassiveTriggers = (triggerType: Ability['activation_trigger'], targetMonster: UserMonster | Monster) => { /* ... */ };

  const endTurn = (currentTurn: 'player' | 'ai', pTeam: UserMonster[], aTeam: Monster[]) => {
    setPlayerTeam(pTeam);
    setAiTeam(aTeam);
    setTurn(currentTurn === 'player' ? 'ai' : 'player');
  };

  const handleBattleCompletion = async (winnerVal: 'player' | 'ai') => {
      setBattleEnded(true);
      setWinner(winnerVal);
      if (winnerVal === 'player' && user?.id) {
          const currentXp = user.rank_xp || 0;
          setBattleLog(prev => [...prev, `You are victorious! Gaining rank_xp...`]);
          const response = await apiRequest('/api/battle/complete', { method: 'POST', data: { winnerId: user.id } });
          if (response.ok) {
              const result = await response.json();
              setBattleLog(prev => [...prev, `Gained ${result.newXpTotal - currentXp} XP!`]);
              await queryClient.invalidateQueries({ queryKey: ['user'] });
          }
      }
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < ability.mp_cost) { setBattleLog(prev => [...prev, "Not enough MP!"]); return; }
    const defender = aiTeam[activeAiIndex];
    const damageResult = calculateDamage(attacker, defender, ability);
    const newLog = [`Your ${attacker.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`];
    if (damageResult.isCritical) newLog.push("A critical hit!");
    newLog.push(getEffectivenessMessage(damageResult.affinityMultiplier));
    const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
    const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m);
    setBattleLog(prev => [...prev, ...newLog.filter(Boolean)]);
    const defenderAfterHit = nextAiTeam[activeAiIndex];
    if (defenderAfterHit.hp <= 0) {
        setBattleLog(prev => [...prev, `Opponent's ${defenderAfterHit.name} has been defeated!`]);
        if (nextAiTeam.every(m => m.hp <= 0)) {
            handleBattleCompletion('player');
            setPlayerTeam(nextPlayerTeam);
            setAiTeam(nextAiTeam);
            return;
        }
    }
    endTurn('player', nextPlayerTeam, nextAiTeam);
  };

  const handleAiAbility = () => { /* ... Full AI Logic ... */ };

  const handleSwapMonster = (monsterId: number) => {
    if (turn !== 'player' || battleEnded) return;
    const newIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newIndex === -1 || newIndex === activePlayerIndex) return;
    const currentMonster = playerTeam[activePlayerIndex];
    const newMonster = playerTeam[newIndex];
    if (newMonster.hp <= 0) { setBattleLog(prev => [...prev, `${newMonster.monster.name} is too weak to battle!`]); return; }
    setBattleLog(prev => [...prev, `You withdrew ${currentMonster.monster.name} and sent out ${newMonster.monster.name}!`]);
    setActivePlayerIndex(newIndex);
    endTurn('player', playerTeam, aiTeam);
  };

  useEffect(() => { if (turn === 'ai' && !battleEnded) { const timer = setTimeout(handleAiAbility, 1500); return () => clearTimeout(timer); } }, [turn, battleEnded]);

  const handleBattleStart = (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);
    const aiMonsterIds = generatedOpponent.scaledMonsters.map((m: Monster) => m.id);
    const fetchAbilities = async () => {
        const abilitiesMap: Record<number, Ability[]> = {};
        await Promise.all(aiMonsterIds.map(async (id) => {
            const res = await fetch(`/api/monster-abilities/${id}`);
            if (res.ok) abilitiesMap[id] = await res.json();
        }));
        const aiTeamWithAbilities = generatedOpponent.scaledMonsters.map((m: Monster) => ({ ...m, abilities: abilitiesMap[m.id] || [] }));
        setPlayerTeam(selectedTeam);
        setAiTeam(aiTeamWithAbilities);
        setBattleLog([`Battle is about to begin! Select your starting monster.`]);
        setBattleMode('lead-select');
        setIsLoading(false);
    }
    fetchAbilities();
  };

  const selectLeadMonster = (index: number) => {
    const playerMonster = playerTeam[index];
    const aiMonster = aiTeam[Math.floor(Math.random() * aiTeam.length)];
    setActivePlayerIndex(index);
    setActiveAiIndex(aiTeam.indexOf(aiMonster));
    setBattleLog(prev => [...prev, `You send out ${playerMonster.monster.name}!`, `Opponent sends out ${aiMonster.name}!`]);
    setTurn(getModifiedStat(playerMonster, 'speed') >= getModifiedStat(aiMonster, 'speed') ? 'player' : 'ai');
    setBattleMode('combat');
  };

  const battleLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (battleLogRef.current) { battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight; } }, [battleLog]);

  if (battleMode === 'team-select') return <BattleTeamSelector onBattleStart={handleBattleStart} />;

  if (battleMode === 'lead-select') {
    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-8">Choose Your Lead Monster</h1>
            <div className="flex flex-wrap justify-center gap-6">
                {playerTeam.map((userMonster, index) => (
                    <div key={userMonster.id}>
                        <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" startExpanded={true} />
                        <Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>{userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}</Button>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  if (battleMode === 'combat') {
    if (isLoading || !playerTeam[activePlayerIndex] || !aiTeam[activeAiIndex]) return <div className="text-center p-8">Loading...</div>;

    return <CombatView 
        playerMonster={playerTeam[activePlayerIndex]}
        opponentMonster={aiTeam[activeAiIndex]}
        playerBench={playerTeam.filter((_, i) => i !== activePlayerIndex)}
        opponentBench={aiTeam.filter((_, i) => i !== activeAiIndex)}
        isPlayerTurn={turn === 'player' && !battleEnded}
        battleLog={battleLog}
        battleEnded={battleEnded}
        winner={winner}
        logRef={battleLogRef}
        onAbilityClick={handlePlayerAbility}
        onSwapMonster={handleSwapMonster}
        onRetreat={onRetreat}
        onPlayAgain={() => setBattleMode('team-select')}
    />;
  }

  return null;
};

// FIX: Changed to a default export
export default BattleArena;