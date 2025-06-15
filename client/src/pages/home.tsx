import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import ProfessorGuide from "@/components/ProfessorGuide";
import LearningSystem from "@/components/LearningSystem";
import MonsterLab from "@/components/MonsterLab";
import BattleArena from "@/components/BattleArena";
import CurrencyDisplay from "@/components/CurrencyDisplay";
import PlayerInventory from "@/components/PlayerInventory";
import { GameTab } from "@/types/game";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<GameTab>("learn");

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen">
      {/* Header with Currency Display */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b-4 border-electric-blue p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-fredoka text-white">Monster Academy</h1>
            <div className="flex items-center space-x-2 bg-lime-green/20 px-3 py-1 rounded-full">
              <i className="fas fa-flask text-lime-green"></i>
              <span className="text-lime-green font-semibold">Lab Active</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <CurrencyDisplay user={userData} />
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
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Professor Quibble Welcome Section */}
        <ProfessorGuide />

        {/* Main Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
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
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "learn" && <LearningSystem />}
        {activeTab === "lab" && <MonsterLab />}
        {activeTab === "battle" && <BattleArena />}
      </div>

      {/* Floating Action Button for Quick Question */}
      <Button
        onClick={() => setActiveTab("learn")}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-lime-green to-electric-blue text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-pulse"
      >
        <i className="fas fa-question text-2xl"></i>
      </Button>
    </div>
  );
}
