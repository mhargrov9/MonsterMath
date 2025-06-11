import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, Gem, Zap, Shield, Gauge } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MonsterGraphics from "./MonsterGraphics";
import UpgradeChoice from "./UpgradeChoice";
import { Monster, UserMonster, GameUser } from "@/types/game";
import { useState } from "react";

export default function MonsterLab() {
  const { toast } = useToast();
  const [selectedMonster, setSelectedMonster] = useState<UserMonster | null>(null);
  const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);

  const { data: monsters = [], isLoading: monstersLoading } = useQuery<Monster[]>({
    queryKey: ["/api/monsters"],
  });

  const { data: userMonsters = [], isLoading: userMonstersLoading } = useQuery<UserMonster[]>({
    queryKey: ["/api/user/monsters"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (monsterId: number) => {
      const response = await apiRequest("POST", "/api/monsters/purchase", { monsterId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Monster Purchased! 🐲",
        description: "Welcome to your team!",
        className: "bg-lime-green text-white",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (userMonsterId: number) => {
      const response = await apiRequest("POST", "/api/monsters/upgrade", { userMonsterId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Monster Upgraded! ⚡",
        description: "Your monster is now stronger!",
        className: "bg-electric-blue text-white",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (monstersLoading || userMonstersLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="font-fredoka text-4xl text-white mb-2">🧪 Monster Laboratory 🧪</h2>
          <p className="text-white/80 text-lg">Loading monsters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-fredoka text-4xl text-white mb-2">🧪 Monster Laboratory 🧪</h2>
        <p className="text-white/80 text-lg">Buy, upgrade, and manage your monster collection!</p>
      </div>

      {/* Lab Equipment Decoration */}
      <div className="flex justify-center space-x-8 mb-8">
        <div className="w-16 h-20 bg-gradient-to-t from-lime-green/30 to-lime-green/60 rounded-full relative beaker-bubble animate-float"></div>
        <div className="w-16 h-20 bg-gradient-to-t from-electric-blue/30 to-electric-blue/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "0.5s"}}></div>
        <div className="w-16 h-20 bg-gradient-to-t from-vibrant-purple/30 to-vibrant-purple/60 rounded-full relative beaker-bubble animate-float" style={{animationDelay: "1s"}}></div>
      </div>

      {/* My Monsters */}
      <div className="mb-8">
        <h3 className="font-fredoka text-2xl text-white mb-4 flex items-center">
          <i className="fas fa-paw mr-2 text-lime-green"></i>
          My Monster Squad
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {userMonsters.map((userMonster) => (
            <Card key={userMonster.id} className="bg-white rounded-2xl shadow-xl border-4 border-electric-blue transform hover:scale-105 transition-transform">
              <CardContent className="p-6">
                {/* Monster illustration */}
                <div className={`w-full h-32 bg-gradient-to-br ${userMonster.monster.gradient} rounded-xl mb-4 flex items-center justify-center`}>
                  <i className={`${userMonster.monster.iconClass} text-4xl text-white`}></i>
                </div>
                <h4 className="font-fredoka text-xl text-gray-800 mb-2">
                  {userMonster.monster.name} (Lv.{userMonster.level})
                </h4>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Power:</span>
                    <span className="font-bold text-electric-blue">{userMonster.power}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span className="font-bold text-lime-green">{userMonster.speed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Defense:</span>
                    <span className="font-bold text-vibrant-purple">{userMonster.defense}</span>
                  </div>
                </div>
                <Button
                  onClick={() => upgradeMutation.mutate(userMonster.id)}
                  disabled={upgradeMutation.isPending}
                  className="w-full bg-bright-orange text-white py-2 rounded-xl font-bold hover:bg-bright-orange/80 transition-colors"
                >
                  Upgrade (200 Gold)
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {/* Empty slot for new monster */}
          <Card className="bg-white/20 border-2 border-dashed border-white/50 rounded-2xl flex flex-col items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer min-h-[300px]">
            <CardContent className="p-6 text-center">
              <i className="fas fa-plus text-4xl mb-4 text-white/60"></i>
              <p className="font-bold">Add New Monster</p>
              <p className="text-sm text-white/80">Visit Monster Shop</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monster Shop */}
      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="font-fredoka text-2xl text-white mb-6 flex items-center">
          <i className="fas fa-store mr-2 text-gold-yellow"></i>
          Monster Shop
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {monsters.map((monster) => (
            <Card key={monster.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                {/* Monster illustration */}
                <div className={`w-full h-24 bg-gradient-to-br ${monster.gradient} rounded-lg mb-3 flex items-center justify-center`}>
                  <i className={`${monster.iconClass} text-2xl text-white`}></i>
                </div>
                <h5 className="font-bold text-gray-800 mb-2">{monster.name}</h5>
                <p className="text-gray-600 text-sm mb-3">{monster.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-gold-yellow font-bold">{monster.goldCost} Gold</span>
                    {monster.diamondCost > 0 && (
                      <span className="text-diamond-blue font-bold">{monster.diamondCost} Diamonds</span>
                    )}
                  </div>
                  <Button
                    onClick={() => purchaseMutation.mutate(monster.id)}
                    disabled={purchaseMutation.isPending}
                    className="bg-lime-green text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-lime-green/80 transition-colors"
                  >
                    Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
