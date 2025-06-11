import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { GameUser, UserMonster, Battle } from "@/types/game";

export default function BattleArena() {
  const [selectedOpponent, setSelectedOpponent] = useState<any | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const { toast } = useToast();

  const { data: user } = useQuery<GameUser>({
    queryKey: ["/api/auth/user"],
  });

  const { data: userMonsters = [], isLoading: monstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  const { data: battleHistory = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/battle/history"],
  });

  // AI opponents with detailed characteristics
  const aiOpponents = [
    { id: 'ai-1', name: 'Professor Quibble', difficulty: 'Easy', totalPower: 120, description: 'Your friendly academy instructor', color: '#10B981' },
    { id: 'ai-2', name: 'Scholar Maya', difficulty: 'Easy', totalPower: 140, description: 'A dedicated student from the crystal caves', color: '#10B981' },
    { id: 'ai-3', name: 'Wizard Finn', difficulty: 'Medium', totalPower: 180, description: 'Master of elemental magic', color: '#F59E0B' },
    { id: 'ai-4', name: 'Knight Vera', difficulty: 'Medium', totalPower: 200, description: 'Defender of the monster realm', color: '#F59E0B' },
    { id: 'ai-5', name: 'Sage Kael', difficulty: 'Medium', totalPower: 220, description: 'Ancient keeper of monster wisdom', color: '#F59E0B' },
    { id: 'ai-6', name: 'Champion Zara', difficulty: 'Hard', totalPower: 250, description: 'Undefeated arena champion', color: '#EF4444' },
    { id: 'ai-7', name: 'Lord Draven', difficulty: 'Hard', totalPower: 280, description: 'Dark master of shadow monsters', color: '#EF4444' },
    { id: 'ai-8', name: 'Empress Luna', difficulty: 'Hard', totalPower: 300, description: 'Ruler of the celestial beasts', color: '#EF4444' },
    { id: 'ai-9', name: 'Titan Rex', difficulty: 'Expert', totalPower: 350, description: 'Legendary monster tamer', color: '#8B5CF6' },
    { id: 'ai-10', name: 'Supreme Aether', difficulty: 'Expert', totalPower: 400, description: 'The ultimate monster master', color: '#8B5CF6' },
  ];

  const canBattle = user && user.battleTokens > 0;
  const nextTokenProgress = user ? (user.correctAnswers % 50) : 0;

  const challengeMutation = useMutation({
    mutationFn: async ({ opponentId, monsterId }: {
      opponentId: string;
      monsterId: number;
    }) => {
      return await apiRequest("POST", "/api/battles/challenge-ai", { 
        opponentId, 
        monsterId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/battle/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Battle Complete!",
        description: "Check your battle history for results.",
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
        title: "Battle Failed",
        description: error.message || "Failed to start battle",
        variant: "destructive",
      });
    },
  });

  if (monstersLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Battle Arena</h2>
          <p className="text-muted-foreground">Loading battle data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Battle Arena</h2>
        <p className="text-muted-foreground">Challenge AI opponents to test your monsters!</p>
      </div>

      {/* Battle Token Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Battle Access</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              <span className="font-bold">{user?.battleTokens || 0} Tokens</span>
            </div>
          </div>
          
          {!canBattle ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">Earn Battle Tokens</h4>
              <p className="text-yellow-700 mb-3">
                Answer questions correctly to earn battle tokens! You get 1 token for every 50 correct answers.
              </p>
              <div className="bg-yellow-100 rounded-lg p-3">
                <div className="flex justify-between text-sm text-yellow-800 mb-1">
                  <span>Progress to next token:</span>
                  <span>{nextTokenProgress}/50</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all" 
                    style={{ width: `${(nextTokenProgress / 50) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  {50 - nextTokenProgress} more correct answers needed
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">
                You have {user.battleTokens} battle token{user.battleTokens !== 1 ? 's' : ''} available! 
                Each battle costs 1 token.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Opponents */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">AI Opponents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiOpponents.map((opponent) => (
              <Card key={opponent.id} className={`transition-all ${
                canBattle 
                  ? 'cursor-pointer hover:shadow-md hover:scale-105' 
                  : 'opacity-50 cursor-not-allowed'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: opponent.color }}
                    ></div>
                    <div>
                      <h4 className="font-semibold">{opponent.name}</h4>
                      <p className="text-xs text-muted-foreground">{opponent.difficulty}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{opponent.description}</p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium">Total Power:</span>
                    <span className="font-bold" style={{ color: opponent.color }}>
                      {opponent.totalPower}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    disabled={!canBattle}
                    onClick={() => canBattle && setSelectedOpponent(opponent)}
                    style={{ 
                      backgroundColor: canBattle ? opponent.color : undefined,
                      borderColor: opponent.color 
                    }}
                  >
                    {canBattle ? 'Challenge' : 'Need Token'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Battle History */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Battles</h3>
          {historyLoading ? (
            <p>Loading battle history...</p>
          ) : battleHistory.length === 0 ? (
            <p className="text-muted-foreground">No battles yet. Challenge an AI opponent to get started!</p>
          ) : (
            <div className="space-y-2">
              {battleHistory.slice(0, 5).map((battle: any) => (
                <div key={battle.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>You vs {battle.opponentName || "AI Opponent"}</span>
                  <span className={battle.winnerId === battle.attackerId ? "text-green-600" : "text-red-600"}>
                    {battle.winnerId === battle.attackerId ? "Victory" : "Defeat"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monster Selection Modal */}
      {selectedOpponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Choose Your Monster vs {selectedOpponent.name}
              </h3>
              
              {userMonsters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You need a monster to battle!</p>
                  <Button onClick={() => setSelectedOpponent(null)}>
                    Go to Monster Lab
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userMonsters.map((monster) => (
                    <Card 
                      key={monster.id} 
                      className={`cursor-pointer transition-shadow ${
                        selectedMonster?.id === monster.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedMonster(monster)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{monster.monster.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Level {monster.level} • Stage {monster.evolutionStage}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Power: {monster.power + monster.speed + monster.defense}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedOpponent(null);
                        setSelectedMonster(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      disabled={!selectedMonster || challengeMutation.isPending}
                      onClick={() => {
                        if (selectedMonster) {
                          challengeMutation.mutate({
                            opponentId: selectedOpponent.id,
                            monsterId: selectedMonster.id,
                          });
                          setSelectedOpponent(null);
                          setSelectedMonster(null);
                        }
                      }}
                    >
                      {challengeMutation.isPending ? "Battling..." : "Battle!"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}