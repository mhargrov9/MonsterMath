import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useBattleState } from '@/hooks/useBattleState';
import { useBattleSession } from '@/hooks/useBattleSession';
import { PlayerCombatMonster, AiCombatMonster } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import MonsterCard from './MonsterCard';

interface BattleInit {
  battleId: string;
  playerTeam: PlayerCombatMonster[];
  aiTeam: AiCombatMonster[];
}

const CombatSession: React.FC<{
  initialState: BattleInit;
  onRetreat: () => void;
  onPlayAgain: () => void;
}> = ({ initialState, onRetreat, onPlayAgain }) => {
  const { 
    battleState, 
    isPlayerTurn, 
    targetingMode, 
    battleEnded, 
    winner, 
    actions,
    isProcessing,
    error
  } = useBattleState(
    initialState.playerTeam, 
    initialState.aiTeam,
    initialState.battleId
  );

  const battleLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleState.log]);

  const playerMonster = battleState.playerTeam[battleState.activePlayerIndex];
  const opponentMonster = battleState.aiTeam[battleState.activeAiIndex];

  if (!playerMonster || !opponentMonster) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="p-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-center text-white">Initializing Battle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className="text-center text-white mb-4">{error}</p>
            <Button onClick={onPlayAgain} className="w-full">Return to Team Selection</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CombatView
      playerMonster={playerMonster}
      opponentMonster={opponentMonster}
      playerTeam={battleState.playerTeam}
      opponentBench={battleState.aiTeam.filter((_, i) => i !== battleState.activeAiIndex)}
      isPlayerTurn={isPlayerTurn}
      battleLog={battleState.log}
      battleEnded={battleEnded}
      winner={winner}
      logRef={battleLogRef}
      onAbilityClick={actions.handlePlayerAbility}
      onSwapMonster={actions.handleSwapMonster}
      onRetreat={actions.handleForfeit}
      onPlayAgain={onPlayAgain}
      floatingTexts={[]}
      targetingMode={targetingMode}
      onTargetSelect={actions.handleTargetSelect}
    />
  );
};

export default function BattleArena({ onRetreat }: { onRetreat: () => void }) {
  const [mode, setMode] = useState<'team-select' | 'pre-battle' | 'combat' | 'loading'>('loading');
  const [playerTeam, setPlayerTeam] = useState<PlayerCombatMonster[] | null>(null);
  const [leadMonsterId, setLeadMonsterId] = useState<number | null>(null);
  const [battleInit, setBattleInit] = useState<BattleInit | null>(null);
  const { createBattle, checkActiveBattle, isCreatingBattle } = useBattleSession();
  const queryClient = useQueryClient();

  // Check for existing battle on mount
  useEffect(() => {
    const checkExistingBattle = async () => {
      const activeBattle = await checkActiveBattle();

      if (activeBattle) {
        // Resume existing battle
        setBattleInit({
          battleId: activeBattle.battleId,
          playerTeam: activeBattle.state.playerTeam,
          aiTeam: activeBattle.state.aiTeam
        });
        setMode('combat');
      } else {
        // Start fresh
        setMode('team-select');
      }
    };

    checkExistingBattle();
  }, []);

  const handleTeamConfirm = (team: PlayerCombatMonster[]) => {
    if (team.length === 0) {
      return;
    }
    setPlayerTeam(team);
    setLeadMonsterId(team[0].id);
    setMode('pre-battle');
  };

  const handleStartBattle = async () => {
    if (!playerTeam || leadMonsterId === null) return;

    // Reorder team with lead monster first
    const reorderedPlayerTeam = [...playerTeam].sort((a, b) => {
      if (a.id === leadMonsterId) return -1;
      if (b.id === leadMonsterId) return 1;
      return 0;
    });

    const result = await createBattle(reorderedPlayerTeam);

    if (result) {
      setBattleInit({
        battleId: result.battleId,
        playerTeam: reorderedPlayerTeam,
        aiTeam: result.aiTeam
      });
      setMode('combat');
    } else {
      // Error was handled by the hook
      setMode('team-select');
    }
  };

  const resetFlow = () => {
    setPlayerTeam(null);
    setLeadMonsterId(null);
    setBattleInit(null);
    setMode('team-select');

    // Refresh user data to update battle tokens
    queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/user'] });
  };

  if (mode === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="p-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-center text-white">Loading Battle Arena...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'team-select') {
    return <BattleTeamSelector onTeamConfirm={handleTeamConfirm} />;
  }

  if (mode === 'pre-battle' && playerTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-4">
        <h2 className="text-2xl font-bold mb-2">Team Selected!</h2>
        <p className="text-white/80 mb-6">Choose your lead monster.</p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {playerTeam.map(p => (
            <div 
              key={p.id} 
              className={`rounded-lg transition-all cursor-pointer ${
                leadMonsterId === p.id ? 'ring-4 ring-green-500' : 'ring-2 ring-transparent hover:ring-white/30'
              }`}
              onClick={() => setLeadMonsterId(p.id)}
            >
              <MonsterCard 
                monster={p.monster} 
                userMonster={p} 
                size="small"
                isToggleable={false}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Button 
            onClick={handleStartBattle} 
            disabled={isCreatingBattle || !leadMonsterId} 
            size="lg" 
            className="bg-red-600 hover:bg-red-700 min-w-[200px]"
          >
            {isCreatingBattle ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Opponent...
              </>
            ) : (
              'Start Battle!'
            )}
          </Button>
          <Button 
            onClick={resetFlow} 
            variant="link" 
            className="text-white/70 w-full"
          >
            Change Team
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'combat' && battleInit) {
    return (
      <CombatSession 
        initialState={battleInit} 
        onRetreat={onRetreat} 
        onPlayAgain={resetFlow} 
      />
    );
  }

  return null;
}