import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, Gem, Zap, Shield, Gauge } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import SimpleMonsterGraphics from "./SimpleMonsterGraphics";
import UpgradeChoice from "./UpgradeChoice";
import { Monster, UserMonster, GameUser } from "@/types/game";
import { useState } from "react";

export default function MonsterLab() {
  const { toast } = useToast();
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);

  const { data: monsters = [], isLoading: monstersLoading } = useQuery<Monster[]>({
    queryKey: ["/api/monsters"],
  });

  const { data: userMonsters = [], isLoading: userMonstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/monsters/user"],
  });

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (monsterId: number) => {
      return await apiRequest("POST", "/api/monsters/purchase", { monsterId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monsters/user"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/monsters/user"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/monsters/user"] });
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
    setSelectedMonster(userMonster);
    setShowUpgradeChoice(true);
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
              <SimpleMonsterGraphics 
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
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Monster Lab 🧪</h2>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Available Monsters */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Monsters</h3>
          <div className="space-y-4">
            {monsters.map((monster) => (
              <Card key={monster.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <SimpleMonsterGraphics 
                        monsterId={monster.id} 
                        evolutionStage={1}
                        upgradeChoices={{}}
                        size="small"
                      />
                      <div>
                        <h4 className="font-semibold">{monster.name}</h4>
                        <p className="text-sm text-muted-foreground">{monster.type}</p>
                        <div className="flex gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">{monster.goldCost}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gem className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">{monster.diamondCost}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => purchaseMutation.mutate(monster.id)}
                      disabled={purchaseMutation.isPending}
                    >
                      {purchaseMutation.isPending ? "Purchasing..." : "Purchase"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* User's Monsters */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Monsters</h3>
          <div className="space-y-4">
            {userMonsters.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No monsters yet. Purchase one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              userMonsters.map((userMonster) => (
                <Card key={userMonster.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-4 items-center">
                        <SimpleMonsterGraphics 
                          monsterId={userMonster.monsterId} 
                          evolutionStage={userMonster.evolutionStage}
                          upgradeChoices={userMonster.upgradeChoices || {}}
                          size="small"
                        />
                        <div>
                          <h4 className="font-semibold">{userMonster.monster.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Level {userMonster.level} • Stage {userMonster.evolutionStage}
                          </p>
                          <div className="flex gap-3 mt-1">
                            <Badge variant="destructive" className="text-xs">
                              <Zap className="w-3 h-3 mr-1" />{userMonster.power}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <Gauge className="w-3 h-3 mr-1" />{userMonster.speed}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />{userMonster.defense}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm"
                          onClick={() => upgradeMutation.mutate(userMonster.id)}
                          disabled={upgradeMutation.isPending}
                        >
                          {upgradeMutation.isPending ? "Upgrading..." : "Level Up (200g)"}
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleSpecialUpgrade(userMonster)}
                        >
                          Special Upgrades
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}