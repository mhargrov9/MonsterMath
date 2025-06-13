import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { GameUser, UserMonster, Battle } from "@/types/game";
import UltraDetailedMonsterGraphics from "./UltraDetailedMonsterGraphics";

interface AttackOption {
  id: string;
  name: string;
  description: string;
  damage: number;
  animation: string;
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
  upgradeChoices: Record<string, any>;
}

interface BattleState {
  playerMonster: UserMonster & { hp: number; maxHp: number };
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
  const [selectedOpponent, setSelectedOpponent] = useState<any | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const { toast } = useToast();

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  const { data: userMonsters = [], isLoading: monstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  const { data: battleHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/battle/history"],
  });

  // AI opponents with their monsters
  const aiOpponents = [
    { 
      id: 'ai-1', 
      name: 'Professor Quibble', 
      difficulty: 'Easy', 
      totalPower: 120, 
      description: 'Your friendly academy instructor', 
      color: '#10B981',
      monster: { id: 1, name: 'Academic Phoenix', type: 'fire', power: 80, speed: 70, defense: 60, upgradeChoices: { wings: 'flame', tail: 'normal' } }
    },
    { 
      id: 'ai-2', 
      name: 'Scholar Maya', 
      difficulty: 'Easy', 
      totalPower: 140, 
      description: 'A dedicated student from the crystal caves', 
      color: '#10B981',
      monster: { id: 4, name: 'Study Golem', type: 'earth', power: 90, speed: 50, defense: 80, upgradeChoices: { spikes: 'metallic', muscles: 'enhanced' } }
    },
    { 
      id: 'ai-3', 
      name: 'Wizard Finn', 
      difficulty: 'Medium', 
      totalPower: 180, 
      description: 'Master of elemental magic', 
      color: '#F59E0B',
      monster: { id: 3, name: 'Mystic Dragon', type: 'air', power: 120, speed: 90, defense: 70, upgradeChoices: { wings: 'storm', teeth: 'razor' } }
    },
    { 
      id: 'ai-4', 
      name: 'Knight Vera', 
      difficulty: 'Medium', 
      totalPower: 200, 
      description: 'Defender of the monster realm', 
      color: '#F59E0B',
      monster: { id: 4, name: 'Guardian Titan', type: 'earth', power: 110, speed: 60, defense: 130, upgradeChoices: { spikes: 'metallic', wings: 'crystal' } }
    },
    { 
      id: 'ai-5', 
      name: 'Sage Kael', 
      difficulty: 'Medium', 
      totalPower: 220, 
      description: 'Ancient keeper of monster wisdom', 
      color: '#F59E0B',
      monster: { id: 2, name: 'Ancient Leviathan', type: 'water', power: 130, speed: 80, defense: 90, upgradeChoices: { tail: 'spiked', wings: 'water' } }
    },
    { 
      id: 'ai-6', 
      name: 'Champion Zara', 
      difficulty: 'Hard', 
      totalPower: 250, 
      description: 'Undefeated arena champion', 
      color: '#EF4444',
      monster: { id: 1, name: 'Champion Phoenix', type: 'fire', power: 150, speed: 120, defense: 80, upgradeChoices: { wings: 'flame', tail: 'flame', teeth: 'razor' } }
    },
    { 
      id: 'ai-7', 
      name: 'Lord Draven', 
      difficulty: 'Hard', 
      totalPower: 280, 
      description: 'Dark master of shadow monsters', 
      color: '#EF4444',
      monster: { id: 3, name: 'Shadow Dragon', type: 'air', power: 160, speed: 110, defense: 90, upgradeChoices: { wings: 'storm', teeth: 'razor', spikes: 'metallic' } }
    },
    { 
      id: 'ai-8', 
      name: 'Empress Luna', 
      difficulty: 'Hard', 
      totalPower: 300, 
      description: 'Ruler of the celestial beasts', 
      color: '#EF4444',
      monster: { id: 2, name: 'Celestial Leviathan', type: 'water', power: 170, speed: 100, defense: 130, upgradeChoices: { tail: 'spiked', wings: 'water', teeth: 'razor' } }
    },
    { 
      id: 'ai-9', 
      name: 'Titan Rex', 
      difficulty: 'Expert', 
      totalPower: 350, 
      description: 'Legendary monster tamer', 
      color: '#8B5CF6',
      monster: { id: 4, name: 'Legendary Titan', type: 'earth', power: 200, speed: 80, defense: 170, upgradeChoices: { spikes: 'metallic', wings: 'crystal', muscles: 'enhanced', tail: 'crystal' } }
    },
    { 
      id: 'ai-10', 
      name: 'Supreme Aether', 
      difficulty: 'Expert', 
      totalPower: 400, 
      description: 'The ultimate monster master', 
      color: '#8B5CF6',
      monster: { id: 3, name: 'Supreme Dragon', type: 'air', power: 220, speed: 150, defense: 130, upgradeChoices: { wings: 'storm', teeth: 'razor', spikes: 'metallic', muscles: 'enhanced' } }
    },
  ];

  const canBattle = user && user.battleTokens > 0;
  const nextTokenProgress = user ? (user.correctAnswers % 1) : 0;

  // Animation helper functions
  const getPlayerAnimationClass = () => {
    if (!battleState?.currentAnimation) return 'scale-100';
    
    const anim = battleState.currentAnimation;
    const isPlayerTurn = battleState.turn === 'player';
    
    if (isPlayerTurn) {
      if (anim.includes('windup')) return 'scale-110 -rotate-12';
      if (anim.includes('strike')) return 'scale-125 translate-x-12 rotate-6';
      if (anim.includes('impact')) return 'scale-115 translate-x-8';
      if (anim.includes('return')) return 'scale-105 translate-x-2';
    } else {
      // Player is being attacked - recoil animation
      if (anim.includes('impact')) return 'scale-95 -translate-x-6 rotate-3';
    }
    
    return 'scale-100';
  };

  const getAIAnimationClass = () => {
    if (!battleState?.currentAnimation) return 'scale-100';
    
    const anim = battleState.currentAnimation;
    const isAITurn = battleState.turn === 'ai';
    
    if (isAITurn) {
      if (anim.includes('windup')) return 'scale-110 rotate-12';
      if (anim.includes('strike')) return 'scale-125 -translate-x-12 -rotate-6';
      if (anim.includes('impact')) return 'scale-115 -translate-x-8';
      if (anim.includes('return')) return 'scale-105 -translate-x-2';
    } else {
      // AI is being attacked - recoil animation
      if (anim.includes('impact')) return 'scale-95 translate-x-6 -rotate-3';
    }
    
    return 'scale-100';
  };

  // Get attack options for a monster
  const getAttackOptions = (monster: UserMonster | AIMonster, upgradeChoices: Record<string, any>): AttackOption[] => {
    const attacks: AttackOption[] = [];
    
    // Default attacks based on monster type
    const defaultAttacks = {
      1: { id: 'peck', name: 'Razor Peck', description: 'Sharp beak attack', damage: 25, animation: 'peck' },
      2: { id: 'bite', name: 'Crushing Bite', description: 'Powerful jaw attack', damage: 30, animation: 'bite' },
      3: { id: 'claw', name: 'Dragon Claw', description: 'Slashing claw attack', damage: 28, animation: 'claw' },
      4: { id: 'punch', name: 'Titan Punch', description: 'Massive fist attack', damage: 35, animation: 'punch' }
    };

    const monsterId = 'monsterId' in monster ? monster.monsterId : monster.id;
    const defaultAttack = defaultAttacks[monsterId as keyof typeof defaultAttacks];
    if (defaultAttack) {
      attacks.push(defaultAttack);
    }

    // Upgrade attacks
    if (upgradeChoices?.tail === 'flame' && monsterId === 1) {
      attacks.push({ id: 'flame-tail', name: 'Flame Tail Whip', description: 'Fiery tail attack', damage: 45, animation: 'tail-whip', isUpgrade: true });
    }
    if (upgradeChoices?.tail === 'spiked' && monsterId === 2) {
      attacks.push({ id: 'spike-tail', name: 'Spiked Tail Slam', description: 'Devastating tail attack', damage: 50, animation: 'tail-slam', isUpgrade: true });
    }
    if (upgradeChoices?.wings === 'storm' && monsterId === 3) {
      attacks.push({ id: 'lightning-breath', name: 'Lightning Breath', description: 'Electric breath attack', damage: 55, animation: 'breath', isUpgrade: true });
    }
    if (upgradeChoices?.spikes === 'metallic' && monsterId === 4) {
      attacks.push({ id: 'spike-barrage', name: 'Spike Barrage', description: 'Shooting metallic spikes', damage: 40, animation: 'spike-shot', isUpgrade: true });
    }
    if (upgradeChoices?.wings === 'flame' && monsterId === 1) {
      attacks.push({ id: 'fire-burst', name: 'Fire Wing Burst', description: 'Explosive wing attack', damage: 38, animation: 'wing-burst', isUpgrade: true });
    }
    if (upgradeChoices?.teeth === 'razor' && [1,2,3].includes(monsterId)) {
      attacks.push({ id: 'razor-bite', name: 'Razor Fang Strike', description: 'Enhanced bite attack', damage: 42, animation: 'enhanced-bite', isUpgrade: true });
    }

    return attacks;
  };

  // Calculate damage
  const calculateDamage = (attacker: UserMonster & { hp: number; maxHp: number } | AIMonster, defender: UserMonster & { hp: number; maxHp: number } | AIMonster, attackDamage: number): number => {
    const attackPower = attacker.power;
    const defenderDefense = defender.defense;
    
    const baseDamage = attackDamage + (attackPower * 0.5);
    const reducedDamage = Math.max(1, baseDamage - (defenderDefense * 0.3));
    
    return Math.floor(reducedDamage + (Math.random() * 10 - 5)); // ±5 random variance
  };

  // Start battle
  const startBattle = (opponent: any, monster: UserMonster) => {
    const aiMonster: AIMonster = {
      ...opponent.monster,
      hp: opponent.monster.power + opponent.monster.defense,
      maxHp: opponent.monster.power + opponent.monster.defense
    };

    const playerMonster = {
      ...monster,
      hp: monster.power + monster.defense,
      maxHp: monster.power + monster.defense
    };

    setBattleState({
      playerMonster,
      aiMonster,
      turn: playerMonster.speed >= aiMonster.speed ? 'player' : 'ai',
      phase: 'select',
      battleLog: [`Battle begins! ${monster.monster.name} vs ${aiMonster.name}!`],
      winner: null,
      currentAnimation: null,
      lastDamage: null,
      screenShake: false
    });
  };

  // Execute attack
  const executeAttack = (attacker: 'player' | 'ai', attack: AttackOption) => {
    if (!battleState) return;

    setBattleState(prev => ({
      ...prev!,
      phase: 'animate',
      currentAnimation: attack.animation
    }));

    setAnimationKey(prev => prev + 1);

    // Multi-stage animation sequence
    const attackSequence = async () => {
      // Stage 1: Attacker wind-up (500ms)
      setBattleState(prev => ({ ...prev!, currentAnimation: `${attack.animation}-windup` }));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Attack motion (300ms)
      setBattleState(prev => ({ ...prev!, currentAnimation: `${attack.animation}-strike` }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Stage 3: Impact and defender recoil (400ms)
      const isPlayerAttacking = attacker === 'player';
      const attackerMonster = isPlayerAttacking ? battleState.playerMonster : battleState.aiMonster;
      const defenderMonster = isPlayerAttacking ? battleState.aiMonster : battleState.playerMonster;
      const damage = calculateDamage(attackerMonster, defenderMonster, attack.damage);
      
      setBattleState(prev => ({ 
        ...prev!, 
        currentAnimation: `${attack.animation}-impact`,
        lastDamage: damage,
        screenShake: true
      }));
      await new Promise(resolve => setTimeout(resolve, 400));

      // Stage 4: Return to position (300ms)
      setBattleState(prev => ({ 
        ...prev!, 
        currentAnimation: `${attack.animation}-return`,
        screenShake: false
      }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update battle state with damage
      const newDefenderHp = Math.max(0, defenderMonster.hp - damage);
      const attackerName = isPlayerAttacking ? battleState.playerMonster.monster.name : battleState.aiMonster.name;
      const defenderName = isPlayerAttacking ? battleState.aiMonster.name : battleState.playerMonster.monster.name;

      setBattleState(prev => {
        const newState = { ...prev! };
        newState.battleLog = [...prev!.battleLog, `${attackerName} uses ${attack.name} for ${damage} damage!`];
        
        if (isPlayerAttacking) {
          newState.aiMonster.hp = newDefenderHp;
        } else {
          newState.playerMonster.hp = newDefenderHp;
        }

        // Check for winner
        if (newDefenderHp <= 0) {
          newState.winner = isPlayerAttacking ? 'player' : 'ai';
          newState.phase = 'end';
          newState.battleLog.push(`${defenderName} is defeated! ${attackerName} wins!`);
        } else {
          newState.turn = isPlayerAttacking ? 'ai' : 'player';
          newState.phase = 'select';
        }
        
        newState.currentAnimation = null;
        newState.lastDamage = null;
        return newState;
      });
    };

    attackSequence();
  };

  // AI turn
  useEffect(() => {
    if (battleState && battleState.turn === 'ai' && battleState.phase === 'select' && !battleState.winner) {
      const aiAttacks = getAttackOptions(battleState.aiMonster, battleState.aiMonster.upgradeChoices);
      const randomAttack = aiAttacks[Math.floor(Math.random() * aiAttacks.length)];
      
      setTimeout(() => {
        executeAttack('ai', randomAttack);
      }, 1500);
    }
  }, [battleState?.turn, battleState?.phase]);

  const challengeMutation = useMutation({
    mutationFn: async ({ opponentId, monsterId }: {
      opponentId: string;
      monsterId: number;
    }): Promise<any> => {
      const response = await apiRequest("POST", "/api/battles/challenge-ai", { 
        opponentId, 
        monsterId,
        goldFee: 10
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Battle Complete!",
        description: data.result === "victory" 
          ? `You won! Earned ${data.diamondsAwarded} diamonds!`
          : "You lost, but gained valuable experience!",
        variant: data.result === "victory" ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battle/history"] });
      setBattleState(null);
      setSelectedOpponent(null);
      setSelectedMonster(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Battle Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete battle
  const completeBattle = () => {
    if (!battleState || !selectedOpponent || !selectedMonster) return;
    
    challengeMutation.mutate({
      opponentId: selectedOpponent.id,
      monsterId: selectedMonster.id
    });
  };

  if (battleState) {
    const playerAttacks = getAttackOptions(battleState.playerMonster, battleState.playerMonster.upgradeChoices);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Battle Arena</CardTitle>
            <div className="text-center text-sm text-muted-foreground">
              {battleState.playerMonster.monster.name} vs {battleState.aiMonster.name}
            </div>
          </CardHeader>
          <CardContent>
            {/* Battle Field */}
            <div className={`flex items-center justify-between mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-6 rounded-lg relative overflow-hidden transition-all duration-100 ${
              battleState.screenShake ? 'animate-pulse transform translate-x-1' : ''
            }`}>
              {/* Player Monster */}
              <div className="text-center">
                <div className={`transform transition-all duration-300 ease-out ${
                  (() => {
                    if (!battleState?.currentAnimation) return 'scale-100';
                    
                    const anim = battleState.currentAnimation;
                    const isPlayerTurn = battleState.turn === 'player';
                    
                    if (isPlayerTurn) {
                      if (anim.includes('windup')) return 'scale-110 -rotate-12';
                      if (anim.includes('strike')) return 'scale-125 translate-x-12 rotate-6';
                      if (anim.includes('impact')) return 'scale-115 translate-x-8';
                      if (anim.includes('return')) return 'scale-105 translate-x-2';
                    } else {
                      // Player is being attacked - recoil animation
                      if (anim.includes('impact')) return 'scale-95 -translate-x-6 rotate-3';
                    }
                    
                    return 'scale-100';
                  })()
                }`} key={`player-${animationKey}`}>
                  <UltraDetailedMonsterGraphics
                    monsterId={battleState.playerMonster.monsterId}
                    evolutionStage={battleState.playerMonster.evolutionStage}
                    upgradeChoices={battleState.playerMonster.upgradeChoices}
                    size="medium"
                  />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">{battleState.playerMonster.monster.name}</div>
                  <div className="text-sm text-muted-foreground">Level {battleState.playerMonster.level}</div>
                  <Progress 
                    value={(battleState.playerMonster.hp / battleState.playerMonster.maxHp) * 100} 
                    className="w-32 mt-1"
                  />
                  <div className="text-xs">{battleState.playerMonster.hp}/{battleState.playerMonster.maxHp} HP</div>
                </div>
              </div>

              {/* Battle Effects */}
              {battleState.currentAnimation?.includes('impact') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-6xl animate-ping">💥</div>
                  <div className="absolute text-2xl font-bold text-red-500 animate-bounce">
                    {battleState.currentAnimation.includes('punch') ? 'SMASH!' :
                     battleState.currentAnimation.includes('claw') ? 'SLASH!' :
                     battleState.currentAnimation.includes('bite') ? 'CHOMP!' :
                     battleState.currentAnimation.includes('peck') ? 'STRIKE!' : 'HIT!'}
                  </div>
                </div>
              )}

              {/* VS */}
              <div className={`text-4xl font-bold text-purple-600 dark:text-purple-400 transition-all duration-300 ${
                battleState.currentAnimation?.includes('impact') ? 'scale-150 animate-pulse' : 'scale-100'
              }`}>VS</div>

              {/* AI Monster */}
              <div className="text-center">
                <div className={`transform transition-all duration-300 ease-out ${
                  (() => {
                    if (!battleState?.currentAnimation) return 'scale-100';
                    
                    const anim = battleState.currentAnimation;
                    const isAITurn = battleState.turn === 'ai';
                    
                    if (isAITurn) {
                      if (anim.includes('windup')) return 'scale-110 rotate-12';
                      if (anim.includes('strike')) return 'scale-125 -translate-x-12 -rotate-6';
                      if (anim.includes('impact')) return 'scale-115 -translate-x-8';
                      if (anim.includes('return')) return 'scale-105 -translate-x-2';
                    } else {
                      // AI is being attacked - recoil animation
                      if (anim.includes('impact')) return 'scale-95 translate-x-6 -rotate-3';
                    }
                    
                    return 'scale-100';
                  })()
                }`} key={`ai-${animationKey}`}>
                  <UltraDetailedMonsterGraphics
                    monsterId={battleState.aiMonster.id}
                    evolutionStage={2}
                    upgradeChoices={battleState.aiMonster.upgradeChoices}
                    size="medium"
                  />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">{battleState.aiMonster.name}</div>
                  <div className="text-sm text-muted-foreground">AI Opponent</div>
                  <Progress 
                    value={(battleState.aiMonster.hp / battleState.aiMonster.maxHp) * 100} 
                    className="w-32 mt-1"
                  />
                  <div className="text-xs">{battleState.aiMonster.hp}/{battleState.aiMonster.maxHp} HP</div>
                </div>
              </div>
            </div>

            {/* Turn Indicator */}
            <div className="text-center mb-4">
              <Badge variant={battleState.turn === 'player' ? 'default' : 'secondary'}>
                {battleState.phase === 'animate' ? 'Attacking...' : 
                 battleState.phase === 'end' ? 'Battle Complete!' :
                 battleState.turn === 'player' ? 'Your Turn' : 'Opponent Turn'}
              </Badge>
            </div>

            {/* Attack Options */}
            {battleState.turn === 'player' && battleState.phase === 'select' && !battleState.winner && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {playerAttacks.map((attack) => (
                  <Button
                    key={attack.id}
                    onClick={() => executeAttack('player', attack)}
                    variant={attack.isUpgrade ? 'default' : 'outline'}
                    className="p-4 h-auto text-left"
                  >
                    <div>
                      <div className="font-semibold">{attack.name}</div>
                      <div className="text-xs text-muted-foreground">{attack.description}</div>
                      <div className="text-xs font-medium">Damage: {attack.damage}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Battle Log */}
            <div className="border rounded p-3 h-32 overflow-y-auto bg-muted/50">
              <div className="text-sm space-y-1">
                {battleState.battleLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>

            {/* Battle End */}
            {battleState.winner && (
              <div className="text-center mt-4">
                <Button onClick={completeBattle} disabled={challengeMutation.isPending}>
                  {challengeMutation.isPending ? 'Processing...' : 'Complete Battle'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Battle Arena</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              Battle Tokens: <span className="font-bold">{user?.battleTokens || 0}</span>
            </div>
            {!canBattle && (
              <div className="text-sm text-muted-foreground">
                Answer questions to earn battle tokens!
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Monster Selection */}
          {!selectedMonster && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Choose Your Monster</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userMonsters.map((monster) => (
                  <Card key={monster.id} className="cursor-pointer hover:bg-accent" onClick={() => setSelectedMonster(monster)}>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <UltraDetailedMonsterGraphics
                          monsterId={monster.monsterId}
                          evolutionStage={monster.evolutionStage}
                          upgradeChoices={monster.upgradeChoices}
                          size="small"
                        />
                        <div className="mt-2">
                          <div className="font-semibold">{monster.monster.name}</div>
                          <div className="text-sm text-muted-foreground">Level {monster.level}</div>
                          <div className="text-xs">Power: {monster.power} | Defense: {monster.defense}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Opponent Selection */}
          {selectedMonster && !selectedOpponent && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" onClick={() => setSelectedMonster(null)}>
                  ← Back to Monster Selection
                </Button>
                <div className="text-sm">
                  Selected: <span className="font-semibold">{selectedMonster.monster.name}</span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-3">Choose Your Opponent</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiOpponents.map((opponent) => (
                  <Card key={opponent.id} className="cursor-pointer hover:bg-accent" onClick={() => setSelectedOpponent(opponent)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <UltraDetailedMonsterGraphics
                          monsterId={opponent.monster.id}
                          evolutionStage={2}
                          upgradeChoices={opponent.monster.upgradeChoices}
                          size="small"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{opponent.name}</div>
                          <div className="text-sm text-muted-foreground">{opponent.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" style={{ borderColor: opponent.color, color: opponent.color }}>
                              {opponent.difficulty}
                            </Badge>
                            <span className="text-xs">Total Power: {opponent.totalPower}</span>
                          </div>
                          <div className="text-xs mt-1">
                            Monster: {opponent.monster.name} (Lvl {Math.ceil(opponent.totalPower / 50)})
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Battle Confirmation */}
          {selectedMonster && selectedOpponent && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" onClick={() => setSelectedOpponent(null)}>
                  ← Back to Opponent Selection
                </Button>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Battle Ready!</h3>
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div className="text-center">
                    <UltraDetailedMonsterGraphics
                      monsterId={selectedMonster.monsterId}
                      evolutionStage={selectedMonster.evolutionStage}
                      upgradeChoices={selectedMonster.upgradeChoices}
                      size="medium"
                    />
                    <div className="mt-2 font-semibold">{selectedMonster.monster.name}</div>
                  </div>
                  <div className="text-4xl font-bold text-purple-600">VS</div>
                  <div className="text-center">
                    <UltraDetailedMonsterGraphics
                      monsterId={selectedOpponent.monster.id}
                      evolutionStage={2}
                      upgradeChoices={selectedOpponent.monster.upgradeChoices}
                      size="medium"
                    />
                    <div className="mt-2 font-semibold">{selectedOpponent.name}</div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => startBattle(selectedOpponent, selectedMonster)}
                  disabled={!canBattle}
                  size="lg"
                >
                  {canBattle ? 'Start Battle!' : 'Need Battle Token'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Battle History */}
      <Card>
        <CardHeader>
          <CardTitle>Battle History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">Loading battle history...</div>
          ) : battleHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No battles yet. Start your first battle above!
            </div>
          ) : (
            <div className="space-y-2">
              {battleHistory.slice(0, 5).map((battle: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="text-sm">
                    Battle vs {battle.opponentName || 'AI Opponent'}
                  </div>
                  <Badge variant={battle.winnerId === user?.id ? "default" : "secondary"}>
                    {battle.winnerId === user?.id ? "Victory" : "Defeat"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}