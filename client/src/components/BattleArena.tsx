import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, ActiveEffect, DamageResult, FloatingText } from '@/shared/types';
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
  const [battleId, setBattleId] = useState<string | null>(null);

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

  // Helper function for getModifiedStat (needed for speed comparison in selectLeadMonster)
  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    if ('monster' in monster) { // It's a UserMonster
        return monster[statName];
    }
    // It's a base Monster for the AI
    const baseStatMap = {
        power: 'basePower',
        defense: 'baseDefense',
        speed: 'baseSpeed'
    };
    return (monster as any)[baseStatMap[statName]] || 0;
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

  const handlePlayerAbility = async (ability: Ability) => {
    if (turn !== 'player' || battleEnded || !battleId) return;
    
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]);
        return;
    }
    
    try {
      const response = await fetch('/api/battle/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          battleId,
          ability
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform battle action');
      }
      
      const actionResult = await response.json();
      const { damageResult, battleState } = actionResult;
      
      // Update all client state from server response
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setActiveAiIndex(battleState.activeAiIndex);
      setTurn(battleState.turn);
      setBattleEnded(battleState.battleEnded);
      setWinner(battleState.winner);
      
      // Add visual feedback
      const defender = battleState.turn === 'ai' ? battleState.aiTeam[battleState.activeAiIndex] : battleState.playerTeam[battleState.activePlayerIndex];
      addFloatingText(`-${damageResult.damage}`, 'damage', defender.id || 0, battleState.turn === 'ai');
      if(damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id || 0, battleState.turn === 'ai');
      
      const newLog = [`Your ${attacker.monster.name} used ${ability.name}!`];
      if (damageResult.isCritical) newLog.push("A critical hit!");
      newLog.push(getEffectivenessMessage(damageResult.affinityMultiplier));
      setBattleLog(prev => [...prev, ...newLog.filter(Boolean)]);

      if (battleState.battleEnded) {
        handleBattleCompletion(battleState.winner || 'ai');
      }
      
    } catch (error) {
      console.error('Error performing battle action:', error);
      setBattleLog(prev => [...prev, "Error performing action! Please try again."]);
    }
  };

  const handleAiAbility = async () => {
    if (battleEnded || !battleId || turn !== 'ai') return;
    
    try {
      const response = await fetch('/api/battle/ai-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          battleId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process AI turn');
      }
      
      const aiTurnResult = await response.json();
      const { damageResult, battleState } = aiTurnResult;
      
      // Update all client state from server response
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setActiveAiIndex(battleState.activeAiIndex);
      setTurn(battleState.turn);
      setBattleEnded(battleState.battleEnded);
      setWinner(battleState.winner);
      
      // Add visual feedback
      const defender = battleState.turn === 'player' ? battleState.playerTeam[battleState.activePlayerIndex] : battleState.aiTeam[battleState.activeAiIndex];
      addFloatingText(`-${damageResult.damage}`, 'damage', defender.id || 0, battleState.turn === 'player');
      if(damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id || 0, battleState.turn === 'player');
      
      // Server now handles AI ability log message - just add additional feedback
      const additionalLog = [];
      if (damageResult.isCritical) additionalLog.push("A critical hit!");
      additionalLog.push(getEffectivenessMessage(damageResult.affinityMultiplier));
      
      // Update battle log with server's authoritative log plus additional feedback
      setBattleLog(battleState.battleLog.concat(additionalLog.filter(Boolean)));

      if (battleState.battleEnded) {
        handleBattleCompletion(battleState.winner || 'player');
      }
      
    } catch (error) {
      console.error('Error performing AI action:', error);
      setBattleLog(prev => [...prev, "Error during AI turn! Continuing..."]);
      setTurn('player');
    }
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

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setBattleLog([]); setIsLoading(true); setBattleEnded(false); setWinner(null); setActiveEffects([]); setFloatingTexts([]);
    
    try {
      // Prepare team data for server
      const playerTeamWithFullHealth = selectedTeam.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp }));
      const opponentTeam = generatedOpponent.scaledMonsters;

      // Request server to create battle session
      const response = await fetch('/api/battle/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playerTeam: playerTeamWithFullHealth,
          opponentTeam: opponentTeam
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start battle session');
      }

      const battleSession = await response.json();
      const { battleId, battleState } = battleSession;

      // Set all battle state from server response
      setBattleId(battleId);
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setActiveAiIndex(battleState.activeAiIndex);
      setTurn(battleState.turn);
      setBattleEnded(battleState.battleEnded);
      setWinner(battleState.winner);
      setBattleLog([`Battle is about to begin! Select your starting monster.`]);
      setBattleMode('lead-select');
      setIsLoading(false);

    } catch (error) {
      console.error('Error starting battle session:', error);
      setBattleLog(['Error starting battle! Please try again.']);
      setIsLoading(false);
    }
  };

  const selectLeadMonster = async (index: number) => {
    try {
      // Make a POST request to the new /api/battle/select-lead endpoint
      const response = await fetch('/api/battle/select-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          battleId: battleId,
          playerMonsterIndex: index
        })
      });

      if (!response.ok) {
        throw new Error('Failed to select lead monster');
      }

      // Parse the JSON to get the complete and authoritative battleState
      const battleState = await response.json();

      // Use this battleState object from the server to update all client state variables
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setActiveAiIndex(battleState.activeAiIndex);
      setTurn(battleState.turn);
      setBattleLog(battleState.battleLog);

      // Change the view to combat screen
      setBattleMode('combat');

    } catch (error) {
      console.error('Error selecting lead monster:', error);
      setBattleLog(prev => [...prev, 'Error selecting lead monster! Please try again.']);
    }
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