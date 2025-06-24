import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MonsterCard from "./MonsterCard";
import ArenaSubscriptionGate from "./ArenaSubscriptionGate";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Zap, Shield } from "lucide-react";
import UpgradeChoice from "./UpgradeChoice";
import VeoMonster from "./VeoMonster";
import LabSubscriptionGate from "./LabSubscriptionGate";
import BattleSlotUpgrade from "./BattleSlotUpgrade";
import { Monster, UserMonster, GameUser } from "@/types/game";
import { useEffect } from "react";

const MAX_LEVEL = 10; // Maximum level for monsters

export default function MonsterLab() {
  const { toast } = useToast();
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [blockedMonster, setBlockedMonster] = useState<UserMonster | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [animatingCards, setAnimatingCards] = useState<Record<number, boolean>>({});

  // Force cache refresh on component mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
  }, []);

  // Developer Tools - Add Battle Tokens
  const addTokensMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev/add-tokens", { amount: 5 }),
    onSuccess: () => {
      toast({ title: "Success", description: "5 Battle Tokens added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: monsters = [], isLoading: monstersLoading } = useQuery<Monster[]>({
    queryKey: ["/api/monsters"],
  });

  const { data: userMonsters = [], isLoading: userMonstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
  });

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (monsterId: number) => {
      return await apiRequest("POST", "/api/monsters/purchase", { monsterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Monster Purchased!",
        description: "Your new monster has been added to your collection.",
      });
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
        title: "Purchase Failed",
        description: error.message || "Failed to purchase monster",
        variant: "destructive",
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (userMonsterId: number) => {
      return await apiRequest("POST", "/api/monsters/upgrade", { userMonsterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Monster Upgraded!",
        description: "Your monster has grown stronger!",
      });
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

      // Handle free trial limit - show subscription gate
      if (error.message === "FREE_TRIAL_LIMIT") {
        // Find the monster that triggered the limit from the mutation context
        const triggerMonsterId = (error as any)?.context?.userMonsterId;
        const monster = userMonsters.find(um => um.id === triggerMonsterId);

        if (monster) {
          setBlockedMonster(monster);
          setShowSubscriptionGate(true);
        }
        return;
      }

      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade monster",
        variant: "destructive",
      });
    },
  });

  const applyUpgradeMutation = useMutation({
    mutationFn: async (upgradeData: any) => {
      return await apiRequest("POST", "/api/monsters/apply-upgrade", upgradeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowUpgradeChoice(false);
      setSelectedMonster(null);
      toast({
        title: "Upgrade Applied!",
        description: "Your monster has evolved with new abilities!",
      });
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
        title: "Upgrade Failed",
        description: error.message || "Failed to apply upgrade",
        variant: "destructive",
      });
    },
  });

  const handleSpecialUpgrade = (userMonster: UserMonster) => {
    // Check if monster is at Level 3 (free trial limit)
    if (userMonster.level >= 3) {
      setBlockedMonster(userMonster);
      setShowSubscriptionGate(true);
      return;
    }

    setSelectedMonster(userMonster);
    setShowUpgradeChoice(true);
  };

  const handleCloseSubscriptionGate = () => {
    setShowSubscriptionGate(false);
    setBlockedMonster(null);
  };

  const handleUpgradeChoice = (upgradeOption: any) => {
    if (!selectedMonster) return;

    applyUpgradeMutation.mutate({
      userMonsterId: selectedMonster.id,
      upgradeKey: upgradeOption.upgradeKey,
      upgradeValue: upgradeOption.upgradeValue,
      statBoosts: upgradeOption.statBoosts,
      goldCost: upgradeOption.goldCost,
      diamondCost: upgradeOption.diamondCost
    });
  };

  if (monstersLoading || userMonstersLoading) {
    return <div className="p-6">Loading monster lab...</div>;
  }

  if (showUpgradeChoice && selectedMonster) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Upgrade {selectedMonster.monster.name}</h2>
          <Button variant="outline" onClick={() => setShowUpgradeChoice(false)}>
            Back to Lab
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Monster</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <VeoMonster
                monsterId={selectedMonster.monsterId}
                evolutionStage={selectedMonster.evolutionStage}
                upgradeChoices={selectedMonster.upgradeChoices || {}}
                size="large"
              />
              <div className="text-center">
                <h3 className="font-semibold">{selectedMonster.monster.name}</h3>
                <p className="text-sm text-muted-foreground">Level {selectedMonster.level} • Stage {selectedMonster.evolutionStage}</p>
                <div className="flex gap-4 mt-2">
                  <Badge variant="destructive"><Zap className="w-3 h-3 mr-1" />{selectedMonster.power}</Badge>
                  <Badge variant="secondary"><Gauge className="w-3 h-3 mr-1" />{selectedMonster.speed}</Badge>
                  <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />{selectedMonster.defense}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <UpgradeChoice
            userMonster={selectedMonster}
            onUpgrade={handleUpgradeChoice}
            userGold={user?.gold || 0}
            userDiamonds={user?.diamonds || 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Monster Lab 🧪</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addTokensMutation.mutate()}
          disabled={addTokensMutation.isPending}
        >
          Dev: Add 5 Tokens
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Available Monsters */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Available Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {monsters.map((monster) => (
              <div key={monster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                <MonsterCard
                  monster={monster}
                  size="medium"
                />
                <Button
                  onClick={() => purchaseMutation.mutate(monster.id)}
                  disabled={purchaseMutation.isPending}
                  className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]"
                >
                  {purchaseMutation.isPending ? "Purchasing..." : `Buy ${monster.goldCost}g`}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* User's Monsters */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Your Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {userMonsters.length === 0 ? (
              <Card className="w-full">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No monsters yet. Purchase one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              userMonsters.map((userMonster) => (
                <div key={userMonster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <MonsterCard
                    monster={userMonster.monster}
                    userMonster={userMonster}
                    isFlipped={flippedCards[userMonster.id] || false}
                    onFlip={() => setFlippedCards(prev => ({
                      ...prev,
                      [userMonster.id]: !prev[userMonster.id]
                    }))}
                    showUpgradeAnimation={animatingCards[userMonster.id] || false}
                    size="medium"
                  />

                  {!(flippedCards[userMonster.id] || false) && (
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      {userMonster.level < MAX_LEVEL ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            // Check if monster is at Level 3 (free trial limit)
                            if (userMonster.level >= 3) {
                              setBlockedMonster(userMonster);
                              setShowSubscriptionGate(true);
                              return;
                            }

                            setAnimatingCards(prev => ({ ...prev, [userMonster.id]: true }));
                            upgradeMutation.mutate(userMonster.id);
                            setTimeout(() => setAnimatingCards(prev => ({ ...prev, [userMonster.id]: false })), 2000);
                          }}
                          disabled={upgradeMutation.isPending}
                          className="shadow-lg w-full touch-manipulation min-h-[44px]"
                        >
                          {upgradeMutation.isPending ? "Upgrading..." : "Level Up (200g)"}
                        </Button>
                      ) : (
                        <div className="text-center py-2 text-sm text-white/70 font-medium">
                          Max Level Reached
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSpecialUpgrade(userMonster)}
                        className="shadow-lg w-full touch-manipulation min-h-[44px] border-white/20 text-white hover:bg-white/10"
                      >
                        Special Upgrades
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subscription Gate Modal */}
      {showSubscriptionGate && blockedMonster && (
        <LabSubscriptionGate
          monsterName={blockedMonster.monster?.name || "Monster"}
          onClose={handleCloseSubscriptionGate}
        />
      )}
    </div>
  );
}

interface BattleTeamSelectorProps {
  onBattleStart: (selectedMonsters: any[], aiOpponent: any) => void;
}

export function BattleTeamSelector({ onBattleStart }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<any[]>([]);
  const [isGeneratingOpponent, setIsGeneratingOpponent] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const { toast } = useToast();

  // Get user's monsters
  const { data: userMonsters = [], isLoading: loadingMonsters } = useQuery({
    queryKey: ["/api/user/monsters"],
  });

  // Get user's battle slots
  const { data: battleSlotsData } = useQuery({
    queryKey: ["/api/user/battle-slots"],
  });

  const battleSlots = (battleSlotsData as any)?.battleSlots || 2;

  // Filter available monsters (not shattered, has HP)
  const availableMonsters = (userMonsters as any[]).filter((userMonster: any) =>
    !userMonster.isShattered && userMonster.hp > 0
  );

  // Calculate Team Power Level (TPL) = sum of levels
  const calculateTPL = (monsters: any[]) => {
    return monsters.reduce((total, monster) => total + monster.level, 0);
  };

  const currentTPL = calculateTPL(selectedMonsters);

  // Spend battle token mutation
  const spendTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/battle/spend-token", {
        method: "POST"
      });
      return await response.json();
    },
    onSuccess: () => {
      // After successfully spending token, generate opponent
      generateOpponentMutation.mutate();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      setIsGeneratingOpponent(false); // Always stop the loading indicator
      if (error.message.includes("NO_BATTLE_TOKENS")) {
        setShowSubscriptionGate(true); // Show the specific "no tokens" popup
      } else {
        toast({
          title: "An Error Occurred",
          description: error.message || "Could not start the battle.",
          variant: "destructive",
        });
      }
    },
  });

  // Generate AI opponent mutation
  const generateOpponentMutation = useMutation({
    mutationFn: async () => {
      if (selectedMonsters.length === 0) {
        throw new Error("Please select at least one monster for battle");
      }

      const playerTPL = calculateTPL(selectedMonsters);
      const response = await apiRequest("/api/battle/generate-opponent", {
        method: "POST",
        data: { tpl: playerTPL }
      });

      const responseData = await response.json();
      return responseData;
    },
    onSuccess: (aiOpponent: any) => {
      if (aiOpponent && aiOpponent.team) {
        const opponentTPL = aiOpponent.scaledMonsters ?
          calculateTPL(aiOpponent.scaledMonsters.map((m: any) => ({ level: m.level }))) : 0;

        toast({
          title: "Opponent Found!",
          description: `Facing ${aiOpponent.team.name} (TPL: ${opponentTPL})`,
          variant: "default",
        });

        onBattleStart(selectedMonsters, aiOpponent);
      } else {
        toast({
          title: "Battle Generation Failed",
          description: "Invalid opponent data received",
          variant: "destructive",
        });
      }
      setIsGeneratingOpponent(false);
    },
    onError: (error: Error) => {
      setIsGeneratingOpponent(false);
      toast({
        title: "Error: Could not find a suitable opponent at this time",
        description: error.message || "Please try adjusting your team composition",
        variant: "destructive",
      });
    },
  });

  const handleMonsterSelect = (userMonster: any) => {
    if (selectedMonsters.find(m => m.id === userMonster.id)) {
      // Deselect monster
      setSelectedMonsters(prev => prev.filter(m => m.id !== userMonster.id));
    } else if (selectedMonsters.length < battleSlots) {
      // Select monster
      setSelectedMonsters(prev => [...prev, userMonster]);
    } else {
      toast({
        title: "Battle Slots Full",
        description: `You can only select ${battleSlots} monsters for battle. Upgrade your battle slots to bring more monsters!`,
        variant: "destructive",
      });
    }
  };

  const handleStartBattle = () => {
    if (selectedMonsters.length === 0) {
      toast({
        title: "No Monsters Selected",
        description: "Please select at least one monster for battle",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingOpponent(true);
    // First spend a battle token, then generate opponent
    spendTokenMutation.mutate();
  };

  if (loadingMonsters) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-lg">Loading your monsters...</div>
        </CardContent>
      </Card>
    );
  }

  if (availableMonsters.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">No Available Monsters</h3>
            <p className="text-gray-600 mb-4">
              You need healthy monsters to enter battle. Visit the Monster Lab to purchase monsters or heal your shattered ones.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Battle Team Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assemble Your Battle Team</h2>
              <p className="text-gray-600">
                Select up to {battleSlots} monsters for battle. Your Team Power Level (TPL) determines your opponent.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">Battle Slots: {selectedMonsters.length}/{battleSlots}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Team Power Level: {currentTPL}</span>
              </div>
              {selectedMonsters.length > 0 && (
                <Button
                  onClick={handleStartBattle}
                  disabled={spendTokenMutation.isPending || generateOpponentMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {spendTokenMutation.isPending ? "Using Battle Token..." :
                   generateOpponentMutation.isPending ? "Finding Opponent..." : "Start Battle!"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Team Preview */}
      {selectedMonsters.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Your Battle Team
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedMonsters.map((userMonster) => (
                <div key={userMonster.id} className="relative">
                  <Badge
                    className="absolute top-2 right-2 z-10 bg-green-600 text-white"
                  >
                    LV.{userMonster.level} • Selected
                  </Badge>
                  <div onClick={() => handleMonsterSelect(userMonster)}>
                    <MonsterCard
                      monster={userMonster.monster}
                      userMonster={userMonster}
                      size="small"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Monsters */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">Available Monsters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableMonsters.map((userMonster: any) => {
              const isSelected = selectedMonsters.find(m => m.id === userMonster.id);
              const canSelect = selectedMonsters.length < battleSlots;

              return (
                <div key={userMonster.id} className="relative mx-4 my-3">
                  {isSelected && (
                    <Badge
                      className="absolute top-4 right-4 z-10 bg-green-600 text-white"
                    >
                      Selected
                    </Badge>
                  )}
                  {!isSelected && !canSelect && (
                    <Badge
                      className="absolute top-4 right-4 z-10 bg-gray-500 text-white"
                    >
                      Slots Full
                    </Badge>
                  )}
                  <div
                    onClick={() => handleMonsterSelect(userMonster)}
                    className={`cursor-pointer transition-all rounded-lg ${
                      isSelected
                        ? 'ring-4 ring-green-500 bg-green-50'
                        : canSelect
                        ? 'hover:ring-2 ring-blue-300'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <MonsterCard
                      monster={userMonster.monster}
                      userMonster={userMonster}
                      size="small"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Arena Subscription Gate */}
      {showSubscriptionGate && (
        <ArenaSubscriptionGate
          onClose={() => {
            setShowSubscriptionGate(false);
            setIsGeneratingOpponent(false);
          }}
        />
      )}
    </div>
  );
}
