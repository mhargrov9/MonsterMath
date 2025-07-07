import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQueryClient } from '@tanstack/react-query';
import {
  UserMonster,
  Monster,
  Ability,
  FloatingText,
  Turn,
  BattleLog as BattleLogType,
  BattleState, // <-- UPDATED: Use the full state type
} from '@shared/types';
import { Button } from '@/components/ui/button';
import MonsterCard from './MonsterCard';

interface BattleArenaProps {
  onRetreat: () => void;
}

export default function BattleArena({ onRetreat }: BattleArenaProps) {
  const queryClient = useQueryClient();

  const [battleMode, setBattleMode] = useState<
    'team-select' | 'lead-select' | 'combat'
  >('team-select');
  const [isLoading, setIsLoading] = useState(false);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [targetingState, setTargetingState] = useState<{
    isTargeting: boolean;
    ability: Ability | null;
  }>({
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
    if (battleState?.turn === 'ai' && !battleState?.battleEnded && battleId) {
      const timer = setTimeout(() => handleAiTurn(), 1500); // Simple delay for UX
      return () => clearTimeout(timer);
    }
  }, [battleState?.turn, battleState?.battleEnded, battleId]);

  // Invalidate user monster cache when a battle ends to get fresh HP/MP
  useEffect(() => {
    if (battleState?.battleEnded) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/monsters'] });
    }
  }, [battleState?.battleEnded, queryClient]);

  // UPDATED: Process server events to create floating text
  useEffect(() => {
    if (battleState?.events && battleState.events.length > 0) {
      battleState.events.forEach((event, index) => {
        setTimeout(() => {
          const newText: FloatingText = {
            id: Date.now() + Math.random(),
            text: event.text || event.amount?.toString() || '',
            type: event.type,
            targetId: event.targetId,
            isPlayerTarget: event.isPlayerTarget,
          };
          setFloatingTexts((prev) => [...prev, newText]);
          setTimeout(() => {
            setFloatingTexts((prev) => prev.filter((t) => t.id !== newText.id));
          }, 1500);
        }, index * 150); // Stagger events slightly
      });
    }
  }, [battleState?.battleLog]); // Trigger when new logs arrive, indicating a new state

  const updateStateFromServer = (newState: BattleState) => {
    setBattleState(newState);
  };

  const handleBattleStart = async (
    selectedTeam: UserMonster[],
    generatedOpponent: any,
  ) => {
    // This function now just sets up the client for lead selection
    setBattleState({
      playerTeam: selectedTeam,
      aiTeam: generatedOpponent.scaledMonsters,
      activePlayerIndex: 0,
      activeAiIndex: 0,
      turn: 'pre-battle',
      battleEnded: false,
      winner: null,
      battleLog: [],
      events: [],
    });
    setFloatingTexts([]);
    setBattleId(null);
    setBattleMode('lead-select');
  };

  const selectLeadMonster = async (index: number) => {
    if (!battleState) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/battle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerTeam: battleState.playerTeam,
          opponentTeam: battleState.aiTeam,
          playerLeadMonsterIndex: index,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create battle session on server');
      }

      const { battleId, battleState: newBattleState } = await response.json();
      setBattleId(battleId);
      updateStateFromServer(newBattleState);
      setBattleMode('combat');
    } catch (error) {
      console.error('Error creating battle:', error);
      // Handle error state appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerAbility = async (ability: Ability, targetId?: number) => {
    if (battleState?.turn !== 'player' || battleState?.battleEnded || !battleId)
      return;

    // Handle targeting for ANY_ALLY scope
    if (ability.target_scope === 'ANY_ALLY' && !targetId) {
      setTargetingState({ isTargeting: true, ability: ability });
      setBattleState((prev) =>
        prev
          ? {
              ...prev,
              battleLog: [
                ...prev.battleLog,
                {
                  message: `Select a target for ${ability.name}...`,
                  turn: 'system',
                },
              ],
            }
          : null,
      );
      return;
    }

    try {
      const response = await fetch('/api/battle/perform-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          battleId,
          abilityId: ability.id,
          targetId: targetId,
        }),
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
    if (!battleId) return;
    try {
      const response = await fetch('/api/battle/ai-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ battleId }),
      });
      if (!response.ok) throw new Error('Failed to process AI turn');
      const { battleState: newState } = await response.json();
      updateStateFromServer(newState);
    } catch (error) {
      console.error('Error on AI turn:', error);
      setBattleState((prev) =>
        prev
          ? {
              ...prev,
              turn: 'player',
              battleLog: [
                ...prev.battleLog,
                { message: 'Error during AI turn!', turn: 'system' },
              ],
            }
          : null,
      );
    }
  };

  const handleSwapMonster = async (monsterId: number) => {
    if (
      (battleState?.turn !== 'player' &&
        battleState?.turn !== 'player-must-swap') ||
      battleState?.battleEnded ||
      !battleId
    )
      return;

    const newMonsterIndex = battleState.playerTeam.findIndex(
      (p) => p.id === monsterId,
    );
    if (newMonsterIndex === -1) return;

    try {
      const response = await fetch('/api/battle/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ battleId, newMonsterIndex }),
      });

      if (!response.ok) throw new Error('Failed to perform monster swap');
      const battleState = await response.json();
      updateStateFromServer(battleState);
    } catch (error) {
      console.error('Error swapping monster:', error);
    }
  };

  const handleForfeitTurn = async () => {
    if (battleState?.turn !== 'player' || battleState?.battleEnded || !battleId)
      return;
    try {
      const response = await fetch('/api/battle/forfeit-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ battleId }),
      });

      if (!response.ok) throw new Error('Failed to forfeit turn');
      const battleState = await response.json();
      updateStateFromServer(battleState);
    } catch (error) {
      console.error('Error forfeiting turn:', error);
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
                {isLoading
                  ? 'Starting...'
                  : userMonster.hp <= 0
                    ? 'Fainted'
                    : 'Choose as Lead'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (battleMode === 'combat' && battleState) {
    return (
      <>
        {battleState.turn === 'player-must-swap' && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-400 animate-pulse">
            <h3 className="text-lg font-bold text-center">
              Your monster fainted! Choose another to continue.
            </h3>
          </div>
        )}
        <CombatView
          playerMonster={battleState.playerTeam[battleState.activePlayerIndex]}
          opponentMonster={battleState.aiTeam[battleState.activeAiIndex]}
          playerBench={battleState.playerTeam.filter(
            (_, i) => i !== battleState.activePlayerIndex,
          )}
          opponentBench={battleState.aiTeam.filter(
            (_, i) => i !== battleState.activeAiIndex,
          )}
          isPlayerTurn={battleState.turn === 'player' && !battleState.battleEnded}
          canSwap={
            battleState.turn === 'player' ||
            battleState.turn === 'player-must-swap'
          }
          battleLog={battleState.battleLog}
          battleEnded={battleState.battleEnded}
          winner={battleState.winner}
          logRef={logRef}
          onAbilityClick={(ability) => handlePlayerAbility(ability)}
          onSwapMonster={handleSwapMonster}
          onForfeitTurn={handleForfeitTurn}
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