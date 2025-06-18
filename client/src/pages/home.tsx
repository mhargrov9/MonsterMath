import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProfessorGuide from "@/components/ProfessorGuide";
import LearningSystem from "@/components/LearningSystem";
import MonsterLab from "@/components/MonsterLab";
import BattleArena from "@/components/BattleArena";
import CurrencyDisplay from "@/components/CurrencyDisplay";
import PlayerInventory from "@/components/PlayerInventory";
import StoryManager from "@/components/StoryManager";
import MonsterCard from "@/components/MonsterCard";
import { GameTab } from "@/types/game";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<GameTab>("learn");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  // Fetch monsters for collage
  const { data: monsters } = useQuery({
    queryKey: ['/api/monsters'],
  });

  const addRepairKitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/inventory/add", {
        itemName: "Repair Kit",
        itemDescription: "Repairs a shattered monster back to full health. Essential for monster trainers!",
        quantity: 1,
        itemType: "consumable",
        rarity: "rare",
        iconClass: "fas fa-wrench"
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

  return (
    <div className="min-h-screen">
      {/* Header with Currency Display */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b-4 border-electric-blue p-3 sm:p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout */}
          <div className="flex lg:hidden flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-fredoka text-white">Monster Academy</h1>
              <div className="flex items-center space-x-2 bg-lime-green/20 px-2 py-1 rounded-full">
                <i className="fas fa-flask text-lime-green text-sm"></i>
                <span className="text-lime-green font-semibold text-sm">Lab Active</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <CurrencyDisplay user={userData as any} />
              <div className="flex items-center space-x-2">
                <PlayerInventory 
                  trigger={
                    <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
                      <i className="fas fa-backpack"></i>
                    </Button>
                  }
                />
                <Button 
                  onClick={() => addRepairKitMutation.mutate()}
                  disabled={addRepairKitMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="text-white border-lime-green/50 hover:bg-lime-green/10"
                >
                  <i className="fas fa-gift"></i>
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-fredoka text-white">Monster Academy</h1>
              <div className="flex items-center space-x-2 bg-lime-green/20 px-3 py-1 rounded-full">
                <i className="fas fa-flask text-lime-green"></i>
                <span className="text-lime-green font-semibold">Lab Active</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <CurrencyDisplay user={userData as any} />
              <PlayerInventory 
                trigger={
                  <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                    <i className="fas fa-backpack mr-2"></i>
                    Backpack
                  </Button>
                }
              />
              <Button 
                onClick={() => addRepairKitMutation.mutate()}
                disabled={addRepairKitMutation.isPending}
                variant="outline"
                className="text-white border-lime-green/50 hover:bg-lime-green/10"
              >
                <i className="fas fa-gift mr-2"></i>
                Find Item
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 relative">
        {/* Monster Card Collage Background */}
        <div className="fixed top-[5%] left-[5%] transform rotate-[-12deg] scale-[0.2] opacity-30 pointer-events-none z-0">
          <MonsterCard monster={{ id: 6, name: "Gigalith", type: "Earth", basePower: 150, baseSpeed: 80, baseDefense: 200, level: 1 }} />
        </div>
        <div className="fixed top-[3%] left-[25%] transform rotate-[8deg] scale-[0.18] opacity-25 pointer-events-none z-0">
          <MonsterCard monster={{ id: 7, name: "Aetherion", type: "Psychic", basePower: 180, baseSpeed: 120, baseDefense: 70, level: 2 }} />
        </div>
        <div className="fixed top-[7%] left-[45%] transform rotate-[-15deg] scale-[0.22] opacity-35 pointer-events-none z-0">
          <MonsterCard monster={{ id: 8, name: "Geode Tortoise", type: "Earth", basePower: 90, baseSpeed: 40, baseDefense: 160, level: 1 }} />
        </div>
        <div className="fixed top-[4%] left-[65%] transform rotate-[18deg] scale-[0.19] opacity-30 pointer-events-none z-0">
          <MonsterCard monster={{ id: 9, name: "Gale-Feather Griffin", type: "Air", basePower: 110, baseSpeed: 140, baseDefense: 80, level: 3 }} />
        </div>
        <div className="fixed top-[6%] left-[85%] transform rotate-[-8deg] scale-[0.17] opacity-28 pointer-events-none z-0">
          <MonsterCard monster={{ id: 10, name: "Cinder-Tail Salamander", type: "Fire", basePower: 130, baseSpeed: 100, baseDefense: 90, level: 2 }} />
        </div>

        {/* Second row */}
        <div className="fixed top-[25%] left-[2%] transform rotate-[15deg] scale-[0.21] opacity-32 pointer-events-none z-0">
          <MonsterCard monster={{ id: 11, name: "River-Spirit Axolotl", type: "Water", basePower: 85, baseSpeed: 90, baseDefense: 110, level: 1 }} />
        </div>
        <div className="fixed top-[28%] left-[22%] transform rotate-[-20deg] scale-[0.16] opacity-28 pointer-events-none z-0">
          <MonsterCard monster={{ id: 12, name: "Spark-Tail Squirrel", type: "Electric", basePower: 95, baseSpeed: 125, baseDefense: 75, level: 3 }} />
        </div>
        <div className="fixed top-[26%] left-[42%] transform rotate-[12deg] scale-[0.23] opacity-33 pointer-events-none z-0">
          <MonsterCard monster={{ id: 6, name: "Gigalith", type: "Earth", basePower: 150, baseSpeed: 80, baseDefense: 200, level: 2 }} />
        </div>
        <div className="fixed top-[29%] left-[62%] transform rotate-[-25deg] scale-[0.18] opacity-29 pointer-events-none z-0">
          <MonsterCard monster={{ id: 7, name: "Aetherion", type: "Psychic", basePower: 180, baseSpeed: 120, baseDefense: 70, level: 1 }} />
        </div>
        <div className="fixed top-[27%] left-[82%] transform rotate-[22deg] scale-[0.20] opacity-26 pointer-events-none z-0">
          <MonsterCard monster={{ id: 8, name: "Geode Tortoise", type: "Earth", basePower: 90, baseSpeed: 40, baseDefense: 160, level: 3 }} />
        </div>

        {/* Third row */}
        <div className="fixed top-[50%] left-[8%] transform rotate-[-10deg] scale-[0.19] opacity-34 pointer-events-none z-0">
          <MonsterCard monster={{ id: 9, name: "Gale-Feather Griffin", type: "Air", basePower: 110, baseSpeed: 140, baseDefense: 80, level: 2 }} />
        </div>
        <div className="fixed top-[52%] left-[28%] transform rotate-[25deg] scale-[0.22] opacity-30 pointer-events-none z-0">
          <MonsterCard monster={{ id: 10, name: "Cinder-Tail Salamander", type: "Fire", basePower: 130, baseSpeed: 100, baseDefense: 90, level: 1 }} />
        </div>
        <div className="fixed top-[48%] left-[48%] transform rotate-[-18deg] scale-[0.17] opacity-32 pointer-events-none z-0">
          <MonsterCard monster={{ id: 11, name: "River-Spirit Axolotl", type: "Water", basePower: 85, baseSpeed: 90, baseDefense: 110, level: 3 }} />
        </div>
        <div className="fixed top-[51%] left-[68%] transform rotate-[14deg] scale-[0.21] opacity-27 pointer-events-none z-0">
          <MonsterCard monster={{ id: 12, name: "Spark-Tail Squirrel", type: "Electric", basePower: 95, baseSpeed: 125, baseDefense: 75, level: 2 }} />
        </div>
        <div className="fixed top-[49%] left-[88%] transform rotate-[-22deg] scale-[0.18] opacity-31 pointer-events-none z-0">
          <MonsterCard monster={{ id: 6, name: "Gigalith", type: "Earth", basePower: 150, baseSpeed: 80, baseDefense: 200, level: 1 }} />
        </div>

        {/* Fourth row */}
        <div className="fixed top-[72%] left-[5%] transform rotate-[20deg] scale-[0.20] opacity-28 pointer-events-none z-0">
          <MonsterCard monster={{ id: 7, name: "Aetherion", type: "Psychic", basePower: 180, baseSpeed: 120, baseDefense: 70, level: 3 }} />
        </div>
        <div className="fixed top-[75%] left-[25%] transform rotate-[-15deg] scale-[0.19] opacity-33 pointer-events-none z-0">
          <MonsterCard monster={{ id: 8, name: "Geode Tortoise", type: "Earth", basePower: 90, baseSpeed: 40, baseDefense: 160, level: 1 }} />
        </div>
        <div className="fixed top-[73%] left-[45%] transform rotate-[10deg] scale-[0.22] opacity-29 pointer-events-none z-0">
          <MonsterCard monster={{ id: 9, name: "Gale-Feather Griffin", type: "Air", basePower: 110, baseSpeed: 140, baseDefense: 80, level: 2 }} />
        </div>
        <div className="fixed top-[76%] left-[65%] transform rotate-[-28deg] scale-[0.16] opacity-31 pointer-events-none z-0">
          <MonsterCard monster={{ id: 10, name: "Cinder-Tail Salamander", type: "Fire", basePower: 130, baseSpeed: 100, baseDefense: 90, level: 3 }} />
        </div>
        <div className="fixed top-[74%] left-[85%] transform rotate-[16deg] scale-[0.21] opacity-25 pointer-events-none z-0">
          <MonsterCard monster={{ id: 11, name: "River-Spirit Axolotl", type: "Water", basePower: 85, baseSpeed: 90, baseDefense: 110, level: 1 }} />
        </div>
        {/* Professor Quibble Welcome Section */}
        <ProfessorGuide />

        {/* Main Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: 2x2 Grid Layout */}
          <div className="grid grid-cols-2 gap-3 sm:hidden bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
            <Button
              onClick={() => setActiveTab("learn")}
              className={`px-3 py-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === "learn"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-graduation-cap mb-1 block"></i>
              LEARN
            </Button>
            <Button
              onClick={() => setActiveTab("lab")}
              className={`px-3 py-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === "lab"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-flask mb-1 block"></i>
              LAB
            </Button>
            <Button
              onClick={() => setActiveTab("battle")}
              className={`px-3 py-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === "battle"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-fist-raised mb-1 block"></i>
              BATTLE
            </Button>
            <Button
              onClick={() => setActiveTab("story")}
              className={`px-3 py-4 rounded-xl font-bold text-sm transition-all ${
                activeTab === "story"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-book-open mb-1 block"></i>
              STORY
            </Button>
          </div>

          {/* Tablet: Single Row Layout */}
          <div className="hidden sm:flex lg:hidden space-x-2 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
            <Button
              onClick={() => setActiveTab("learn")}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === "learn"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-graduation-cap mr-1"></i>
              LEARN
            </Button>
            <Button
              onClick={() => setActiveTab("lab")}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === "lab"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-flask mr-1"></i>
              LAB
            </Button>
            <Button
              onClick={() => setActiveTab("battle")}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === "battle"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-fist-raised mr-1"></i>
              BATTLE
            </Button>
            <Button
              onClick={() => setActiveTab("story")}
              className={`flex-1 px-4 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === "story"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-book-open mr-1"></i>
              STORY
            </Button>
          </div>

          {/* Desktop: Full Layout */}
          <div className="hidden lg:flex space-x-4 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
            <Button
              onClick={() => setActiveTab("learn")}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === "learn"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-graduation-cap mr-2"></i>
              LEARN
            </Button>
            <Button
              onClick={() => setActiveTab("lab")}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === "lab"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-flask mr-2"></i>
              MONSTER LAB
            </Button>
            <Button
              onClick={() => setActiveTab("battle")}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === "battle"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-fist-raised mr-2"></i>
              BATTLE ARENA
            </Button>
            <Button
              onClick={() => setActiveTab("story")}
              className={`flex-1 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === "story"
                  ? "bg-electric-blue text-white animate-pulse-glow"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <i className="fas fa-book-open mr-2"></i>
              STORY
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "learn" && <LearningSystem />}
        {activeTab === "lab" && <MonsterLab />}
        {activeTab === "battle" && <BattleArena />}
        {activeTab === "story" && <StoryManager />}
      </div>

      {/* Floating Action Button for Quick Question */}
      <Button
        onClick={() => setActiveTab("learn")}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-lime-green to-electric-blue text-white p-3 sm:p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-pulse touch-manipulation"
        size="lg"
      >
        <i className="fas fa-question text-xl sm:text-2xl"></i>
      </Button>
    </div>
  );
}
