import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MonsterLab from "@/components/MonsterLab";
import BattleArena from "@/components/BattleArena";
import CurrencyDisplay from "@/components/CurrencyDisplay";
import PlayerInventory from "@/components/PlayerInventory";
import StoryManager from "@/components/StoryManager";
import { GameTab, User } from "@/types/game";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<GameTab>("lab");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
    queryFn: () => apiRequest('/api/auth/user', { method: 'GET' }).then(res => res.json())
  });

  const addRepairKitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/inventory/add", {
        method: "POST",
        data: {
          itemName: "Repair Kit",
          itemDescription: "Repairs a shattered monster back to full health. Essential for monster trainers!",
          quantity: 1,
          itemType: "consumable",
          rarity: "rare",
          iconClass: "fas fa-wrench"
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Found!",
        description: "You found a Repair Kit! Check your backpack.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to inventory.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleRetreat = () => {
    setActiveTab("lab"); 
  };

  return (
    <div className="min-h-screen">
      {activeTab !== "battle" && (
        <header className="bg-gray-900/80 backdrop-blur-sm border-b-4 border-electric-blue p-3 sm:p-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto">
            <div className="hidden lg:flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-fredoka text-white">Monster Academy</h1>
              </div>
              <div className="flex items-center space-x-6">
                <CurrencyDisplay user={userData} />
                <PlayerInventory 
                  trigger={
                    <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                      <i className="fas fa-backpack mr-2"></i>
                      Backpack
                    </Button>
                  }
                />
                <Button onClick={handleLogout} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={activeTab !== "battle" ? "max-w-7xl mx-auto p-3 sm:p-4 lg:p-6" : "w-full h-full"}>
        {activeTab !== "battle" && (
            <div className="mb-6 sm:mb-8">
              <div className="flex space-x-4 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
                <Button onClick={() => setActiveTab("lab")} className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${activeTab === "lab" ? "bg-electric-blue text-white animate-pulse-glow" : "bg-white/20 text-white hover:bg-white/30"}`} >MONSTER LAB</Button>
                <Button onClick={() => setActiveTab("battle")} className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${activeTab === "battle" ? "bg-electric-blue text-white animate-pulse-glow" : "bg-white/20 text-white hover:bg-white/30"}`} >BATTLE ARENA</Button>
                <Button onClick={() => setActiveTab("story")} className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${activeTab === "story" ? "bg-electric-blue text-white animate-pulse-glow" : "bg-white/20 text-white hover:bg-white/30"}`} >STORY</Button>
              </div>
            </div>
        )}

        {activeTab === "lab" && <MonsterLab />}
        {activeTab === "battle" && <BattleArena onRetreat={handleRetreat} />}
        {activeTab === "story" && <StoryManager />}
      </div>
    </div>
  );
}