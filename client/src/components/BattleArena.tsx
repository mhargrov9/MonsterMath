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
  BattleLog as BattleLogType, // <-- UPDATED: Use the specific type for clarity
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
  const [playerTeam, setPlayerTeam] = useState<UserMonster[]>([]);
  const [aiTeam, setAiTeam] = useState<any[]>([]); // Use 'any' for initial AI team flexibility
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeAiIndex, setActiveAiIndex] = useState(0);
  const [turn, setTurn] = useState<Turn>('pre-battle');
  const [battleLog, setBattleLog] = useState<BattleLogType[]>([]); // <-- UPDATED: State now holds BattleLog objects
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
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
  }, [battleLog]);

  // Main game loop trigger for AI turns
  useEffect(() => {
    if (turn === 'ai' && !battleEnded && battleId) {
      const timer = setTimeout(() => handleAiTurn(), 1500); // Simple delay for UX
      return () => clearTimeout(timer);
    }
  }, [turn, battleEnded, battleId]);

  // Invalidate user monster cache when a battle ends to get fresh HP/MP
  useEffect(() => {
    if (battleEnded) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/monsters'] });
    }
  }, [battleEnded, queryClient]);

  const addFloatingText = (
    text: string,
    type: 'damage' | 'heal' | 'crit',
    targetId: number | string,
    isPlayerTarget: boolean,
  ) => {
    const newText: FloatingText = {
      id: Date.now() + Math.random(),
      text,
      type,
      targetId,
      isPlayerTarget,
    };
    setFloatingTexts((prev) => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== newText.id));
    }, 1500);
  };

  const updateStateFromServer = (battleState: any) => {
    setPlayerTeam(battleState.playerTeam);
    setAiTeam(battleState.aiTeam);
    setActivePlayerIndex(battleState.activePlayerIndex);
    setActiveAiIndex(battleState.activeAiIndex);
    setTurn(battleState.turn);
    setBattleEnded(battleState.battleEnded);
    setWinner(battleState.winner);
    setBattleLog(battleState.battleLog);
  };

  const handleBattleStart = async (
    selectedTeam: UserMonster[],
    generatedOpponent: any,
  ) => {
    setPlayerTeam(selectedTeam);
    setAiTeam(generatedOpponent.scaledMonsters);
    // Reset all battle state variables
    setBattleLog([]);
    setBattleEnded(false);
    setWinner(null);
    setFloatingTexts([]);
    setBattleId(null);
    setTurn('pre-battle');
    setBattleMode('lead-select');
  };

  const selectLeadMonster = async (index: number) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/battle/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerTeam: playerTeam,
          opponentTeam: aiTeam,
          playerLeadMonsterIndex: index,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create battle session on server');
      }

      const { battleId, battleState } = await response.json();
      setBattleId(battleId);
      updateStateFromServer(battleState);
      setBattleMode('combat');
    } catch (error) {
      console.error('Error creating battle:', error);
      setBattleLog([
        { message: 'Error creating battle! Please try again.', turn: 'system' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerAbility = async (ability: Ability, targetId?: number) => {
    if (turn !== 'player' || battleEnded || !battleId) return;

    if (ability.target_scope === 'ANY_ALLY' && !targetId) {
      setTargetingState({ isTargeting: true, ability: ability });
      setBattleLog((prev) => [
        ...prev,
        {
          message: `Select a target for ${ability.name}...`,
          turn: 'system',
        },
      ]);
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

      const { battleState } = await response.json();
      updateStateFromServer(battleState);
    } catch (error) {
      console.error('Error performing player action:', error);
      setBattleLog((prev) => [
        ...prev,
        { message: 'Error performing action!', turn: 'system' },
      ]);
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
      const { battleState } = await response.json();
      updateStateFromServer(battleState);
    } catch (error) {
      console.error('Error on AI turn:', error);
      setBattleLog((prev) => [
        ...prev,
        { message: 'Error during AI turn!', turn: 'system' },
      ]);
      setTurn('player');
    }
  };

  const handleSwapMonster = async (monsterId: number) => {
    if (
      (turn !== 'player' && turn !== 'player-must-swap') ||
      battleEnded ||
      !battleId
    )
      return;

    const newMonsterIndex = playerTeam.findIndex((p) => p.id === monsterId);
    if (newMonsterIndex === -1) return;

    try {
      const response = await fetch('/api/battle/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ battleId, newMonsterIndex }),
      });

      if (!response.ok) throw new Error('Failed to perform monster swap');
      // The swap endpoint now processes the AI turn immediately after the swap.
      const battleState = await response.json();
      updateStateFromServer(battleState);
    } catch (error) {
      console.error('Error swapping monster:', error);
      setBattleLog((prev) => [
        ...prev,
        { message: 'Error swapping monster!', turn: 'system' },
      ]);
    }
  };

  const handleForfeitTurn = async () => {
    if (turn !== 'player' || battleEnded || !battleId) return;
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

  if (battleMode === 'lead-select') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Choose Your Lead Monster
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {playerTeam.map((userMonster, index) => (
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

  if (battleMode === 'combat') {
    if (
      isLoading ||
      playerTeam.length === 0 ||
      aiTeam.length === 0 ||
      !playerTeam[activePlayerIndex] ||
      !aiTeam[activeAiIndex]
    ) {
      return (
        <div className="text-center p-8 text-white">Loading Battle...</div>
      );
    }

    return (
      <>
        {turn === 'player-must-swap' && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-400 animate-pulse">
            <h3 className="text-lg font-bold text-center">
              Your monster fainted! Choose another to continue.
            </h3>
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

  return null;
}