import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { GameUser, UserMonster, Battle, Monster } from "@/types/game";
import VeoMonster from "./VeoMonster";
import MonsterCard from "./MonsterCard";
import { BattleTeamSelector } from "./BattleTeamSelector";
import { ArrowLeft } from "lucide-react";

interface AttackOption {
  id: string;
  name: string;
  description: string;
  damage: number;
  animation: string;
  manaCost?: number;
  isUpgrade?: boolean;
}

interface AIMonster {
  id: number;
  name: string;
  type: string;
  power: number;
  speed: number;
  defense: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  upgradeChoices?: any;
  monster: any;
}

interface BattleState {
  playerMonster: UserMonster & { hp: number; maxHp: number; mp: number; maxMp: number };
  aiMonster: AIMonster;
  turn: 'player' | 'ai';
  phase: 'select' | 'animate' | 'result' | 'end';
  battleLog: string[];
  winner: 'player' | 'ai' | null;
  currentAnimation: string | null;
  lastDamage: number | null;
  screenShake: boolean;
}

export default function BattleArena() {
  const [battleMode, setBattleMode] = useState<'selection' | 'combat'>('selection');
  const [selectedTeam, setSelectedTeam] = useState<any[]>([]);
  const [aiOpponent, setAiOpponent] = useState<any>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [opponentLoadingState, setOpponentLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  // This function follows the exact pseudocode logic provided
 
  // This is the new, corrected function
  const setupBattleArena = async (selectedMonsters: any[]) => {
    console.log('setupBattleArena called with:', selectedMonsters);

    // Validate player monsters
    if (!selectedMonsters || selectedMonsters.length === 0) {
      console.error('No selected monsters provided');
      return;
    }

    // Set loading state immediately
    setSelectedTeam(selectedMonsters);
    setBattleMode('combat');
    setOpponentLoadingState('loading');
    setAiOpponent(null);
    setBattleState(null);

    try {
      // **THE FIX IS HERE:** Calculate TPL and include it in the request body
      const playerTPL = selectedMonsters.reduce((acc, monster) => acc + monster.level, 0);
      console.log(`Calculated Player TPL: ${playerTPL}`);

      const opponentTeamData = await apiRequest('/api/battle/generate-opponent', {
        method: 'POST',
        data: { tpl: playerTPL } // Sending the TPL to the server
      });

      console.log('Received opponent data:', opponentTeamData);

      // Check if the data structure is valid
      if (opponentTeamData && opponentTeamData.team && opponentTeamData.team.monsters && opponentTeamData.team.monsters.length > 0) {
        const aiMonster = opponentTeamData.team.monsters[0];

        // Additional validation
        if (aiMonster && aiMonster.name) {
          console.log('Valid opponent data received, setting up battle');
          setOpponentLoadingState('success');

          // Create opponent object with proper structure for battle state
          const opponentForState = {
            id: aiMonster.id,
            name: aiMonster.name,
            type: aiMonster.type,
            power: aiMonster.base_power || aiMonster.basePower,
            speed: aiMonster.base_speed || aiMonster.baseSpeed,
            defense: aiMonster.base_defense || aiMonster.baseDefense,
            hp: aiMonsterData.hp,
            maxHp: aiMonsterData.hp,
            mp: aiMonsterData.mp,
            maxMp: aiMonsterData.mp,
            level: aiMonsterData.level,
            monster: aiMonster,
            upgradeChoices: {}
          };

          const playerMonster = selectedMonsters[0];
          setBattleState({
            playerMonster: {
              ...playerMonster,
              maxHp: playerMonster.monster.baseHp + ((playerMonster.monster.hpPerLevel || 50) * (playerMonster.level - 1)),
              maxMp: playerMonster.monster.baseMp + ((playerMonster.monster.mpPerLevel || 20) * (playerMonster.level - 1))
            },
            aiMonster: opponentForState,
            turn: 'player' as const,
            phase: 'select' as const,
            battleLog: [`Battle begins! ${playerMonster.monster.name} vs ${opponentForState.name}!`],
            winner: null,
            currentAnimation: null,
            lastDamage: null,
            screenShake: false
          });
        } else {
           console.error('Invalid AI monster structure:', aiMonster);
           setOpponentLoadingState('error');
        }
      } else {
        console.error('Invalid or empty opponent team data:', opponentTeamData);
        setOpponentLoadingState('error');
      }
    } catch (error) {
      console.error('Error fetching opponent data:', error);
      setOpponentLoadingState('error');
    }
  };
  // Updated handler that calls the new setup function
  const handleBattleStart = (selectedMonsters: any[], generatedOpponent?: any) => {
    // If opponent is already generated (from BattleTeamSelector), use the new setup
    if (!generatedOpponent) {
      setupBattleArena(selectedMonsters);
    } else {
      // Legacy path for pre-generated opponents (fallback)
      console.log('Using pre-generated opponent (legacy path)');
      setSelectedTeam(selectedMonsters);
      setAiOpponent(generatedOpponent);
      setBattleMode('combat');
      setOpponentLoadingState('success');
      
      const playerMonster = selectedMonsters[0];
      const aiMonster = generatedOpponent.scaledMonsters[0];
      
      if (aiMonster && aiMonster.monster && aiMonster.monster.name) {
        setBattleState({
          playerMonster: {
            ...playerMonster,
            hp: playerMonster.hp,
            maxHp: playerMonster.monster.baseHp + ((playerMonster.monster.hpPerLevel || 50) * (playerMonster.level - 1)),
            mp: playerMonster.mp,
            maxMp: playerMonster.monster.baseMp + ((playerMonster.monster.mpPerLevel || 20) * (playerMonster.level - 1))
          },
          aiMonster: {
            id: aiMonster.monster.id,
            name: aiMonster.monster.name,
            type: aiMonster.monster.type,
            power: aiMonster.monster.base_power || aiMonster.monster.basePower,
            speed: aiMonster.monster.base_speed || aiMonster.monster.baseSpeed,
            defense: aiMonster.monster.base_defense || aiMonster.monster.baseDefense,
            hp: aiMonster.hp,
            maxHp: aiMonster.hp,
            mp: aiMonster.mp,
            maxMp: aiMonster.mp,
            level: aiMonster.level,
            monster: aiMonster.monster,
            upgradeChoices: {}
          },
          turn: 'player' as const,
          phase: 'select' as const,
          battleLog: [`Battle begins! ${playerMonster.monster.name} vs ${aiMonster.monster.name}!`],
          winner: null,
          currentAnimation: null,
          lastDamage: null,
          screenShake: false
        });
      } else {
        setOpponentLoadingState('error');
      }
    }
  };

  const handleBackToSelection = () => {
    setBattleMode('selection');
    setSelectedTeam([]);
    setAiOpponent(null);
    setBattleState(null);
    setOpponentLoadingState('idle');
  };

  // Function that handles drawing the opponent card based on state (matches pseudocode)
  const displayOpponentCard = () => {
    if (opponentLoadingState === 'loading') {
      return (
        <Card className="h-96 flex items-center justify-center">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg mb-2">Waiting for opponent...</h3>
              <div className="text-sm">Generating AI team</div>
            </div>
          </CardContent>
        </Card>
      );
    } else if (opponentLoadingState === 'error') {
      return (
        <Card className="h-96 flex items-center justify-center">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <h3 className="text-lg mb-2">Error: Could not load opponent</h3>
              <div className="text-sm">Please try again</div>
              <Button 
                onClick={handleBackToSelection}
                variant="outline"
                className="mt-4"
              >
                Back to Team Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    } else if (opponentLoadingState === 'success' && battleState && battleState.aiMonster && battleState.aiMonster.monster && battleState.aiMonster.monster.name) {
      // Now, and ONLY now, do we try to read the monster's name and render the full card
      return (
        <MonsterCard
          monster={battleState.aiMonster.monster}
          userMonster={{
            id: 9999,
            userId: 'ai',
            monsterId: battleState.aiMonster.monster.id,
            level: battleState.aiMonster.level || 1,
            power: battleState.aiMonster.power,
            speed: battleState.aiMonster.speed,
            defense: battleState.aiMonster.defense,
            experience: 0,
            evolutionStage: 4,
            upgradeChoices: battleState.aiMonster.upgradeChoices || {},
            hp: battleState.aiMonster.hp,
            maxHp: battleState.aiMonster.maxHp,
            mp: battleState.aiMonster.mp,
            maxMp: battleState.aiMonster.maxMp,
            isShattered: false,
            acquiredAt: new Date()
          }}
          battleMode={true}
          battleMp={battleState.aiMonster.mp}
          size="medium"
        />
      );
    } else {
      // Default state - should not happen, but provides safety
      return (
        <Card className="h-96 flex items-center justify-center">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <div className="text-lg">No opponent selected</div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  // Loading/preparation state when battle mode is active but not fully ready
  if (battleMode === 'combat' && (opponentLoadingState === 'loading' || opponentLoadingState === 'error' || !battleState)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToSelection}
                    className="touch-manipulation min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Team Selection
                  </Button>
                  <CardTitle className="text-lg sm:text-2xl">
                    {opponentLoadingState === 'loading' ? 'Preparing Battle...' : 
                     opponentLoadingState === 'error' ? 'Battle Setup Failed' : 'Setting Up Battle'}
                  </CardTitle>
                </div>
                <Badge variant={opponentLoadingState === 'error' ? 'destructive' : 'secondary'} className="text-xs sm:text-sm">
                  {opponentLoadingState === 'loading' ? 'Loading' : 
                   opponentLoadingState === 'error' ? 'Error' : 'Preparing'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Battle Preparation Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Player Monster - Show selected if available */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-center">Your Monster</h3>
              {selectedTeam && selectedTeam.length > 0 ? (
                <MonsterCard
                  monster={selectedTeam[0].monster}
                  userMonster={selectedTeam[0]}
                  battleMode={false}
                  size="medium"
                />
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent>
                    <div className="text-center text-muted-foreground">
                      <div className="animate-pulse">Preparing your monster...</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Opponent Monster - Use displayOpponentCard function */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-center">
                {opponentLoadingState === 'success' && aiOpponent?.team?.name ? 
                  `Opponent: ${aiOpponent.team.name}` : 'Opponent'}
              </h3>
              {displayOpponentCard()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Save monster stats mutation
  const saveMonsterStatsMutation = useMutation({
    mutationFn: async ({ monsterId, hp, mp }: { monsterId: number; hp: number; mp: number }) => {
      return await apiRequest("POST", "/api/battles/complete", {
        monsterId,
        hp,
        mp
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });

  const retreatFromBattle = () => {
    if (battleState) {
      saveMonsterStatsMutation.mutate({
        monsterId: battleState.playerMonster.id,
        hp: battleState.playerMonster.hp,
        mp: battleState.playerMonster.mp
      });
    }
    handleBackToSelection();
  };

  // Show team selection screen if not in combat mode
  if (battleMode === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Battle Arena</h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Assemble your team and challenge dynamic AI opponents
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Battle Tokens</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {user?.battleTokens || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Selection Component */}
          <BattleTeamSelector onBattleStart={handleBattleStart} />
        </div>
      </div>
    );
  }

  // Combat mode - show the battle interface (only when fully loaded and successful)
  if (battleMode === 'combat' && opponentLoadingState === 'success' && battleState && battleState.aiMonster && battleState.aiMonster.monster && battleState.aiMonster.monster.name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
          {/* Battle Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToSelection}
                    className="touch-manipulation min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Team Selection
                  </Button>
                  <CardTitle className="text-lg sm:text-2xl">Battle in Progress</CardTitle>
                </div>
                <Badge variant={battleState.winner ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                  {battleState.winner ? 
                    (battleState.winner === 'player' ? 'Victory!' : 'Defeat!') : 
                    'In Combat'
                  }
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Battle Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Player Monster */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-center">Your Monster</h3>
              <MonsterCard
                monster={battleState.playerMonster.monster}
                userMonster={battleState.playerMonster}
                battleMode={true}
                battleMp={battleState.playerMonster.mp}
                isPlayerTurn={battleState.turn === 'player' && battleState.phase === 'select'}
                onAttack={(ability: any) => {
                  console.log('Attack clicked!');
                  if (battleState.turn === 'player') {
                    console.log('Player can attack');
                  }
                }}
                size="medium"
              />
            </div>

            {/* AI Monster - Now safely rendered since we're in the success state */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-center">Opponent: {aiOpponent?.team?.name || 'Unknown'}</h3>
              <MonsterCard
                monster={battleState.aiMonster.monster}
                userMonster={{
                  id: 9999,
                  userId: 'ai',
                  monsterId: battleState.aiMonster.monster.id,
                  level: battleState.aiMonster.level || 1,
                  power: battleState.aiMonster.power,
                  speed: battleState.aiMonster.speed,
                  defense: battleState.aiMonster.defense,
                  experience: 0,
                  evolutionStage: 4,
                  upgradeChoices: battleState.aiMonster.upgradeChoices || {},
                  hp: battleState.aiMonster.hp,
                  maxHp: battleState.aiMonster.maxHp,
                  mp: battleState.aiMonster.mp,
                  maxMp: battleState.aiMonster.maxMp,
                  isShattered: false,
                  acquiredAt: new Date()
                }}
                battleMode={true}
                battleMp={battleState.aiMonster.mp}
                size="medium"
              />
            </div>
          </div>

          {/* Turn Indicator */}
          <div className="text-center mb-3 sm:mb-4">
            <Badge variant={battleState.turn === 'player' ? 'default' : 'secondary'} className="text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2">
              {battleState.phase === 'animate' ? 'Attacking...' : 
               battleState.phase === 'end' ? 'Battle Complete!' :
               battleState.turn === 'player' ? 'Your Turn' : 'Opponent Turn'}
            </Badge>
          </div>

          {/* Retreat Button */}
          {battleState.turn === 'player' && battleState.phase === 'select' && !battleState.winner && (
            <div className="text-center mb-3 sm:mb-4">
              <Button 
                variant="destructive" 
                onClick={retreatFromBattle}
                disabled={saveMonsterStatsMutation.isPending}
                className="bg-red-600 hover:bg-red-700 touch-manipulation min-h-[44px] px-4 sm:px-6"
              >
                {saveMonsterStatsMutation.isPending ? 'Retreating...' : 'Retreat from Battle'}
              </Button>
            </div>
          )}

          {/* Battle Log */}
          <Card>
            <CardContent className="p-3 sm:p-6">
              <h3 className="text-lg font-bold mb-3">Battle Log</h3>
              <div className="border rounded p-2 sm:p-3 h-24 sm:h-32 overflow-y-auto bg-muted/50">
                <div className="text-xs sm:text-sm space-y-1">
                  {battleState.battleLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <div>Loading battle...</div>;
}