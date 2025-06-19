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
      return await apiRequest("POST", "/api/battle/spend-token", {});
    },
    onSuccess: () => {
      // After successfully spending token, generate opponent
      generateOpponentMutation.mutate();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      if (error.message.includes("NO_BATTLE_TOKENS")) {
        setShowSubscriptionGate(true);
      } else {
        toast({
          title: "Battle Token Error",
          description: error.message,
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
      
      const response = await apiRequest("POST", "/api/battle/generate-opponent", {
        playerTPL
      });
      
      return response;
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