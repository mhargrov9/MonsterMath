import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GameUser, UserMonster, Battle } from "@/types/game";

export default function BattleArena() {
  const [selectedOpponent, setSelectedOpponent] = useState<GameUser | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const { toast } = useToast();

  const { data: opponents = [], isLoading: opponentsLoading } = useQuery<GameUser[]>({
    queryKey: ["/api/battle/opponents"],
  });

  const { data: userMonsters = [], isLoading: monstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  const { data: battleHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/battle/history"],
  });

  const challengeMutation = useMutation({
    mutationFn: async ({ defenderId, attackerMonsterId, defenderMonsterId }: {
      defenderId: string;
      attackerMonsterId: number;
      defenderMonsterId: number;
    }) => {
      const response = await apiRequest("POST", "/api/battle/challenge", {
        defenderId,
        attackerMonsterId,
        defenderMonsterId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.attackerWins) {
        toast({
          title: "Victory! ⚔️",
          description: `You won and earned ${data.diamondsAwarded} Diamonds!`,
          className: "bg-lime-green text-white",
        });
      } else {
        toast({
          title: "Defeat 💔",
          description: "Better luck next time! Train your monsters more!",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battle/history"] });
      setSelectedOpponent(null);
      setSelectedMonster(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Battle Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChallenge = (opponent: GameUser) => {
    if (!selectedMonster) {
      toast({
        title: "Select a Monster",
        description: "You need to choose a monster for battle!",
        variant: "destructive",
      });
      return;
    }

    // For simplicity, use the opponent's first monster
    const opponentMonster = userMonsters[0]; // This should be improved to get opponent's monsters
    if (!opponentMonster) {
      toast({
        title: "No Opponent Monster",
        description: "This opponent has no monsters available for battle.",
        variant: "destructive",
      });
      return;
    }

    challengeMutation.mutate({
      defenderId: opponent.id,
      attackerMonsterId: selectedMonster.id,
      defenderMonsterId: opponentMonster.id,
    });
  };

  if (opponentsLoading || monstersLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="font-fredoka text-4xl text-white mb-2">⚔️ Battle Arena ⚔️</h2>
          <p className="text-white/80 text-lg">Loading battle data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-fredoka text-4xl text-white mb-2">⚔️ Battle Arena ⚔️</h2>
        <p className="text-white/80 text-lg">Challenge other trainers and earn Diamonds!</p>
      </div>

      {/* Battle Fee Notice */}
      <div className="bg-bright-orange/20 border border-bright-orange rounded-xl p-4 text-center">
        <p className="text-white font-bold">
          <i className="fas fa-coins mr-2"></i>
          Battle Fee: 100 Gold per challenge
        </p>
      </div>

      {/* Monster Selection */}
      {userMonsters.length > 0 && (
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="font-fredoka text-2xl text-white mb-4">Choose Your Fighter</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userMonsters.map((monster) => (
              <Card
                key={monster.id}
                className={`cursor-pointer transition-all ${
                  selectedMonster?.id === monster.id
                    ? "bg-electric-blue text-white border-4 border-gold-yellow"
                    : "bg-white hover:bg-gray-50"
                }`}
                onClick={() => setSelectedMonster(monster)}
              >
                <CardContent className="p-4">
                  <div className={`w-full h-20 bg-gradient-to-br ${monster.monster.gradient} rounded-lg mb-3 flex items-center justify-center`}>
                    <i className={`${monster.monster.iconClass} text-2xl text-white`}></i>
                  </div>
                  <h4 className="font-bold mb-2">{monster.monster.name} (Lv.{monster.level})</h4>
                  <div className="text-sm">
                    <div>Power: {monster.power}</div>
                    <div>Speed: {monster.speed}</div>
                    <div>Defense: {monster.defense}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Opponents */}
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="font-fredoka text-2xl text-white mb-6">Find Opponent</h3>
        <div className="space-y-4">
          {opponents.map((opponent) => (
            <Card key={opponent.id} className="bg-white rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-vibrant-purple to-electric-blue rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {opponent.firstName || opponent.email || "Anonymous Trainer"}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Gold: {opponent.gold} • Diamonds: {opponent.diamonds}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleChallenge(opponent)}
                  disabled={challengeMutation.isPending || !selectedMonster}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                >
                  Challenge!
                </Button>
              </CardContent>
            </Card>
          ))}
          {opponents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/80">No opponents available right now. Check back later!</p>
            </div>
          )}
        </div>
      </div>

      {/* Battle History */}
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="font-fredoka text-2xl text-white mb-6">Recent Battles</h3>
        <div className="space-y-3">
          {battleHistory.map((battle) => (
            <div key={battle.id} className="bg-white/10 rounded-lg p-3 flex justify-between items-center">
              <div>
                <span className="text-white font-medium">
                  vs {battle.defender?.firstName || battle.defender?.email || "Anonymous"}
                </span>
                <span className={`ml-2 font-bold ${
                  battle.winnerId === battle.attackerId ? "text-lime-green" : "text-red-400"
                }`}>
                  {battle.winnerId === battle.attackerId ? "Victory!" : "Defeat"}
                </span>
              </div>
              <div className="text-diamond-blue font-bold">
                {battle.winnerId === battle.attackerId ? `+${battle.diamondsAwarded}` : "-"} Diamonds
              </div>
            </div>
          ))}
          {battleHistory.length === 0 && (
            <div className="text-center py-4">
              <p className="text-white/80">No battles yet. Start your first challenge!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
