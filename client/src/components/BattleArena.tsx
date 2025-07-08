import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQueryClient } from '@tanstack/react-query';
import {
  UserMonster,
  Ability,
  FloatingText,
  BattleState,
  BattleEvent,
} from '@shared/types';
import { Button } from '@/components/ui/button';
import MonsterCard from './MonsterCard';
import { apiRequest } from '@/lib/queryClient';

interface BattleArenaProps {
  onRetreat: () => void;
}

export default function BattleArena({ onRetreat }: BattleArenaProps) {
  const queryClient = useQueryClient();

  const [battleMode, setBattleMode] = useState<'team-select' | 'lead-select' | 'combat'>('team-select');
  const [isLoading, setIsLoading] = useState(false);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [targetingState, setTargetingState] = useState<{ isTargeting: boolean; ability: Ability | null }>({
    isTargeting: false,
    ability: null,
  });

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleState?.battleLog]);

  // Main game loop trigger for AI turns
  useEffect(() => {
    if (battleState?.turn === 'ai' && !battleState?.battleEnded && battleState.battleId) {
      const timer = setTimeout(() => handleAiTurn(), 1500); // Simple delay for UX
      return () => clearTimeout(timer);
    }
  }, [battleState?.turn, battleState?.battleEnded, battleState?.battleId]);

  // Invalidate user monster cache when a battle ends to get fresh HP/MP
  useEffect(() => {
    if (battleState?.battleEnded) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/monsters'] });
    }
  }, [battleState?.battleEnded, queryClient]);

  // Process server events to create floating text
  useEffect(() => {
    if (!battleState?.events || battleState.events.length === 0) return;

    const getFloatingTextContent = (event: BattleEvent): string => {
        switch (event.type) {
            case 'DAMAGE': return event.amount?.toString() || '0';
            case 'HEAL': return `+${event.amount?.toString() || '0'}`;
            case 'EVADE': return 'Evade!';
            case 'STATUS_APPLIED': return event.effectName || 'Status!';
            case 'PASSIVE_ACTIVATE': return event.abilityName || 'Passive!';
            case 'FAINT': return 'Fainted!';
            default: return '';
        }
    }

    battleState.events.forEach((event, index) => {
      setTimeout(() => {
        const textContent = getFloatingTextContent(event);
        if(!textContent) return;

        const newText: FloatingText = {
          id: Date.now() + Math.random(),
          text: textContent,
          type: event.type,
          targetId: event.targetId,
        };
        setFloatingTexts((prev) => [...prev, newText]);
        setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((t) => t.id !== newText.id));
        }, 1500);
      }, index * 200); // Stagger events slightly
    });
  }, [battleState?.events]); 

  const updateStateFromServer = (newState: BattleState) => {
    setBattleState(newState);
  };

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    // This function now just sets up the client for lead selection
    setBattleState({
      playerTeam: selectedTeam,
      aiTeam: generatedOpponent.scaledMonsters,
      // The rest of the state will be populated by the server
      battleId: '',
      turn: 'player',
      turnCount: 1,
      cycleComplete: false,
      battleEnded: false,
      winner: null,
      battleLog: [],
      events: [],
    });
    setFloatingTexts([]);
    setBattleMode('lead-select');
  };

  const selectLeadMonster = async (index: number) => {
    if (!battleState) return;
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/battle/create', {
        method: 'POST',
        data: {
          playerTeam: battleState.playerTeam,
          opponentTeam: battleState.aiTeam,
          playerLeadMonsterIndex: index,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create battle session on server');
      }

      const { battleId, battleState: newBattleState } = await response.json();
      updateStateFromServer(newBattleState);
      setBattleMode('combat');
    } catch (error) {
      console.error('Error creating battle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerAbility = async (ability: Ability, targetId?: number) => {
    if (battleState?.turn !== 'player' || battleState?.battleEnded || !battleState.battleId) return;

    if (ability.target_scope === 'ANY_ALLY' && !targetId) {
      setTargetingState({ isTargeting: true, ability: ability });
      // Future: could add a log message here
      return;
    }

    try {
      const response = await apiRequest('/api/battle/perform-action', {
        method: 'POST',
        data: {
          battleId: battleState.battleId,
          abilityId: ability.id,
          targetId: targetId,
        },
      });

      if (!response.ok) throw new Error('Failed to perform battle action');

      const { battleState: newState } = await response.json();
      updateStateFromServer(newState);
    } catch (error) {
      console.error('Error performing player action:', error);
    } finally {
      setTargetingState({ isTargeting: false, ability: null });
    }
  };

  const handleAiTurn = async () => {
    if (!battleState?.battleId) return;
    try {
        // The AI turn is just a special case of performAction where the server decides the ability
      const response = await apiRequest('/api/battle/perform-action', {
        method: 'POST',
        data: {
          battleId: battleState.battleId,
          abilityId: -1, // Special ID to signify an AI-chosen action
        },
      });
      if (!response.ok) throw new Error('Failed to process AI turn');
      const { battleState: newState } = await response.json();
      updateStateFromServer(newState);
    } catch (error) {
      console.error('Error on AI turn:', error);
    }
  };

  const handleSwapMonster = async (monsterId: number) => {
    if (battleState?.turn !== 'player' || battleState?.battleEnded || !battleState.battleId) return;

    try {
        // Swapping is now just a special action
      const response = await apiRequest('/api/battle/perform-action', {
        method: 'POST',
        data: {
          battleId: battleState.battleId,
          abilityId: -2, // Special ID for a swap action
          targetId: monsterId, // The monster to swap in
        },
      });

      if (!response.ok) throw new Error('Failed to perform monster swap');
      const { battleState: newState } = await response.json();
      updateStateFromServer(newState);
    } catch (error)
    {
      console.error('Error swapping monster:', error);
    }
  };


  if (battleMode === 'team-select') {
    return <BattleTeamSelector onBattleStart={handleBattleStart} />;
  }

  if (battleMode === 'lead-select' && battleState) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Choose Your Lead Monster
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {battleState.playerTeam.map((userMonster, index) => (
            <div key={userMonster.id}>
              <MonsterCard
                monster={userMonster.monster}
                userMonster={userMonster}
                size="medium"
                startExpanded={true}
              />
              <Button
                onClick={() => selectLeadMonster(index)}
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
                disabled={userMonster.hp <= 0 || isLoading}
              >
                {isLoading ? 'Starting...' : userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (battleMode === 'combat' && battleState && battleState.playerTeam.length > 0 && battleState.aiTeam.length > 0) {
    const playerMonster = battleState.playerTeam.find(m => !m.isFainted) || battleState.playerTeam[0];
    const opponentMonster = battleState.aiTeam.find(m => !m.isFainted) || battleState.aiTeam[0];

    return (
      <>
        {battleState.playerTeam[0].isFainted && !battleState.battleEnded && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-400 animate-pulse">
            <h3 className="text-lg font-bold text-center">
              Your monster fainted! Choose another to continue.
            </h3>
          </div>
        )}
        <CombatView
          playerMonster={playerMonster}
          opponentMonster={opponentMonster}
          playerBench={battleState.playerTeam.filter((p) => p.id !== playerMonster.id)}
          opponentBench={battleState.aiTeam.filter((o) => o.id !== opponentMonster.id)}
          isPlayerTurn={battleState.turn === 'player' && !battleState.battleEnded}
          canSwap={battleState.turn === 'player' && !battleState.battleEnded}
          battleLog={battleState.battleLog}
          battleEnded={battleState.battleEnded}
          winner={battleState.winner}
          logRef={logRef}
          onAbilityClick={(ability) => handlePlayerAbility(ability)}
          onSwapMonster={handleSwapMonster}
          onRetreat={onRetreat}
          onPlayAgain={() => setBattleMode('team-select')}
          floatingTexts={floatingTexts}
          isTargeting={targetingState.isTargeting}
          onTargetSelected={(targetId) => {
            if (targetingState.ability) {
              handlePlayerAbility(targetingState.ability, targetId);
            }
          }}
        />
      </>
    );
  }

  return <div className="text-center p-8 text-white">Loading Battle...</div>;
}