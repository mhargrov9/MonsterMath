import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, ActiveEffect, DamageResult, FloatingText } from '@/types/game';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';

interface BattleArenaProps {
  onRetreat: () => void;
}

const useUser = () => {
    return useQuery<{ id: string; rank_xp: number }>({ queryKey: ['/api/auth/user'] }).data;
};

export default function BattleArena({ onRetreat }: BattleArenaProps) {
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
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const addFloatingText = (text: string, type: 'damage' | 'heal' | 'crit', targetId: number, isPlayerTarget: boolean) => {
    const newText: FloatingText = {
      id: Date.now() + Math.random(),
      text,
      type,
      targetId,
      isPlayerTarget,
    };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
    }, 1500);
  };

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    const baseStat = 'monster' in monster ? monster[statName] : (monster as any)[statName] || 0;
    const effects = activeEffects.filter(e => e.targetMonsterId === monster.id && e.modifier.stat === statName);
    const flatVal = effects.filter(e => e.modifier.type === 'FLAT').reduce((s, e) => s + e.modifier.value, baseStat);
    return Math.round(effects.filter(e => e.modifier.type === 'PERCENTAGE').reduce((s, e) => s * (1 + e.modifier.value / 100), flatVal));
  };

  const getAffinityMultiplier = (attackAffinity: string | undefined, defender: Monster): number => {
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
    const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
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

  const handleBattleCompletion = async (winnerVal: 'player' | 'ai') => {
    setBattleLog(prev => [...prev, `--- BATTLE OVER ---`]);
    setBattleEnded(true);
    setWinner(winnerVal);
    if (winnerVal === 'player' && user?.id) {
        setBattleLog(prev => [...prev, `You are victorious! Gaining rank_xp...`]);
        const response = await apiRequest('/api/battle/complete', { method: 'POST', data: { winnerId: user.id } });
        if (response.ok) {
            const result = await response.json();
            const xpGained = result.newXpTotal - (user.rank_xp || 0);
            setBattleLog(prev => [...prev, `Gained ${xpGained} XP!`]);
            await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        }
    }
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]);
        return;
    }
    const defender = aiTeam[activeAiIndex];
    const damageResult = calculateDamage(attacker, defender, ability);
    addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, false);
    if(damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id, false);
    const newLog = [`Your ${attacker.monster.name} used ${ability.name}!`];
    if (damageResult.isCritical) newLog.push("A critical hit!");
    newLog.push(getEffectivenessMessage(damageResult.affinityMultiplier));
    const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
    const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
    setBattleLog(prev => [...prev, ...newLog.filter(Boolean)]);
    if (nextAiTeam[activeAiIndex].hp <= 0) {
        setBattleLog(prev => [...prev, `Opponent's ${nextAiTeam[activeAiIndex].name} has been defeated!`]);
        if (nextAiTeam.every(m => m.hp <= 0)) {
            handleBattleCompletion('player');
        }
    }
    setPlayerTeam(nextPlayerTeam);
    setAiTeam(nextAiTeam);
    setTurn('ai');
  };

  const handleAiAbility = () => {
    if (battleEnded) return;
    let activeAi = aiTeam[activeAiIndex];
    if (activeAi.hp <= 0) {
        const nextIndex = aiTeam.findIndex(m => m.hp > 0);
        if (nextIndex !== -1) {
            setActiveAiIndex(nextIndex);
            activeAi = aiTeam[nextIndex];
            setBattleLog(prev => [...prev, `Opponent sends out ${activeAi.name}!`]);
        } else {
            handleBattleCompletion('player');
            return;
        }
    }
    const usableAbilities = activeAi.abilities?.filter(a => a.ability_type === 'ACTIVE' && (a.mp_cost || 0) <= activeAi.mp) || [];
    if (usableAbilities.length === 0) {
        setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} is out of moves!`]);
        setTurn('player');
        return;
    }
    const ability = usableAbilities[Math.floor(Math.random() * usableAbilities.length)];
    const defender = playerTeam[activePlayerIndex];
    const damageResult = calculateDamage(activeAi, defender, ability);
    addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, true);
     if(damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id, true);
    const newLog = [`Opponent's ${activeAi.name} used ${ability.name}!`];
    if (damageResult.isCritical) newLog.push("A critical hit!");
    newLog.push(getEffectivenessMessage(damageResult.affinityMultiplier));
    const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
    const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
    setBattleLog(prev => [...prev, ...newLog.filter(Boolean)]);
    if (nextPlayerTeam[activePlayerIndex].hp <= 0) {
        setBattleLog(prev => [...prev, `Your ${nextPlayerTeam[activePlayerIndex].monster.name} has been defeated!`]);
        if (nextPlayerTeam.every(m => m.hp <= 0)) {
            handleBattleCompletion('ai');
        }
    }
    setPlayerTeam(nextPlayerTeam);
    setAiTeam(nextAiTeam);
    setTurn('player');
  };

  const handleSwapMonster = (monsterId: number) => {
    if (turn !== 'player' || battleEnded) return;
    const newIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newIndex === -1 || newIndex === activePlayerIndex) return;
    const currentMonster = playerTeam[activePlayerIndex];
    const newMonster = playerTeam[newIndex];
    if (newMonster.hp <= 0) {
        setBattleLog(prev => [...prev, `${newMonster.monster.name} is too weak to battle!`]);
        return;
    }
    setBattleLog(prev => [...prev, `You withdrew ${currentMonster.monster.name} and sent out ${newMonster.monster.name}!`]);
    setActivePlayerIndex(newIndex);
    setTurn('ai');
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timer = setTimeout(handleAiAbility, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded, activeAiIndex, playerTeam]);

  const handleBattleStart = (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setBattleLog([]); setIsLoading(true); setBattleEnded(false); setWinner(null); setActiveEffects([]); setFloatingTexts([]);
    const playerTeamWithFullHealth = selectedTeam.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp }));
    setPlayerTeam(playerTeamWithFullHealth);
    const aiTeamWithFullHealth = generatedOpponent.scaledMonsters.map((m: Monster) => ({ ...m, abilities: m.abilities || [] }));
    setAiTeam(aiTeamWithFullHealth);
    setBattleLog([`Battle is about to begin! Select your starting monster.`]);
    setBattleMode('lead-select');
    setIsLoading(false);
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
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">Choose Your Lead Monster</h1>
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
    if (isLoading || playerTeam.length === 0 || aiTeam.length === 0 || !playerTeam[activePlayerIndex] || !aiTeam[activeAiIndex]) {
      return <div className="text-center p-8">Loading Battle...</div>;
    }
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
        floatingTexts={floatingTexts}
    />;
  }

  return null;
}