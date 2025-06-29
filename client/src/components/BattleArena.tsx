import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { UserMonster, Monster, Ability, DamageResult, FloatingText } from '@/types/game';
import { calculateDamage } from '@/lib/battleCalculations';

export default function BattleArena({ onRetreat }: { onRetreat: () => void }) {
  const [battleMode, setBattleMode] = useState<'team-select' | 'combat'>('team-select');
  const [playerTeam, setPlayerTeam] = useState<UserMonster[]>([]);
  const [aiTeam, setAiTeam] = useState<Monster[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeAiIndex, setActiveAiIndex] = useState(0);
  const [turn, setTurn] = useState<'player' | 'ai' | 'pre-battle'>('pre-battle');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [targetingMode, setTargetingMode] = useState<{ ability: Ability; validTargets: (number | string)[] } | null>(null);
  const battleLogRef = useRef<HTMLDivElement>(null);

  const addFloatingText = (text: string, type: 'damage' | 'heal' | 'crit' | 'info', targetId: number | string, isPlayerTarget: boolean) => {
    const newText: FloatingText = { id: Date.now() + Math.random(), text, type, targetId, isPlayerTarget };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== newText.id)), 1500);
  };

  const handleBattleCompletion = (winnerVal: 'player' | 'ai') => {
    if (battleEnded) return;
    setBattleLog(prev => [...prev, `--- BATTLE OVER ---`]);
    setBattleEnded(true);
    setWinner(winnerVal);
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded || targetingMode) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.hp <= 0) {
        setBattleLog(prev => [...prev, "Your active monster has fainted and cannot attack."]);
        return;
    }
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]); return;
    }
    const defender = aiTeam[activeAiIndex];
    const damage = calculateDamage(attacker, defender, ability, []);
    setBattleLog(prev => [...prev, `Your ${attacker.monster.name} used ${ability.name}, dealing ${damage} damage!`]);
    addFloatingText(`-${damage}`, 'damage', defender.id, false);
    setPlayerTeam(team => team.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));
    setAiTeam(team => team.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m));
    setTurn('ai');
  };

  const handleAiAbility = () => {
    if (turn !== 'ai' || battleEnded) return;
    const activeAi = aiTeam[activeAiIndex];
    const defender = playerTeam[activePlayerIndex];
    const ability = activeAi.abilities?.find(a => a.ability_type === 'ACTIVE') || activeAi.abilities?.[0];
    if (!ability) { setTurn('player'); return; }

    const damage = calculateDamage(activeAi, defender, ability, []);
    setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} used ${ability.name}, dealing ${damage} damage!`]);
    addFloatingText(`-${damage}`, 'damage', defender.id, true);
    setAiTeam(team => team.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));
    setPlayerTeam(team => team.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m));
    setTurn('player');
  };

  const handleSwapMonster = (monsterId: number) => {
    if (turn !== 'player' || battleEnded) return;
    const newIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newIndex === -1 || playerTeam[newIndex].hp <= 0) return;
    setBattleLog(prev => [...prev, `You send out ${playerTeam[newIndex].monster.name}!`]);
    setActivePlayerIndex(newIndex);
    setTurn('ai');
  };

  useEffect(() => {
    if (battleEnded || turn === 'pre-battle') return;
    if (playerTeam.every(m => m.hp <= 0)) { handleBattleCompletion('ai'); return; }
    if (aiTeam.every(m => m.hp <= 0)) { handleBattleCompletion('player'); return; }
    const activePlayer = playerTeam[activePlayerIndex];
    const activeAi = aiTeam[activeAiIndex];
    if (turn === 'player' && activePlayer?.hp <= 0) {
        setBattleLog(prev => [...prev, `Your ${activePlayer.monster.name} fainted! You must swap.`]);
        return; 
    }
    if (turn === 'ai') {
        if (activeAi?.hp <= 0) {
            const nextIndex = aiTeam.findIndex(m => m.hp > 0);
            if (nextIndex !== -1) {
                setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} fainted! Opponent sends out ${aiTeam[nextIndex].name}.`]);
                setActiveAiIndex(nextIndex);
                setTurn('player');
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
    setBattleEnded(false);
    setWinner(null);
  };

  useEffect(() => { if (battleLogRef.current) { battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight; } }, [battleLog]);

  if (battleMode === 'team-select') {
    return <BattleTeamSelector onBattleStart={handleBattleStart} />;
  }

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
        onTargetSelect={()=>{}} // Placeholder for now
    />;
  }

  return null;
}