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
              <div className="w-40 h-40 bg-gradient-to-br rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg relative" 
                style={{
                  background: `linear-gradient(135deg, ${
                    selectedMonster.monsterId === 1 ? '#ff6b6b, #d63447' : 
                    selectedMonster.monsterId === 2 ? '#fdcb6e, #e17055' :
                    selectedMonster.monsterId === 3 ? '#a29bfe, #6c5ce7' :
                    selectedMonster.monsterId === 4 ? '#74b9ff, #0984e3' :
                    '#55a3ff, #2d3436'})`
                }}>
                <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-lg">
                  {/* Aura for evolved monsters */}
                  {selectedMonster.evolutionStage >= 3 && (
                    <circle cx="50" cy="50" r="45" fill="rgba(255,255,255,0.1)" />
                  )}
                  
                  {/* Monster body - larger if muscular */}
                  <ellipse cx="50" cy="60" 
                    rx={selectedMonster.upgradeChoices?.body ? "32" : "26"} 
                    ry={selectedMonster.upgradeChoices?.body ? "26" : "22"} 
                    fill="rgba(255,255,255,0.35)" 
                  />
                  
                  {/* Monster head */}
                  <ellipse cx="50" cy="35" rx="22" ry="20" fill="rgba(255,255,255,0.45)" />
                  
                  {/* Eyes */}
                  <circle cx="43" cy="32" r="4" fill="rgba(0,0,0,0.8)" />
                  <circle cx="57" cy="32" r="4" fill="rgba(0,0,0,0.8)" />
                  <circle cx="43" cy="32" r="1.5" fill="white" />
                  <circle cx="57" cy="32" r="1.5" fill="white" />
                  
                  {/* Mouth */}
                  <path d="M40 42 Q50 47 60 42" stroke="rgba(0,0,0,0.7)" strokeWidth="2" fill="none" />
                  
                  {/* Sharp teeth upgrade */}
                  {selectedMonster.upgradeChoices?.teeth && (
                    <>
                      <polygon points="45,44 43,50 47,50" fill="white" />
                      <polygon points="50,44 48,50 52,50" fill="white" />
                      <polygon points="55,44 53,50 57,50" fill="white" />
                    </>
                  )}
                  
                  {/* Tail upgrade */}
                  {selectedMonster.upgradeChoices?.tail && (
                    <path d="M75 65 Q85 70 90 55 Q95 60 100 50" stroke="rgba(255,255,255,0.7)" strokeWidth="4" fill="none" />
                  )}
                  
                  {/* Wings upgrade */}
                  {selectedMonster.upgradeChoices?.wings && (
                    <>
                      <path d="M25 45 Q15 30 20 60 Q30 50 35 55" fill="rgba(255,255,255,0.5)" />
                      <path d="M75 45 Q85 30 80 60 Q70 50 65 55" fill="rgba(255,255,255,0.5)" />
                    </>
                  )}
                  
                  {/* Spikes upgrade */}
                  {selectedMonster.upgradeChoices?.spikes && (
                    <>
                      <polygon points="38,52 35,45 41,45" fill="rgba(255,255,255,0.7)" />
                      <polygon points="50,50 47,43 53,43" fill="rgba(255,255,255,0.7)" />
                      <polygon points="62,52 59,45 65,45" fill="rgba(255,255,255,0.7)" />
                    </>
                  )}
                  
                  {/* Claws for evolved monsters */}
                  {selectedMonster.evolutionStage >= 2 && (
                    <>
                      <path d="M35 75 L30 82 L32 84 L37 78" fill="rgba(0,0,0,0.6)" />
                      <path d="M65 75 L70 82 L68 84 L63 78" fill="rgba(0,0,0,0.6)" />
                    </>
                  )}
                  
                  {/* Special effects for highest evolution */}
                  {selectedMonster.evolutionStage >= 4 && (
                    <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.3)" opacity="0.8" />
                  )}
                </svg>
                
                {/* Evolution stage indicator */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-black border-2 border-white">
                  {selectedMonster.evolutionStage}
                </div>
              </div>
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
                      <div className="w-20 h-20 bg-gradient-to-br rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md" 
                        style={{
                          background: monster.gradient?.includes('from-') 
                            ? `linear-gradient(135deg, ${monster.gradient.includes('red') ? '#ff6b6b, #d63447' : 
                                                        monster.gradient.includes('yellow') ? '#fdcb6e, #e17055' :
                                                        monster.gradient.includes('purple') ? '#a29bfe, #6c5ce7' :
                                                        monster.gradient.includes('blue') ? '#74b9ff, #0984e3' :
                                                        '#55a3ff, #2d3436'})`
                            : '#ff6b6b'
                        }}>
                        <svg width="60" height="60" viewBox="0 0 100 100" className="drop-shadow-sm">
                          <ellipse cx="50" cy="60" rx="25" ry="20" fill="rgba(255,255,255,0.3)" />
                          <ellipse cx="50" cy="35" rx="20" ry="18" fill="rgba(255,255,255,0.4)" />
                          <circle cx="45" cy="32" r="3" fill="rgba(0,0,0,0.8)" />
                          <circle cx="55" cy="32" r="3" fill="rgba(0,0,0,0.8)" />
                          <path d="M42 40 Q50 45 58 40" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" fill="none" />
                          <text x="50" y="90" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.8)">
                            Lv1
                          </text>
                        </svg>
                      </div>
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
                        <div className="w-20 h-20 bg-gradient-to-br rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md relative" 
                          style={{
                            background: `linear-gradient(135deg, ${
                              userMonster.monsterId === 1 ? '#ff6b6b, #d63447' : 
                              userMonster.monsterId === 2 ? '#fdcb6e, #e17055' :
                              userMonster.monsterId === 3 ? '#a29bfe, #6c5ce7' :
                              userMonster.monsterId === 4 ? '#74b9ff, #0984e3' :
                              '#55a3ff, #2d3436'})`
                          }}>
                          <svg width="60" height="60" viewBox="0 0 100 100" className="drop-shadow-sm">
                            {/* Monster body - larger if muscular */}
                            <ellipse cx="50" cy="60" 
                              rx={userMonster.upgradeChoices?.body ? "30" : "25"} 
                              ry={userMonster.upgradeChoices?.body ? "25" : "20"} 
                              fill="rgba(255,255,255,0.3)" 
                            />
                            {/* Monster head */}
                            <ellipse cx="50" cy="35" rx="20" ry="18" fill="rgba(255,255,255,0.4)" />
                            
                            {/* Eyes */}
                            <circle cx="45" cy="32" r="3" fill="rgba(0,0,0,0.8)" />
                            <circle cx="55" cy="32" r="3" fill="rgba(0,0,0,0.8)" />
                            
                            {/* Mouth */}
                            <path d="M42 40 Q50 45 58 40" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" fill="none" />
                            
                            {/* Sharp teeth upgrade */}
                            {userMonster.upgradeChoices?.teeth && (
                              <>
                                <polygon points="47,42 46,47 48,47" fill="white" />
                                <polygon points="52,42 51,47 53,47" fill="white" />
                              </>
                            )}
                            
                            {/* Tail upgrade */}
                            {userMonster.upgradeChoices?.tail && (
                              <path d="M70 65 Q80 70 85 60" stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" />
                            )}
                            
                            {/* Wings upgrade */}
                            {userMonster.upgradeChoices?.wings && (
                              <>
                                <path d="M30 45 Q20 35 25 55" fill="rgba(255,255,255,0.4)" />
                                <path d="M70 45 Q80 35 75 55" fill="rgba(255,255,255,0.4)" />
                              </>
                            )}
                            
                            {/* Spikes upgrade */}
                            {userMonster.upgradeChoices?.spikes && (
                              <>
                                <polygon points="40,50 38,45 42,45" fill="rgba(255,255,255,0.6)" />
                                <polygon points="50,48 48,43 52,43" fill="rgba(255,255,255,0.6)" />
                                <polygon points="60,50 58,45 62,45" fill="rgba(255,255,255,0.6)" />
                              </>
                            )}
                            
                            {/* Level indicator */}
                            <text x="50" y="90" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.9)">
                              Lv{userMonster.level}
                            </text>
                          </svg>
                          
                          {/* Evolution stage indicator */}
                          {userMonster.evolutionStage > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                              {userMonster.evolutionStage}
                            </div>
                          )}
                        </div>
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