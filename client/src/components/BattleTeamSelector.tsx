import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import InterestTest from "./InterestTest";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Zap } from "lucide-react";
import { PlayerCombatMonster } from "@/types/game";

interface BattleTeamSelectorProps {
  onBattleStart: (selectedMonsters: PlayerCombatMonster[], aiOpponent: any) => void;
}

export function BattleTeamSelector({ onBattleStart }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<PlayerCombatMonster[]>([]);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userMonsters, isLoading: loadingMonsters } = useQuery<PlayerCombatMonster[]>({
    queryKey: ["/api/user/monsters"],
    queryFn: () => apiRequest('/api/user/monsters', { method: 'GET' }).then(res => res.json())
  });

  const { data: battleSlotsData } = useQuery<{ battleSlots: number }>({
    queryKey: ["/api/user/battle-slots"],
  });

  const battleSlots = battleSlotsData?.battleSlots || 3;
  const availableMonsters = userMonsters?.filter((m) => (m.hp ?? 0) > 0) || [];
  const currentTPL = selectedMonsters.reduce((total, m) => total + m.level, 0);

  const handleMonsterSelect = (monster: PlayerCombatMonster) => {
    setSelectedMonsters(prev => {
      const isSelected = prev.some(m => m.id === monster.id);
      if (isSelected) {
        return prev.filter(m => m.id !== monster.id);
      }
      if (prev.length < battleSlots) {
        return [...prev, monster];
      }
      toast({ title: "Battle Slots Full", description: `You can only select ${battleSlots} monsters.`, variant: "destructive" });
      return prev;
    });
  };

  const handleStartBattle = async () => {
    if (selectedMonsters.length === 0) {
      toast({ title: "No Monsters Selected", description: "Please select at least one monster.", variant: "destructive" });
      return;
    }

    setIsStartingBattle(true);
    try {
      await apiRequest("/api/battle/spend-token", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      const opponentResponse = await apiRequest("/api/battle/generate-opponent", { method: "POST", data: { tpl: currentTPL } });
      const opponentData = await opponentResponse.json();

      onBattleStart(selectedMonsters, opponentData);

    } catch (error: any) {
      if (error instanceof Error && error.message.includes("NO_BATTLE_TOKENS")) {
        setShowSubscriptionGate(true);
      } else {
        toast({ title: "An Error Occurred", description: (error as Error).message || "Could not start the battle.", variant: "destructive" });
      }
      setIsStartingBattle(false);
    }
  };

  if (loadingMonsters) return <div className="text-center p-8 text-white">Loading your monsters...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
        {/* Simplified UI */}
        <Button onClick={handleStartBattle} disabled={isStartingBattle || selectedMonsters.length === 0}>
            {isStartingBattle ? "Finding Opponent..." : "Start Battle!"}
        </Button>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
        {availableMonsters.map((userMonster) => {
            const isSelected = selectedMonsters.some(m => m.id === userMonster.id);
            return (
            <div key={userMonster.id} className={`transition-all rounded-lg ${isSelected ? 'ring-4 ring-green-500' : ''}`}>
                <MonsterCard 
                monster={userMonster.monster} 
                userMonster={userMonster} 
                size="small"
                onCardClick={() => handleMonsterSelect(userMonster)}
                isToggleable={false}
                />
            </div>
            );
        })}
        </div>
      {showSubscriptionGate && <InterestTest onComplete={() => setShowSubscriptionGate(false)} />}
    </div>
  );
}