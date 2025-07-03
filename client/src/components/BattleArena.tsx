import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, ActiveEffect, DamageResult, FloatingText, Turn } from '@shared/types';
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
  const [turn, setTurn] = useState<Turn>('pre-battle');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [targetingState, setTargetingState] = useState<{ isTargeting: boolean; ability: Ability | null }>({ 
    isTargeting: false, 
    ability: null 
  });

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





  const handlePlayerAbility = async (ability: Ability) => {
    if (turn !== 'player' || battleEnded || !battleId) return;
    
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]);
        return;
    }
    
    // Check if this ability requires target selection
    if (ability.target_scope === 'ANY_ALLY') {
      // Enter targeting mode instead of making API call
      setTargetingState({ isTargeting: true, ability: ability });
      setBattleLog(prev => [...prev, `Select a target for ${ability.name}...`]);
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
      
      // Update battle log with server's authoritative log only
      setBattleLog(battleState.battleLog);

      if (battleState.battleEnded) {
        // Battle completed by server - no additional client action needed
      }
      
    } catch (error) {
      console.error('Error performing battle action:', error);
      setBattleLog(prev => [...prev, "Error performing action! Please try again."]);
    }
  };

  const handleTargetSelected = async (targetId: number) => {
    if (!targetingState.isTargeting || !targetingState.ability || !battleId) return;
    
    try {
      const response = await fetch('/api/battle/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          battleId,
          ability: targetingState.ability,
          targetId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform battle action');
      }
      
      const { damageResult, battleState } = await response.json();
      
      // Update battle state from server
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setActiveAiIndex(battleState.activeAiIndex);
      setTurn(battleState.turn);
      setBattleEnded(battleState.battleEnded);
      setWinner(battleState.winner);
      
      // Add visual feedback (healing shows as negative damage)
      const isHealing = damageResult.damage < 0;
      const targetMonster = playerTeam.find(m => m.id === targetId) || aiTeam.find(m => m.id === targetId);
      if (targetMonster) {
        addFloatingText(
          isHealing ? `+${Math.abs(damageResult.damage)}` : `-${damageResult.damage}`, 
          isHealing ? 'heal' : 'damage', 
          targetId, 
          playerTeam.some(m => m.id === targetId)
        );
      }
      
      // Update battle log with server's authoritative log
      setBattleLog(battleState.battleLog);

      if (battleState.battleEnded) {
        queryClient.invalidateQueries({ queryKey: ['/api/user/monsters'] });
      }
      
    } catch (error) {
      console.error('Error performing targeted action:', error);
      setBattleLog(prev => [...prev, "Error performing targeted action! Please try again."]);
    } finally {
      // Reset targeting state
      setTargetingState({ isTargeting: false, ability: null });
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
      
      // Update battle log with server's authoritative log only
      setBattleLog(battleState.battleLog);

      if (battleState.battleEnded) {
        // Battle completed by server - no additional client action needed
      }
      
    } catch (error) {
      console.error('Error performing AI action:', error);
      setBattleLog(prev => [...prev, "Error during AI turn! Continuing..."]);
      setTurn('player');
    }
  };

  const handleSwapMonster = async (monsterId: number) => {
    if ((turn !== 'player' && turn !== 'player-must-swap') || battleEnded || !battleId) return;
    
    // Find the array index of the chosen monster
    const newMonsterIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newMonsterIndex === -1) return;
    
    try {
      // Make a POST request to the server swap endpoint
      const response = await fetch('/api/battle/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          battleId,
          newMonsterIndex
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to perform monster swap');
      }
      
      const battleState = await response.json();
      
      // Update all relevant client state variables with server's authoritative state
      setPlayerTeam(battleState.playerTeam);
      setAiTeam(battleState.aiTeam);
      setActivePlayerIndex(battleState.activePlayerIndex);
      setTurn(battleState.turn);
      setBattleLog(battleState.battleLog);
      setBattleEnded(battleState.battleEnded);
      setWinner(battleState.winner);
      
    } catch (error) {
      console.error('Error performing monster swap:', error);
      setBattleLog(prev => [...prev, "Error swapping monster! Please try again."]);
    }
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      const timer = setTimeout(handleAiAbility, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded, activeAiIndex, playerTeam]);

  // Invalidate client cache when battle ends to ensure fresh monster data
  useEffect(() => {
    if (battleEnded) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/monsters'] });
    }
  }, [battleEnded, queryClient]);

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setBattleLog([]); setIsLoading(true); setBattleEnded(false); setWinner(null); setActiveEffects([]); setFloatingTexts([]);
    
    try {
      // Use current monster stats without modification
      const opponentTeam = generatedOpponent.scaledMonsters;

      // Request server to create battle session
      const response = await fetch('/api/battle/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playerTeam: selectedTeam,
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
      setBattleLog(battleState.battleLog.concat('Battle is about to begin! Select your starting monster.'));
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
    
    return (
      <>
        {/* Forced Swap UI Indicator */}
        {turn === 'player-must-swap' && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-400 animate-pulse">
            <div className="text-center">
              <h3 className="text-lg font-bold">Your monster has fainted!</h3>
              <p className="text-sm">Choose a new monster from your bench to continue.</p>
            </div>
          </div>
        )}
        
        <CombatView 
        playerMonster={playerTeam[activePlayerIndex]}
        opponentMonster={aiTeam[activeAiIndex]}
        playerBench={playerTeam.filter((_, i) => i !== activePlayerIndex)}
        opponentBench={aiTeam.filter((_, i) => i !== activeAiIndex)}
        isPlayerTurn={turn === 'player' && !battleEnded}
        canSwap={turn === 'player' || turn === 'player-must-swap'}
        battleLog={battleLog}
        battleEnded={battleEnded}
        winner={winner}
        logRef={battleLogRef}
        onAbilityClick={handlePlayerAbility}
        onSwapMonster={handleSwapMonster}
        onRetreat={onRetreat}
        onPlayAgain={() => setBattleMode('team-select')}
        floatingTexts={floatingTexts}
        isTargeting={targetingState.isTargeting}
        onTargetSelected={handleTargetSelected}
    />
      </>
    );
  }

  return null;
}