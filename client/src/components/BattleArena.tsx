import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useBattleState } from '@/hooks/useBattleState';
import { PlayerCombatMonster, AiCombatMonster } from '@/types/game';

interface BattleInit {
  playerTeam: PlayerCombatMonster[];
  aiTeam: AiCombatMonster[];
}

const CombatSession: React.FC<{
  initialState: BattleInit;
  onRetreat: () => void;
  onPlayAgain: () => void;
}> = ({ initialState, onRetreat, onPlayAgain }) => {

  const { state, actions } = useBattleState(initialState.playerTeam, initialState.aiTeam);
  const battleLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [state.battleLog]);

  if (!state.playerTeam[state.activePlayerIndex] || !state.aiTeam[state.activeAiIndex]) {
    return <div className="text-center p-8 text-white">Loading Battle...</div>;
  }

  return (
    <CombatView
      playerMonster={state.playerTeam[state.activePlayerIndex]}
      opponentMonster={state.aiTeam[state.activeAiIndex]}
      playerBench={state.playerTeam.filter((_, i) => i !== state.activePlayerIndex)}
      opponentBench={state.aiTeam.filter((_, i) => i !== state.activeAiIndex)}
      isPlayerTurn={!state.isProcessing && state.turn === 'player' && !state.battleEnded}
      battleLog={state.battleLog}
      battleEnded={state.battleEnded}
      winner={state.winner}
      logRef={battleLogRef}
      onAbilityClick={actions.handlePlayerAbility}
      onSwapMonster={actions.handleSwapMonster}
      onRetreat={onRetreat}
      onPlayAgain={onPlayAgain}
      floatingTexts={[]}
      targetingMode={null}
      onTargetSelect={() => {}}
    />
  );
};

export default function BattleArena({ onRetreat }: { onRetreat: () => void }) {
  const [battleMode, setBattleMode] = useState<'team-select' | 'combat'>('team-select');
  const [battleInit, setBattleInit] = useState<BattleInit | null>(null);

  const handleBattleStart = (playerTeam: PlayerCombatMonster[], aiOpponent: any) => {
    setBattleInit({
      playerTeam: playerTeam,
      aiTeam: aiOpponent.scaledMonsters,
    });
    setBattleMode('combat');
  };

  const handlePlayAgain = () => {
    setBattleInit(null);
    setBattleMode('team-select');
  };

  if (battleMode === 'team-select') {
    return <BattleTeamSelector onBattleStart={handleBattleStart} />;
  }

  if (battleMode === 'combat' && battleInit) {
    return <CombatSession initialState={battleInit} onRetreat={onRetreat} onPlayAgain={handlePlayAgain} />;
  }

  return null;
}