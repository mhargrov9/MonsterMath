import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MonsterCard from "./MonsterCard";
import InterestTest from "./InterestTest";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Zap } from "lucide-react";
import { UserMonster, Ability } from "@/types/game";

interface BattleTeamSelectorProps {
  onBattleStart: (selectedMonsters: UserMonster[], aiOpponent: any) => void;
}

export function BattleTeamSelector({ onBattleStart }: BattleTeamSelectorProps) {
  const [selectedMonsters, setSelectedMonsters] = useState<UserMonster[]>([]);
  const [monstersWithAbilities, setMonstersWithAbilities] = useState<UserMonster[]>([]);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userMonsters, isLoading: loadingMonsters } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  useEffect(() => {
    if (!userMonsters) return;
    let isMounted = true;
    const fetchAbilitiesForAll = async () => {
      const abilitiesMap: Record<number, Ability[]> = {};
      await Promise.all(
        userMonsters.map(async (um) => {
          try {
            const res = await fetch(`/api/monster-abilities/${um.monster.id}`);
            if (res.ok) abilitiesMap[um.monster.id] = await res.json();
          } catch (e) {
            console.error(`Failed to fetch abilities for monster ${um.monster.id}`, e);
          }
        })
      );
      if (isMounted) {
        const populatedMonsters = userMonsters.map(um => ({
          ...um,
          monster: { ...um.monster, abilities: abilitiesMap[um.monster.id] || [] },
        }));
        setMonstersWithAbilities(populatedMonsters);
      }
    };
    fetchAbilitiesForAll();
    return () => { isMounted = false; };
  }, [userMonsters]);

  const { data: battleSlotsData } = useQuery<{ battleSlots: number }>({
    queryKey: ["/api/user/battle-slots"],
  });

  const battleSlots = battleSlotsData?.battleSlots || 2;
  const availableMonsters = monstersWithAbilities.filter((m) => m.hp > 0);

  const calculateTPL = (monsters: UserMonster[]) => monsters.reduce((total, m) => total + m.level, 0);
  const currentTPL = calculateTPL(selectedMonsters);

  const handleMonsterSelect = (monster: UserMonster) => {
    setSelectedMonsters(prev => 
      prev.some(m => m.id === monster.id)
        ? prev.filter(m => m.id !== monster.id)
        : prev.length < battleSlots
        ? [...prev, monster]
        : prev
    );
    if (selectedMonsters.length >= battleSlots && !selectedMonsters.some(m => m.id === monster.id)) {
        toast({ title: "Battle Slots Full", description: `You can only select ${battleSlots} monsters.`, variant: "destructive" });
    }
  };

  // REWRITTEN: This is now a single, robust async function.
  const handleStartBattle = async () => {
    if (selectedMonsters.length === 0) {
      toast({ title: "No Monsters Selected", description: "Please select at least one monster.", variant: "destructive" });
      return;
    }

    setIsStartingBattle(true);

    try {
      // Step 1: Try to spend a battle token.
      const tokenResponse = await apiRequest("/api/battle/spend-token", { method: "POST" });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || "Failed to spend battle token.");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Step 2: If token is spent, generate an opponent.
      const opponentResponse = await apiRequest("/api/battle/generate-opponent", { method: "POST", data: { tpl: currentTPL } });
      if (!opponentResponse.ok) {
        throw new Error("Failed to generate an opponent.");
      }
      const opponentData = await opponentResponse.json();

      // Step 3: If everything succeeds, start the battle.
      onBattleStart(selectedMonsters, opponentData);

    } catch (error) {
      // Step 4: Catch any errors from the process.
      if (error instanceof Error && error.message.includes("NO_BATTLE_TOKENS")) {
        setShowSubscriptionGate(true);
      } else {
        toast({ title: "An Error Occurred", description: (error as Error).message || "Could not start the battle.", variant: "destructive" });
      }
    } finally {
      // Step 5: Always turn off the loading state.
      setIsStartingBattle(false);
    }
  };

  if (loadingMonsters) return <div className="text-center p-8">Loading your monsters...</div>;

  if (!loadingMonsters && availableMonsters.length === 0) {
    return (
       <Card className="w-full max-w-4xl mx-auto"><CardContent className="p-6 text-center"><h3 className="text-xl font-bold mb-4">No Available Monsters</h3><p className="text-muted-foreground">You need healthy monsters to enter battle.</p></CardContent></Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assemble Your Battle Team</h2>
              <p className="text-muted-foreground">Select up to {battleSlots} monsters. Your Team Power Level (TPL) determines your opponent.</p>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2"><Users className="w-5 h-5 text-muted-foreground" /> <span className="font-medium">Slots: {selectedMonsters.length}/{battleSlots}</span></div>
                <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-muted-foreground" /> <span className="font-medium">TPL: {currentTPL}</span></div>
                {selectedMonsters.length > 0 && (
                  <Button onClick={handleStartBattle} disabled={isStartingBattle} className="bg-red-600 hover:bg-red-700">
                    {isStartingBattle ? "Finding Opponent..." : "Start Battle!"}
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
              return (
                <div key={userMonster.id} onClick={() => handleMonsterSelect(userMonster)} className={`cursor-pointer transition-all rounded-lg ${isSelected ? 'ring-4 ring-green-500' : 'hover:ring-2 ring-blue-300'}`}>
                  <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="small" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {showSubscriptionGate && <InterestTest onComplete={() => setShowSubscriptionGate(false)} />}
    </div>
  );
}