import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LabSubscriptionGate from "./LabSubscriptionGate";
import { Monster, UserMonster, GameUser } from "@/types/game";

const MAX_LEVEL = 10; // Maximum level for monsters

// Helper function to check for unauthorized errors
function isUnauthorizedError(error: any): boolean {
  return error && error.message && error.message.includes("Unauthorized");
}

export default function MonsterLab() {
  const { toast } = useToast();
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [blockedMonster, setBlockedMonster] = useState<UserMonster | null>(null);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
  }, []);

  const { data: monsters = [], isLoading: monstersLoading } = useQuery<Monster[]>({
    queryKey: ["/api/monsters"],
  });

  const { data: userMonsters = [], isLoading: userMonstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  const purchaseMutation = useMutation({
    mutationFn: (monsterId: number) => apiRequest("POST", "/api/monsters/purchase", { monsterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Monster Purchased!", description: "Your new monster is ready in the lab." });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (userMonsterId: number) => apiRequest("POST", "/api/monsters/upgrade", { userMonsterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Monster Upgraded!", description: "Your monster has grown stronger!" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      if (error.message === "FREE_TRIAL_LIMIT") {
        const monster = userMonsters.find(um => um.id === (error as any)?.context?.userMonsterId);
        if (monster) {
          setBlockedMonster(monster);
          setShowSubscriptionGate(true);
        }
        return;
      }
      toast({ title: "Upgrade Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleLevelUp = (monster: UserMonster) => {
    if (monster.level >= 3 && user?.subscription_status !== 'active') {
        setBlockedMonster(monster);
        setShowSubscriptionGate(true);
        return;
    }
    upgradeMutation.mutate(monster.id);
  };

  const getUpgradeCost = (level: number) => {
      return 200 + (level - 1) * 50;
  }

  if (monstersLoading || userMonstersLoading) {
    return <div className="p-6 text-center text-white">Loading Monster Lab...</div>;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-white">Monster Lab 🧪</h2>
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Available Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {monsters.map((monster) => (
              <div key={monster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                <MonsterCard monster={monster} size="medium" />
                <Button onClick={() => purchaseMutation.mutate(monster.id)} disabled={purchaseMutation.isPending} className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]">
                  {purchaseMutation.isPending ? "Purchasing..." : `Buy for ${monster.goldCost}g`}
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Your Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {userMonsters.length === 0 ? (
              <Card className="w-full bg-gray-800/50 border-gray-700 text-white"><CardContent className="p-6 text-center"><p className="text-gray-400">No monsters yet. Purchase one to get started!</p></CardContent></Card>
            ) : (
              userMonsters.map((userMonster) => (
                <div key={userMonster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" />
                  <div className="w-full max-w-xs">
                    {userMonster.level < MAX_LEVEL ? (
                      <Button onClick={() => handleLevelUp(userMonster)} disabled={upgradeMutation.isPending} className="w-full">
                        {upgradeMutation.isPending ? "Upgrading..." : `Level Up (${getUpgradeCost(userMonster.level)}g)`}
                      </Button>
                    ) : (
                      <div className="text-center py-2 text-sm text-white/70 font-medium">Max Level</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {showSubscriptionGate && blockedMonster && (
        <LabSubscriptionGate monsterName={blockedMonster.monster?.name || "Monster"} onClose={() => setShowSubscriptionGate(false)} />
      )}
    </div>
  );
}

interface BattleTeamSelectorProps {
  onBattleStart: (selectedMonsters: UserMonster[], aiOpponent: any) => void;
}

export function BattleTeamSelector({ onBattleStart }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<UserMonster[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
  }, []);

  const { data: userMonsters = [], isLoading: loadingMonsters } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const availableMonsters = userMonsters.filter(m => m.hp > 0);

  const generateOpponentMutation = useMutation({
    mutationFn: async () => {
      if (selectedMonsters.length === 0) throw new Error("Please select at least one monster.");
      const playerTPL = selectedMonsters.reduce((acc, m) => acc + m.level, 0);
      return apiRequest("POST", "/api/battle/generate-opponent", { tpl: playerTPL });
    },
    onSuccess: (data) => {
      onBattleStart(selectedMonsters, data);
    },
    onError: (error: Error) => {
      toast({ title: "Battle Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleMonsterSelect = (monster: UserMonster) => {
    setSelectedMonsters(prev =>
      prev.some(m => m.id === monster.id)
        ? prev.filter(m => m.id !== monster.id)
        : [...prev, monster]
    );
  };

  if (loadingMonsters) {
    return <div className="p-6 text-center text-white">Loading your monsters...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
      <Card className="bg-gray-800/50 border-gray-700 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">Assemble Your Battle Team</h2>
          <p className="text-gray-400 mb-4">Select which monsters to bring into battle.</p>
          <Button onClick={() => generateOpponentMutation.mutate()} disabled={selectedMonsters.length === 0 || generateOpponentMutation.isPending}>
            {generateOpponentMutation.isPending ? "Finding Opponent..." : "Start Battle"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableMonsters.map(userMonster => {
          const isSelected = selectedMonsters.some(m => m.id === userMonster.id);
          return (
            <div
              key={userMonster.id}
              className={`cursor-pointer transition-all duration-200 rounded-xl ${isSelected ? 'ring-4 ring-green-500' : 'ring-2 ring-transparent hover:ring-blue-500'}`}
              onClick={() => handleMonsterSelect(userMonster)}
            >
              <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="small" />
            </div>
          );
        })}
      </div>
    </div>
  );
}