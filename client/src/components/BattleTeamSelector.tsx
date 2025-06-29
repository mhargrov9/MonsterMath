import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Zap } from "lucide-react";
import { PlayerCombatMonster, Monster } from "@/types/game";

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
    select: (data) => data.userMonsters,
  });

  const { data: battleSlotsData } = useQuery({
    queryKey: ["/api/user/battle-slots"],
    queryFn: () => apiRequest('/api/user/battle-slots', { method: 'GET' }).then(res => res.json()),
  });

  const battleSlots = battleSlotsData?.battleSlots || 3;
  const availableMonsters = userMonsters?.filter((m) => (m.hp ?? 0) > 0) || [];

  const handleMonsterSelect = (monster: PlayerCombatMonster) => {
    setSelectedMonsters(prev => {
      const isSelected = prev.some(m => m.id === monster.id);
      if (isSelected) return prev.filter(m => m.id !== monster.id);
      if (prev.length < battleSlots) return [...prev, monster];
      toast({ title: "Battle Slots Full", description: `You can only select ${battleSlots} monsters.`});
      return prev;
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
      <Card><CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Assemble Your Battle Team</h2>
            <p>Select up to {battleSlots} monsters.</p>
          </div>
          <Button onClick={() => onTeamConfirm(selectedMonsters)} disabled={selectedMonsters.length === 0}>
              Confirm Team
          </Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-6">
        <h3>Your Available Monsters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </CardContent></Card>
    </div>
  );
}