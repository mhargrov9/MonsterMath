import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, ActiveEffect, DamageResult, FloatingText, StatModifier } from '@/types/game';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';

// --- Type Definitions ---
interface BattleArenaProps {
  onRetreat: () => void;
}

// --- Main Component ---
const useUser = () => {
    return useQuery<{ id: string; rank_xp: number }>({ queryKey: ['/api/auth/user'] }).data;
};

export default function BattleArena({ onRetreat }: BattleArenaProps) {
  const queryClient = useQueryClient();
  const user = useUser();

  const [battleMode, setBattleMode] = useState<'team-select' | 'combat'>('team-select');
  const [targetingMode, setTargetingMode] = useState<{ ability: Ability; validTargets: (number | string)[] } | null>(null);
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

  // --- Utility & Calculation Functions ---
  const addFloatingText = (text: string, type: 'damage' | 'heal' | 'crit' | 'info', targetId: number | string, isPlayerTarget: boolean) => {
    const newText: FloatingText = { id: Date.now() + Math.random(), text, type, targetId, isPlayerTarget };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== newText.id)), 1500);
  };

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    let baseStat: number;
    if ('monster' in monster) { baseStat = monster[statName]; } 
    else { const key = `base${statName.charAt(0).toUpperCase() + statName.slice(1)}` as keyof Monster; baseStat = (monster as any)[key] || 0; }
    return Math.round(baseStat);
  };

  const getAffinityMultiplier = (attackAffinity: string | undefined, defender: UserMonster | Monster): number => {
    if (!attackAffinity) return 1.0;
    const lower = attackAffinity.toLowerCase();
    const weaknesses = 'monster' in defender ? defender.monster.weaknesses : defender.weaknesses;
    const resistances = 'monster' in defender ? defender.monster.resistances : defender.resistances;
    if (weaknesses?.map((w: string) => w.toLowerCase()).includes(lower)) return 2.0;
    if (resistances?.map((r: string) => r.toLowerCase()).includes(lower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => {
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attacker, scalingStatName);
    const defendingDefense = getModifiedStat(defender, 'defense');
    const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
    const damageMultiplier = 100 / (100 + defendingDefense);
    let rawDamage = attackPower * damageMultiplier;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defender);
    rawDamage *= affinityMultiplier;
    return { damage: Math.round(Math.max(1, rawDamage)), isCritical: false, affinityMultiplier };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  const handleBattleCompletion = async (winnerVal: 'player' | 'ai') => {
    if (battleEnded) return;
    setBattleLog(prev => [...prev, `--- BATTLE OVER ---`]);
    setBattleEnded(true);
    setWinner(winnerVal);
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded || targetingMode) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]); return;
    }
    const scope = ability.target_scope || 'ACTIVE_OPPONENT';
    if(scope === 'ACTIVE_OPPONENT') {
      const defender = aiTeam[activeAiIndex];
      const damageResult = calculateDamage(attacker, defender, ability);
      setPlayerTeam(team => team.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));
      setAiTeam(team => team.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m));
      addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, false);
      setBattleLog(prev => [...prev, `Your ${attacker.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`, getEffectivenessMessage(damageResult.affinityMultiplier)].filter(Boolean));
      setTurn('ai');
    } else if (scope === 'ANY_ALLY') {
      setTargetingMode({ ability, validTargets: playerTeam.map(p => p.id) });
      setBattleLog(prev => [...prev, `Select a target for ${ability.name}.`]);
    }
  };

  const handleAiAbility = () => {
    if (battleEnded || turn !== 'ai') return;
    const activeAi = aiTeam[activeAiIndex];
    const defender = playerTeam[activePlayerIndex];
    const ability = activeAi.abilities?.find(a => a.name === "Basic Attack")!;
    const damageResult = calculateDamage(activeAi, defender, ability);

    setAiTeam(team => team.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));
    setPlayerTeam(team => team.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m));

    addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, true);
    setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} used ${ability.name}, dealing ${damageResult.damage} damage!`, getEffectivenessMessage(damageResult.affinityMultiplier)].filter(Boolean));
    setTurn('player');
  };

  const handleTargetSelect = (targetId: number | string) => {
      if(!targetingMode) return;
      const ability = targetingMode.ability;
      const attacker = playerTeam[activePlayerIndex];
      const target = playerTeam.find(p => p.id === targetId);
      if(!target) return;

      const healAmount = ability.healing_power || 0;
      setPlayerTeam(team => team.map(p => p.id === targetId ? {...p, hp: Math.min(p.maxHp, p.hp + healAmount)} : p)
                                .map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m)
      );
      setBattleLog(prev => [...prev, `Your ${attacker.monster.name} used ${ability.name}, healing ${target.monster.name} for ${healAmount} HP!`]);
      addFloatingText(`+${healAmount}`, 'heal', targetId, true);
      setTargetingMode(null);
      setTurn('ai');
  };

  const handleSwapMonster = (monsterId: number) => {
    if (turn !== 'player' || battleEnded) return;
    const newIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newIndex === -1 || playerTeam[newIndex].hp <= 0) return;
    setBattleLog(prev => [...prev, `You send out ${playerTeam[newIndex].monster.name}!`]);
    setActivePlayerIndex(newIndex);
    setTurn('ai');
  };

  // --- Game Loop & Setup ---
  useEffect(() => {
    if (battleEnded || turn === 'pre-battle') return;

    const activePlayer = playerTeam[activePlayerIndex];
    if (turn === 'player' && activePlayer?.hp <= 0) {
        if (playerTeam.every(m => m.hp <= 0)) { handleBattleCompletion('ai'); } 
        else { setBattleLog(prev => [...prev, `Your ${activePlayer.monster.name} fainted! You must swap.`]); }
        return;
    }

    if (turn === 'ai') {
        const activeAi = aiTeam[activeAiIndex];
        if (activeAi?.hp <= 0) {
            const nextIndex = aiTeam.findIndex(m => m.hp > 0);
            if (nextIndex !== -1) {
                setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} fainted! Opponent sends out ${aiTeam[nextIndex].name}.`]);
                setActiveAiIndex(nextIndex);
            } else {
                handleBattleCompletion('player');
            }
        } else {
            const timer = setTimeout(handleAiAbility, 1500);
            return () => clearTimeout(timer);
        }
    }
  }, [turn, battleEnded, playerTeam, aiTeam, activePlayerIndex, activeAiIndex]);

  const handleBattleStart = (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setPlayerTeam(selectedTeam.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp })));
    setAiTeam(generatedOpponent.scaledMonsters);
    setActivePlayerIndex(0);
    setActiveAiIndex(0);
    setBattleLog([`Battle begins! You send out ${selectedTeam[0].monster.name}.`]);
    setTurn('player');
    setBattleMode('combat');
  };

  const battleLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (battleLogRef.current) { battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight; } }, [battleLog]);

  if (battleMode === 'team-select') return <BattleTeamSelector onBattleStart={handleBattleStart} />;

  if (battleMode === 'combat') {
    if (playerTeam.length === 0 || aiTeam.length === 0 || !playerTeam[activePlayerIndex] || !aiTeam[activeAiIndex]) {
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
        targetingMode={targetingMode}
        onTargetSelect={handleTargetSelect}
    />;
  }
  return null;
}