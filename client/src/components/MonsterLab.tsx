import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MonsterCard from "./MonsterCard";
import ArenaSubscriptionGate from "./ArenaSubscriptionGate"; // This might be unused here now
import LabSubscriptionGate from "./LabSubscriptionGate"; // Correct gate for this component
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Zap, Shield } from "lucide-react";

// Type definitions for this component
interface Monster {
  id: number;
  name: string;
  level: number;
  goldCost: number;
  // ... other monster properties
}
interface UserMonster {
  id: number;
  level: number;
  hp: number;
  isShattered: boolean;
  monster: Monster;
  // ... other user monster properties
}

// This is the only component that should be in this file.
export default function MonsterLab() {
  const { toast } = useToast();
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [blockedMonster, setBlockedMonster] = useState<UserMonster | null>(null);

  // Fetch user's monsters
  const { data: userMonsters = [], isLoading: loadingMonsters, error: monstersError } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
    queryFn: () => apiRequest("GET", "/api/user/monsters"),
  });

  // Fetch all available monsters
  const { data: allMonsters = [], isLoading: loadingAllMonsters } = useQuery<Monster[]>({
    queryKey: ["/api/monsters"],
    queryFn: () => apiRequest("GET", "/api/monsters"),
  });

  // Purchase Monster Mutation
  const purchaseMutation = useMutation({
    mutationFn: (monsterId: number) => apiRequest("POST", "/api/monsters/purchase", { monsterId }),
    onSuccess: () => {
      toast({ title: "Success", description: "Monster purchased!" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // To update currency
    },
    onError: (error: Error) => {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
    },
  });

  // Add Tokens Mutation
  const addTokensMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dev/add-tokens", { amount: 5 }),
    onSuccess: () => {
      toast({ title: "Success", description: "5 Battle Tokens added!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });


  const handleCloseSubscriptionGate = () => {
    setShowSubscriptionGate(false);
    setBlockedMonster(null);
  };

  if (loadingMonsters || loadingAllMonsters) {
    return <div className="p-6 text-center">Loading Monster Lab...</div>;
  }

  if (monstersError) {
    return <div className="p-6 text-center text-red-500">Error loading your monsters: {(monstersError as Error).message}</div>;
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
            {allMonsters.map((monster) => (
              <div key={monster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                <MonsterCard monster={monster} size="medium" />
                <Button
                  onClick={() => purchaseMutation.mutate(monster.id)}
                  disabled={purchaseMutation.isPending}
                  className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]"
                >
                  {purchaseMutation.isPending && purchaseMutation.variables === monster.id ? "Purchasing..." : `Buy ${monster.goldCost}g`}
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
              <Card className="w-full bg-gray-800/50 border-gray-700">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-400">No monsters yet. Purchase one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              userMonsters.map((userMonster) => (
                <div key={userMonster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <MonsterCard
                    monster={userMonster.monster}
                    userMonster={userMonster}
                    size="medium"
                  />
                  {/* Add upgrade buttons or other actions here later */}
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