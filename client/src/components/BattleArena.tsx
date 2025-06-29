import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { UserMonster, Monster } from '@/types/game';
import { useBattleState } from '@/hooks/useBattleState';

// This is now a lightweight component whose only job is to select which
// view to show (team selection or combat) and pass state to the view.
export default function BattleArena({ onRetreat }: { onRetreat: () => void }) {
  const [battleMode, setBattleMode] = useState<'team-select' | 'combat'>('team-select');
  const [initialTeams, setInitialTeams] = useState<{ pTeam: UserMonster[], aTeam: Monster[] } | null>(null);

  const handleBattleStart = (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setInitialTeams({
        pTeam: selectedTeam.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp })),
        aTeam: generatedOpponent.scaledMonsters
    });
    setBattleMode('combat');
  };

  if (battleMode === 'team-select' || !initialTeams) {
    return <BattleTeamSelector onBattleStart={handleBattleStart} />;
  }

  // A new component to contain the active battle and its state hook.
  // This ensures the hook is only called when a battle is active.
  return <ActiveBattleView initialTeams={initialTeams} onRetreat={onRetreat} onPlayAgain={() => setBattleMode('team-select')} />;
}

// This new sub-component manages the active battle state.
const ActiveBattleView = ({ initialTeams, onRetreat, onPlayAgain }: { initialTeams: { pTeam: UserMonster[], aTeam: Monster[] }, onRetreat: () => void, onPlayAgain: () => void }) => {
    const { state, actions } = useBattleState(initialTeams.pTeam, initialTeams.aTeam);
    const battleLogRef = useRef<HTMLDivElement>(null);

    // This useEffect sets the initial state when the component mounts.
    useEffect(() => {
        actions.setPlayerTeam(initialTeams.pTeam);
        actions.setAiTeam(initialTeams.aTeam);
        actions.setBattleLog([`Battle begins! You send out ${initialTeams.pTeam[0].monster.name}.`]);
        actions.setTurn('player');
    }, [initialTeams]);

    useEffect(() => {
        if (battleLogRef.current) {
          battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
        }
    }, [state.battleLog]);

    if (state.playerTeam.length === 0 || state.aiTeam.length === 0 || !state.playerTeam[state.activePlayerIndex] || !state.aiTeam[state.activeAiIndex]) {
      return <div className="text-center p-8">Loading Battle...</div>;
    }

    return <CombatView 
        playerMonster={state.playerTeam[state.activePlayerIndex]}
        opponentMonster={state.aiTeam[state.activeAiIndex]}
        playerBench={state.playerTeam.filter((_, i) => i !== state.activePlayerIndex)}
        opponentBench={state.aiTeam.filter((_, i) => i !== state.activeAiIndex)}
        isPlayerTurn={state.turn === 'player' && !state.battleEnded}
        battleLog={state.battleLog}
        battleEnded={state.battleEnded}
        winner={state.winner}
        logRef={battleLogRef}
        onAbilityClick={actions.handlePlayerAbility}
        onSwapMonster={actions.handleSwapMonster}
        onRetreat={onRetreat}
        onPlayAgain={onPlayAgain}
        floatingTexts={state.floatingTexts}
        targetingMode={state.targetingMode}
        onTargetSelect={actions.handleTargetSelect}
    />;
};