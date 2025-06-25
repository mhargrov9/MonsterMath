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

function isUnauthorizedError(error: any): boolean {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

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

  // Developer Tools - Add Battle Tokens - WITH EXTENSIVE DEBUGGING
  const addTokensMutation = useMutation({
    mutationFn: async () => {
      console.log('DEV BUTTON: About to call apiRequest for /api/dev/add-tokens');
      const response = await apiRequest("/api/dev/add-tokens", { 
        method: "POST", 
        data: { amount: 5 } 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('DEV BUTTON: API call successful, response:', data);
      console.log('DEV BUTTON: Response type:', typeof data);
      console.log('DEV BUTTON: Response keys:', data ? Object.keys(data) : 'no keys');
      toast({ title: "Success", description: "5 Battle Tokens added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      console.log('DEV BUTTON: API call failed, error:', error);
      console.log('DEV BUTTON: Error message:', error.message);
      console.log('DEV BUTTON: Error stack:', error.stack);
      console.log('DEV BUTTON: Error name:', error.name);
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
      console.log(`Frontend: Attempting to purchase monster ${monsterId}`);
      const response = await apiRequest("/api/monsters/purchase", { 
        method: "POST", 
        data: { monsterId } 
      });
      console.log(`Frontend: Purchase response status:`, response.status);
      await throwIfResNotOk(response);
      return await response.json();
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
      const response = await apiRequest("/api/monsters/upgrade", { 
        method: "POST", 
        data: { userMonsterId } 
      });
      await throwIfResNotOk(response);
      return await response.json();
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
          onClick={() => {
            console.log('DEV BUTTON: Button clicked, mutation pending:', addTokensMutation.isPending);
            addTokensMutation.mutate();
          }}
          disabled={addTokensMutation.isPending}
        >
          {addTokensMutation.isPending ? "Adding..." : "Dev: Add 5 Tokens"}
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
