import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import InterestTest from "./InterestTest";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Zap, Shield } from "lucide-react";
import { UserMonster } from "@/types/game";

interface BattleTeamSelectorProps {
  onBattleStart: (selectedMonsters: UserMonster[], aiOpponent: any) => void;
}

export function BattleTeamSelector({ onBattleStart }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<UserMonster[]>([]);
  const [isGeneratingOpponent, setIsGeneratingOpponent] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const { toast } = useToast();

  const { data: userMonsters = [], isLoading: loadingMonsters } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  const { data: battleSlotsData } = useQuery<{ battleSlots: number }>({
    queryKey: ["/api/user/battle-slots"],
  });

  const battleSlots = battleSlotsData?.battleSlots || 2;
  const availableMonsters = userMonsters.filter((m) => m.hp > 0);

  const calculateTPL = (monsters: UserMonster[]) => {
    return monsters.reduce((total, monster) => total + monster.level, 0);
  };
  const currentTPL = calculateTPL(selectedMonsters);

  const generateOpponentMutation = useMutation({
    mutationFn: async () => {
      const playerTPL = calculateTPL(selectedMonsters);
      const response = await apiRequest("/api/battle/generate-opponent", {
        method: "POST",
        data: { tpl: playerTPL },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server returned an error: ${response.statusText}` }));
        throw new Error(errorData.message || 'Failed to generate opponent.');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.scaledMonsters) {
        onBattleStart(selectedMonsters, data);
      } else {
        toast({ title: "Battle Generation Failed", description: "Invalid opponent data received.", variant: "destructive" });
      }
      setIsGeneratingOpponent(false);
    },
    onError: (error: Error) => {
      setIsGeneratingOpponent(false);
      toast({ title: "Battle Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  // FIX: Added robust error handling to the mutation itself.
  const spendTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/battle/spend-token", { method: "POST" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred while spending a token." }));
        throw new Error(errorData.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const handleMonsterSelect = (monster: UserMonster) => {
    if (selectedMonsters.some(m => m.id === monster.id)) {
      setSelectedMonsters(prev => prev.filter(m => m.id !== monster.id));
    } else if (selectedMonsters.length < battleSlots) {
      setSelectedMonsters(prev => [...prev, monster]);
    } else {
      toast({
        title: "Battle Slots Full",
        description: `You can only select ${battleSlots} monsters.`,
        variant: "destructive",
      });
    }
  };

  const handleStartBattle = async () => {
    if (selectedMonsters.length === 0) {
      toast({ title: "No Monsters Selected", description: "Please select at least one monster.", variant: "destructive" });
      return;
    }
    setIsGeneratingOpponent(true);

    try {
      await spendTokenMutation.mutateAsync();
      await generateOpponentMutation.mutateAsync();
    } catch (error) {
      if (error instanceof Error && error.message.includes("NO_BATTLE_TOKENS")) {
        setShowSubscriptionGate(true);
      } else {
        toast({ title: "An Error Occurred", description: (error as Error).message || "Could not start the battle.", variant: "destructive" });
      }
      setIsGeneratingOpponent(false);
    }
  };

  if (loadingMonsters) {
    return <div className="text-center p-8">Loading your monsters...</div>;
  }

  if (availableMonsters.length === 0) {
    return (
       <Card className="w-full max-w-4xl mx-auto"><CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-4">No Available Monsters</h3>
            <p className="text-gray-600">You need healthy monsters to enter battle.</p>
       </CardContent></Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assemble Your Battle Team</h2>
              <p className="text-gray-600">Select up to {battleSlots} monsters. Your Team Power Level (TPL) determines your opponent.</p>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2"><Users className="w-5 h-5" /> <span className="font-medium">Slots: {selectedMonsters.length}/{battleSlots}</span></div>
                <div className="flex items-center gap-2"><Zap className="w-5 h-5" /> <span className="font-medium">TPL: {currentTPL}</span></div>
                {selectedMonsters.length > 0 && (
                  <Button onClick={handleStartBattle} disabled={isGeneratingOpponent} className="bg-red-600 hover:bg-red-700">
                    {isGeneratingOpponent ? "Finding Opponent..." : "Start Battle!"}
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">Available Monsters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableMonsters.map((userMonster) => {
              const isSelected = selectedMonsters.some(m => m.id === userMonster.id);
              const canSelect = selectedMonsters.length < battleSlots;
              return (
                <div key={userMonster.id} onClick={() => handleMonsterSelect(userMonster)} className={`cursor-pointer transition-all rounded-lg ${isSelected ? 'ring-4 ring-green-500' : canSelect ? 'hover:ring-2 ring-blue-300' : 'opacity-60 cursor-not-allowed'}`}>
                  <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="small" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showSubscriptionGate && (
        <InterestTest
          onComplete={() => {
            setShowSubscriptionGate(false);
            setIsGeneratingOpponent(false);
          }}
        />
      )}
    </div>
  );
}