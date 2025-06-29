import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useBattleState } from '@/hooks/useBattleState';
import { PlayerCombatMonster, AiCombatMonster } from '@/types/game';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import MonsterCard from './MonsterCard';

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

  return <CombatView {...state} {...actions} logRef={battleLogRef} onRetreat={onRetreat} onPlayAgain={onPlayAgain} floatingTexts={[]} targetingMode={null} onTargetSelect={() => {}} />;
};

export default function BattleArena({ onRetreat }: { onRetreat: () => void }) {
  const [mode, setMode] = useState<'team-select' | 'pre-battle' | 'combat'>('team-select');
  const [playerTeam, setPlayerTeam] = useState<PlayerCombatMonster[] | null>(null);
  const [leadMonsterId, setLeadMonsterId] = useState<number | null>(null);
  const [battleInit, setBattleInit] = useState<BattleInit | null>(null);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleTeamConfirm = (team: PlayerCombatMonster[]) => {
    setPlayerTeam(team);
    setLeadMonsterId(team.length > 0 ? team[0].id : null); // Default to the first monster
    setMode('pre-battle');
  };

  const handleStartBattle = async () => {
    if (!playerTeam || leadMonsterId === null) return;
    setIsStartingBattle(true);

    // --- THIS IS THE FIX ---
    // Reorder the team so the selected lead monster is at the front (index 0).
    const reorderedPlayerTeam = [...playerTeam].sort((a, b) => {
        if (a.id === leadMonsterId) return -1;
        if (b.id === leadMonsterId) return 1;
        return 0;
    });

    try {
      await apiRequest("/api/battle/spend-token", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      const tpl = reorderedPlayerTeam.reduce((total, m) => total + m.level, 0);
      const opponentResponse = await apiRequest("/api/battle/generate-opponent", { method: "POST", data: { tpl } });
      const opponentData = await opponentResponse.json();

      setBattleInit({ playerTeam: reorderedPlayerTeam, aiTeam: opponentData.scaledMonsters });
      setMode('combat');
    } catch (error: any) {
      toast({ title: "An Error Occurred", description: (error as Error).message || "Could not start the battle.", variant: "destructive" });
      setIsStartingBattle(false);
    }
  };

  const resetFlow = () => {
      setPlayerTeam(null);
      setLeadMonsterId(null);
      setBattleInit(null);
      setIsStartingBattle(false);
      setMode('team-select');
  }

  if (mode === 'team-select') {
    return <BattleTeamSelector onTeamConfirm={handleTeamConfirm} />;
  }

  if (mode === 'pre-battle' && playerTeam) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-white">
            <h2 className="text-2xl mb-2">Team Selected!</h2>
            <p className="text-white/80 mb-6">Choose your lead monster.</p>
            <div className="flex gap-4 mb-8">
                {playerTeam.map(p => (
                    <div key={p.id} className={`transition-all ${leadMonsterId === p.id ? 'ring-4 ring-green-500 rounded-lg' : ''}`}>
                        <MonsterCard 
                            monster={p.monster} 
                            userMonster={p} 
                            size="small"
                            onCardClick={() => setLeadMonsterId(p.id)}
                            isToggleable={false}
                         />
                    </div>
                ))}
            </div>
            <Button onClick={handleStartBattle} disabled={isStartingBattle || !leadMonsterId} size="lg" className="bg-red-600 hover:bg-red-700">
                {isStartingBattle ? "Finding Opponent..." : "Start Battle!"}
            </Button>
            <Button onClick={resetFlow} variant="link" className="mt-4">Change Team</Button>
        </div>
    )
  }

  if (mode === 'combat' && battleInit) {
    return <CombatSession initialState={battleInit} onRetreat={onRetreat} onPlayAgain={resetFlow} />;
  }

  return null;
}