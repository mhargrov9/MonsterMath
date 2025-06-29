import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users } from "lucide-react";
import { PlayerCombatMonster } from "@/types/game";

interface BattleTeamSelectorProps {
  onTeamConfirm: (selectedMonsters: PlayerCombatMonster[]) => void;
}

interface MonsterLabData {
    userMonsters: PlayerCombatMonster[];
}

export function BattleTeamSelector({ onTeamConfirm }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<PlayerCombatMonster[]>([]);
  const { toast } = useToast();

  const { data: userMonsters, isLoading: loadingMonsters } = useQuery({
    queryKey: ["/api/monster-lab-data"],
    queryFn: async (): Promise<MonsterLabData> => {
        const res = await apiRequest('/api/monster-lab-data', { method: 'GET' });
        return res.json();
    },
    select: (data: MonsterLabData) => data.userMonsters,
  });

  const { data: battleSlotsData } = useQuery<{ battleSlots: number }>({
    queryKey: ["/api/user/battle-slots"],
  });

  const battleSlots = battleSlotsData?.battleSlots || 3;
  const availableMonsters = userMonsters?.filter((m) => (m.hp ?? 0) > 0) || [];

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

  if (loadingMonsters) return <div className="text-center p-8 text-white">Loading your monsters...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assemble Your Battle Team</h2>
              <p className="text-muted-foreground">Select up to {battleSlots} monsters for your team.</p>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px] text-right">
                <div className="flex items-center justify-end gap-2"><Users className="w-5 h-5 text-muted-foreground" /> <span className="font-medium">Slots: {selectedMonsters.length}/{battleSlots}</span></div>
                <Button onClick={() => onTeamConfirm(selectedMonsters)} disabled={selectedMonsters.length === 0} className="bg-red-600 hover:bg-red-700 w-full mt-2">
                    Confirm Team
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">Your Available Monsters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        </CardContent>
      </Card>
    </div>
  );
}