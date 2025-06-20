import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GameUser, UserMonster } from "@/types/game";
import MonsterCard from "./MonsterCard";
import { BattleTeamSelector } from "./BattleTeamSelector";
import { ArrowLeft } from "lucide-react";

// Simplified type for AI monsters within the battle state
interface AIMonster extends Monster {
  hp: number;
  mp: number;
  level: number;
  maxHp: number;
  maxMp: number;
}

// Main battle state structure
interface BattleState {
  playerTeam: Array<UserMonster & { currentHp: number; currentMp: number }>;
  aiTeam: Array<AIMonster>;
  activePlayerIndex: number;
  activeAiIndex: number;
  turn: 'player' | 'ai';
  phase: 'select' | 'animate' | 'result' | 'end';
  battleLog: string[];
  winner: 'player' | 'ai' | null;
  actionToasts: Array<{ id: string; text: string; target: 'player' | 'ai'; timestamp: number }>;
}

export default function BattleArena() {
  const [battleMode, setBattleMode] = useState<'selection' | 'combat'>('selection');
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [opponentLoadingState, setOpponentLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // --- BATTLE LOGIC FUNCTIONS ---

  const handleAttack = (ability: any) => {
    // This is where the full attack, damage, and turn-switching logic will go.
    // For now, we just log it.
    if (battleState?.turn === 'player' && battleState.phase === 'select') {
      const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
      console.log(`${activePlayer.monster.name} uses ${ability.name}!`);
      // Placeholder to show something happening
      setBattleState(prev => prev ? { ...prev, turn: 'ai', battleLog: [...prev.battleLog, `${activePlayer.monster.name} used ${ability.name}!`] } : null);
    }
  };

  // --- BATTLE SETUP AND STATE MANAGEMENT ---

  // --- PASTE THIS FINAL, CORRECTED VERSION ---

  const setupBattle = async (selectedPlayerTeam: UserMonster[]) => {
    if (!selectedPlayerTeam || selectedPlayerTeam.length === 0) {
      toast({ title: "Error", description: "No monsters were selected for battle.", variant: "destructive" });
      return;
    }

    setBattleMode('combat');
    setOpponentLoadingState('loading');

    try {
      const playerTPL = selectedPlayerTeam.reduce((acc, monster) => acc + monster.level, 0);

      const opponentData = await apiRequest('/api/battle/generate-opponent', {
        method: 'POST',
        data: { tpl: playerTPL }
      });

      // This is the corrected logic. The server sends back a 'team' object
      // and a 'scaledMonsters' array. We will use BOTH correctly.
      if (!opponentData || !opponentData.team || !opponentData.scaledMonsters || opponentData.scaledMonsters.length === 0) {
        throw new Error('Opponent response did not contain a valid monster team.');
      }

      // Initialize player team with current HP/MP for this battle
      const playerTeamForBattle = selectedPlayerTeam.map(monster => ({
        ...monster,
        currentHp: monster.hp,
        currentMp: monster.mp
      }));

      // Initialize AI team using the scaledMonsters array
      const aiTeamForBattle = opponentData.scaledMonsters.map((aiMonsterData: any) => ({
        ...aiMonsterData.monster, // The base monster template (name, type, etc.)
        level: aiMonsterData.level,
        hp: aiMonsterData.hp,
        mp: aiMonsterData.mp,
        maxHp: aiMonsterData.hp,
        maxMp: aiMonsterData.mp
      }));

      setBattleState({
        playerTeam: playerTeamForBattle,
        aiTeam: aiTeamForBattle,
        activePlayerIndex: 0,
        activeAiIndex: 0,
        turn: 'player' as const,
        phase: 'select' as const,
        battleLog: [`Battle begins! ${playerTeamForBattle[0].monster.name} vs ${aiTeamForBattle[0].name}!`],
        winner: null,
        actionToasts: []
      });

      setOpponentLoadingState('success');

    } catch (error) {
      console.error('Error setting up battle:', error);
      toast({ title: "Battle Generation Failed", description: error.message || "Could not fetch a valid opponent.", variant: "destructive" });
      setOpponentLoadingState('error');
    }
  };

  // --- END OF THE BLOCK TO PASTE ---

  const handleBackToSelection = () => {
    setBattleMode('selection');
    setBattleState(null);
    setOpponentLoadingState('idle');
  };

  // --- RENDER LOGIC ---

  if (battleMode === 'selection') {
    return <BattleTeamSelector onBattleStart={setupBattle} />;
  }

  // Handle Loading and Error states
  if (opponentLoadingState === 'loading' || opponentLoadingState === 'error' || !battleState) {
    // This is a simplified loading/error view. We can design this more fully later.
    return (
      <div>
        <Button onClick={handleBackToSelection}>Back</Button>
        <h2>{opponentLoadingState === 'loading' ? 'Finding Opponent...' : 'Error Loading Battle'}</h2>
        {opponentLoadingState === 'error' && <p>Could not generate an opponent. Please try again.</p>}
      </div>
    );
  }

  // Main Battle View
  const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
  const activeAi = battleState.aiTeam[battleState.activeAiIndex];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Battle in Progress!</h1>
      <div className="grid grid-cols-2 gap-4">
        {/* Player Side */}
        <div>
          <h2 className="text-xl font-bold">Your Team</h2>
          <MonsterCard
            monster={activePlayer.monster}
            userMonster={activePlayer}
            battleMode={true}
            onAttack={handleAttack}
            isPlayerTurn={battleState.turn === 'player'}
          />
          {/* We will add the bench display here later */}
        </div>
        {/* AI Side */}
        <div>
          <h2 className="text-xl font-bold">Opponent's Team</h2>
          <MonsterCard
            monster={activeAi} // The AI monster object from battle state
            userMonster={null} // It's not a user's monster
            battleMode={true}
            isPlayerTurn={false} // Can't control AI card
          />
          {/* We will add the bench display here later */}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-bold">Battle Log</h3>
        <div>
          {battleState.battleLog.map((log, index) => <div key={index}>{log}</div>)}
        </div>
      </div>
      <Button onClick={handleBackToSelection} className="mt-4">Retreat</Button>
    </div>
  );
}