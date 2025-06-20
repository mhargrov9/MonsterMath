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
  playerTeam: Array<UserMonster & { hp: number; maxHp: number; mp: number; maxMp: number }>;
  aiTeam: Array<AIMonster>;
  activePlayerIndex: number;
  activeAiIndex: number;
  turn: 'player' | 'ai';
  phase: 'select' | 'animate' | 'result' | 'end';
  battleLog: string[];
  winner: 'player' | 'ai' | null;
  currentAnimation: string | null;
  lastDamage: number | null;
  screenShake: boolean;
  actionToasts: Array<{ id: string; text: string; target: 'player' | 'ai'; timestamp: number }>;
}

export default function BattleArena() {
  const [battleMode, setBattleMode] = useState<'selection' | 'combat'>('selection');
  const [selectedTeam, setSelectedTeam] = useState<any[]>([]);
  const [aiOpponent, setAiOpponent] = useState<any>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [hoveredMonster, setHoveredMonster] = useState<{ team: 'player' | 'ai'; index: number } | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [opponentLoadingState, setOpponentLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  // Battle mechanics functions
  const addActionToast = (text: string, target: 'player' | 'ai') => {
    if (!battleState) return;
    
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id: toastId, text, target, timestamp: Date.now() };
    
    setBattleState(prev => ({
      ...prev!,
      actionToasts: [...prev!.actionToasts, newToast],
      battleLog: [...prev!.battleLog, text]
    }));

    // Remove toast after 3 seconds
    setTimeout(() => {
      setBattleState(prev => prev ? ({
        ...prev,
        actionToasts: prev.actionToasts.filter(toast => toast.id !== toastId)
      }) : null);
    }, 3000);
  };

  const calculateDamage = (attacker: any, defender: any, ability: any) => {
    const baseDamage = ability.manaCost === 0 ? 
      Math.floor(attacker.power * 0.6) : // Basic attack
      Math.floor(attacker.power * (ability.manaCost / 40)); // Ability damage scales with mana cost
    
    // Type effectiveness (simplified)
    const typeChart: Record<string, Record<string, number>> = {
      fire: { earth: 1.5, water: 0.5, fire: 1, air: 1, psychic: 1, electric: 1 },
      water: { fire: 1.5, earth: 0.5, water: 1, air: 1, psychic: 1, electric: 1 },
      earth: { air: 1.5, fire: 0.5, water: 1, earth: 1, psychic: 1, electric: 1 },
      air: { water: 1.5, earth: 0.5, fire: 1, air: 1, psychic: 1, electric: 1 },
      psychic: { fire: 1, water: 1, earth: 1, air: 1, psychic: 0.5, electric: 1.5 },
      electric: { water: 1.5, earth: 1, fire: 1, air: 1, psychic: 0.5, electric: 1 }
    };
    
    const attackerType = attacker.type || attacker.monster?.type || 'fire';
    const defenderType = defender.type || defender.monster?.type || 'fire';
    const effectiveness = typeChart[attackerType]?.[defenderType] || 1;
    
    // Defense reduces damage
    const defense = defender.defense || defender.monster?.base_defense || defender.monster?.baseDefense || 50;
    const damageReduction = Math.max(0.1, 1 - (defense / 200));
    
    const finalDamage = Math.floor(baseDamage * effectiveness * damageReduction);
    return Math.max(1, finalDamage); // Minimum 1 damage
  };

  const executePlayerAttack = (ability: any) => {
    if (!battleState || battleState.turn !== 'player' || battleState.phase !== 'select') return;
    
    const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
    const activeAi = battleState.aiTeam[battleState.activeAiIndex];
    
    // Check mana cost
    if (activePlayer.mp < (ability.manaCost || 0)) {
      addActionToast(`${activePlayer.monster.name} doesn't have enough MP!`, 'player');
      return;
    }
    
    setBattleState(prev => ({ ...prev!, phase: 'animate' }));
    
    // Calculate damage
    const damage = calculateDamage(activePlayer, activeAi, ability);
    
    setTimeout(() => {
      setBattleState(prev => {
        if (!prev) return null;
        
        const updatedPlayerTeam = [...prev.playerTeam];
        updatedPlayerTeam[prev.activePlayerIndex] = {
          ...updatedPlayerTeam[prev.activePlayerIndex],
          mp: updatedPlayerTeam[prev.activePlayerIndex].mp - (ability.manaCost || 0)
        };
        
        const updatedAiTeam = [...prev.aiTeam];
        updatedAiTeam[prev.activeAiIndex] = {
          ...updatedAiTeam[prev.activeAiIndex],
          hp: Math.max(0, updatedAiTeam[prev.activeAiIndex].hp - damage)
        };
        
        const newState = {
          ...prev,
          playerTeam: updatedPlayerTeam,
          aiTeam: updatedAiTeam,
          turn: 'ai' as const,
          phase: 'select' as const
        };
        
        // Check for AI defeat
        if (updatedAiTeam[prev.activeAiIndex].hp <= 0) {
          newState.winner = 'player';
          newState.phase = 'end';
        }
        
        return newState;
      });
      
      addActionToast(`${activeAi.name} takes ${damage} damage!`, 'ai');
      if (ability.manaCost > 0) {
        addActionToast(`${activePlayer.monster.name} uses ${ability.name}!`, 'player');
      }
      
      // Start AI turn after delay if battle continues
      if (!battleState.winner) {
        setTimeout(executeAiTurn, 2000);
      }
    }, 500);
  };

  const executeAiTurn = () => {
    if (!battleState || battleState.turn !== 'ai' || battleState.phase !== 'select') return;
    
    const activeAi = battleState.aiTeam[battleState.activeAiIndex];
    const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
    
    // Get AI abilities
    const abilities = [];
    if (activeAi.mp >= 0) {
      abilities.push({ name: 'Basic Attack', manaCost: 0 });
    }
    
    // Parse AI abilities from monster data
    try {
      const monsterAbilities = activeAi.monster?.abilities;
      if (monsterAbilities) {
        Object.entries(monsterAbilities).forEach(([key, value]) => {
          if (key.startsWith('active') && value) {
            const abilityString = value as string;
            const match = abilityString.match(/^([^(]+)\((\d+) MP\)/);
            if (match) {
              const [, name, mpCost] = match;
              const cost = parseInt(mpCost);
              if (activeAi.mp >= cost) {
                abilities.push({ name: name.trim(), manaCost: cost });
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error parsing AI abilities:', error);
    }
    
    if (abilities.length === 0) {
      addActionToast(`${activeAi.name} has no available moves!`, 'ai');
      setBattleState(prev => prev ? ({ ...prev, turn: 'player', phase: 'select' }) : null);
      return;
    }
    
    // Select random ability
    const selectedAbility = abilities[Math.floor(Math.random() * abilities.length)];
    
    setBattleState(prev => ({ ...prev!, phase: 'animate' }));
    
    // Calculate damage
    const damage = calculateDamage(activeAi, activePlayer, selectedAbility);
    
    setTimeout(() => {
      setBattleState(prev => {
        if (!prev) return null;
        
        const updatedAiTeam = [...prev.aiTeam];
        updatedAiTeam[prev.activeAiIndex] = {
          ...updatedAiTeam[prev.activeAiIndex],
          mp: updatedAiTeam[prev.activeAiIndex].mp - selectedAbility.manaCost
        };
        
        const updatedPlayerTeam = [...prev.playerTeam];
        updatedPlayerTeam[prev.activePlayerIndex] = {
          ...updatedPlayerTeam[prev.activePlayerIndex],
          hp: Math.max(0, updatedPlayerTeam[prev.activePlayerIndex].hp - damage)
        };
        
        const newState = {
          ...prev,
          playerTeam: updatedPlayerTeam,
          aiTeam: updatedAiTeam,
          turn: 'player' as const,
          phase: 'select' as const
        };
        
        // Check for player defeat
        if (updatedPlayerTeam[prev.activePlayerIndex].hp <= 0) {
          newState.winner = 'ai';
          newState.phase = 'end';
        }
        
        return newState;
      });
      
      addActionToast(`${activePlayer.monster.name} takes ${damage} damage!`, 'player');
      addActionToast(`${activeAi.name} uses ${selectedAbility.name}!`, 'ai');
    }, 1000);
  };

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

          // Prepare player team with proper HP/MP
          const playerTeam = selectedMonsters.map(monster => ({
            ...monster,
            maxHp: monster.monster.baseHp + ((monster.monster.hpPerLevel || 50) * (monster.level - 1)),
            maxMp: monster.monster.baseMp + ((monster.monster.mpPerLevel || 20) * (monster.level - 1))
          }));

          // Prepare AI team (for now, just use the first monster)
          const aiTeam = [opponentForState];

          setBattleState({
            playerTeam,
            aiTeam,
            activePlayerIndex: 0,
            activeAiIndex: 0,
            turn: 'player' as const,
            phase: 'select' as const,
            battleLog: [`Battle begins! ${playerTeam[0].monster.name} vs ${aiTeam[0].name}!`],
            winner: null,
            currentAnimation: null,
            lastDamage: null,
            screenShake: false,
            actionToasts: []
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
  if (battleMode === 'combat' && opponentLoadingState === 'success' && battleState && battleState.aiTeam.length > 0) {
    const activePlayer = battleState.playerTeam[battleState.activePlayerIndex];
    const activeAi = battleState.aiTeam[battleState.activeAiIndex];
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

          {/* Battle Area with Active Slots and Bench */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Player Team */}
            <div className="space-y-3 relative">
              <h3 className="text-lg font-bold text-center">Your Team</h3>
              
              {/* Active Player Monster */}
              <div className="relative">
                <MonsterCard
                  monster={activePlayer.monster}
                  userMonster={activePlayer}
                  battleMode={true}
                  battleMp={activePlayer.mp}
                  isPlayerTurn={battleState.turn === 'player' && battleState.phase === 'select'}
                  onAttack={executePlayerAttack}
                  size="medium"
                />
                
                {/* Action Toasts for Player */}
                {battleState.actionToasts
                  .filter(toast => toast.target === 'player')
                  .map(toast => (
                    <div
                      key={toast.id}
                      className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-bounce z-20 shadow-lg"
                    >
                      {toast.text}
                    </div>
                  ))
                }
              </div>
              
              {/* Player Bench */}
              {battleState.playerTeam.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {battleState.playerTeam.map((monster, index) => {
                    if (index === battleState.activePlayerIndex) return null;
                    
                    const isHovered = hoveredMonster?.team === 'player' && hoveredMonster?.index === index;
                    
                    return (
                      <div
                        key={`player-bench-${index}`}
                        className={`transition-all duration-300 cursor-pointer ${
                          isHovered ? 'scale-110 z-10' : 'scale-75 opacity-60'
                        }`}
                        onMouseEnter={() => setHoveredMonster({ team: 'player', index })}
                        onMouseLeave={() => setHoveredMonster(null)}
                      >
                        <MonsterCard
                          monster={monster.monster}
                          userMonster={monster}
                          battleMode={true}
                          battleMp={monster.mp}
                          size="small"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Team */}
            <div className="space-y-3 relative">
              <h3 className="text-lg font-bold text-center">Opponent: {aiOpponent?.team?.name || 'Unknown'}</h3>
              
              {/* Active AI Monster */}
              <div className="relative">
                <MonsterCard
                  monster={activeAi.monster}
                  userMonster={{
                    id: 9999,
                    userId: 'ai',
                    monsterId: activeAi.monster.id,
                    level: activeAi.level || 1,
                    power: activeAi.power,
                    speed: activeAi.speed,
                    defense: activeAi.defense,
                    experience: 0,
                    evolutionStage: 4,
                    upgradeChoices: activeAi.upgradeChoices || {},
                    hp: activeAi.hp,
                    maxHp: activeAi.maxHp,
                    mp: activeAi.mp,
                    maxMp: activeAi.maxMp,
                    isShattered: false,
                    acquiredAt: new Date()
                  }}
                  battleMode={true}
                  battleMp={activeAi.mp}
                  size="medium"
                />
                
                {/* Action Toasts for AI */}
                {battleState.actionToasts
                  .filter(toast => toast.target === 'ai')
                  .map(toast => (
                    <div
                      key={toast.id}
                      className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-bounce z-20 shadow-lg"
                    >
                      {toast.text}
                    </div>
                  ))
                }
              </div>
              
              {/* AI Bench */}
              {battleState.aiTeam.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {battleState.aiTeam.map((monster, index) => {
                    if (index === battleState.activeAiIndex) return null;
                    
                    const isHovered = hoveredMonster?.team === 'ai' && hoveredMonster?.index === index;
                    
                    return (
                      <div
                        key={`ai-bench-${index}`}
                        className={`transition-all duration-300 cursor-pointer ${
                          isHovered ? 'scale-110 z-10' : 'scale-75 opacity-60'
                        }`}
                        onMouseEnter={() => setHoveredMonster({ team: 'ai', index })}
                        onMouseLeave={() => setHoveredMonster(null)}
                      >
                        <MonsterCard
                          monster={monster.monster}
                          userMonster={{
                            id: 9998 - index,
                            userId: 'ai',
                            monsterId: monster.monster.id,
                            level: monster.level || 1,
                            power: monster.power,
                            speed: monster.speed,
                            defense: monster.defense,
                            experience: 0,
                            evolutionStage: 4,
                            upgradeChoices: monster.upgradeChoices || {},
                            hp: monster.hp,
                            maxHp: monster.maxHp,
                            mp: monster.mp,
                            maxMp: monster.maxMp,
                            isShattered: false,
                            acquiredAt: new Date()
                          }}
                          battleMode={true}
                          battleMp={monster.mp}
                          size="small"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Turn Indicator */}
          <div className="text-center mb-3 sm:mb-4">
            <Badge variant={battleState.turn === 'player' ? 'default' : 'secondary'} className="text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2">
              {battleState.phase === 'animate' ? 'Attacking...' : 
               battleState.phase === 'end' ? 
                 (battleState.winner === 'player' ? 'Victory!' : 'Defeat!') :
               battleState.turn === 'player' ? 'Your Turn - Select an Attack' : 'AI Turn - Thinking...'}
            </Badge>
          </div>

          {/* Battle Log */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Battle Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                {battleState.battleLog.map((entry, index) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {entry}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Battle End Actions */}
          {battleState.phase === 'end' && (
            <div className="text-center space-y-4">
              <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900 dark:to-yellow-900">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {battleState.winner === 'player' ? '🎉 Victory!' : '💥 Defeat!'}
                  </h2>
                  <p className="text-lg mb-4">
                    {battleState.winner === 'player' 
                      ? 'You earned 10 Diamonds!' 
                      : 'Better luck next time!'}
                  </p>
                  <Button onClick={handleBackToSelection} size="lg">
                    Return to Team Selection
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Selection mode - show team selection interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-3xl text-center">Battle Arena</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-base sm:text-lg text-muted-foreground mb-4">
                Select your monster team and challenge AI opponents in strategic turn-based battles!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    ⚔️ Battle Tokens
                  </Badge>
                  <p className="text-lg sm:text-xl font-bold text-primary">
                    {user?.battleTokens || 0}
                  </p>
                </div>
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