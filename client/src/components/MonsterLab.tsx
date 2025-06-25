import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MonsterCard from "./MonsterCard";
import { Zap, Shield } from "lucide-react";

// Types (simplified for this component)
interface Monster {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  power: number;
  defense: number;
  speed: number;
  mp: number;
  max_mp: number;
  affinity: string;
  image_url?: string;
  resistances: string[];
  weaknesses: string[];
  level: number;
  goldCost: number;
}

interface UserMonster {
  id: number;
  user_id: number;
  monster_id: number;
  monster: Monster;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  power: number;
  defense: number;
  speed: number;
  evolutionStage: number;
  upgradeChoices?: any;
  monsterId: number;
}

const MAX_LEVEL = 10; // Maximum level for monsters

export default function MonsterLab() {
  // Define the state for monsters, loading, and errors
  const [userMonsters, setUserMonsters] = useState<UserMonster[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [animatingCards, setAnimatingCards] = useState<Record<number, boolean>>({});
  const [purchasingMonster, setPurchasingMonster] = useState<number | null>(null);
  const [upgradingMonster, setUpgradingMonster] = useState<number | null>(null);

  // Fetch user monsters when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both monsters and user monsters
        const [monstersResponse, userMonstersResponse] = await Promise.all([
          fetch('/api/monsters'),
          fetch('/api/user/monsters')
        ]);

        if (!monstersResponse.ok) {
          throw new Error('Failed to fetch available monsters');
        }
        if (!userMonstersResponse.ok) {
          throw new Error('Failed to fetch user monsters');
        }

        const monstersData = await monstersResponse.json();
        const userMonstersData = await userMonstersResponse.json();

        setMonsters(monstersData);
        setUserMonsters(userMonstersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // Add this handler function inside the MonsterLab component
  const handleAddTokens = async () => {
    try {
      const response = await fetch('/api/dev/add-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5 }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to add tokens');
      }
      console.log("Tokens added:", result);
      // You can add a success toast/alert here
      alert("5 battle tokens added successfully!");
      // Optionally, refetch user data to show updated token count if displayed on this page
    } catch (error) {
      console.error("Error adding tokens:", error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handlePurchaseMonster = async (monsterId: number) => {
    setPurchasingMonster(monsterId);
    try {
      const response = await fetch('/api/monsters/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase monster');
      }

      const newMonster = await response.json();
      // Refresh user monsters list
      const userMonstersResponse = await fetch('/api/user/monsters');
      if (userMonstersResponse.ok) {
        const updatedUserMonsters = await userMonstersResponse.json();
        setUserMonsters(updatedUserMonsters);
      }

      alert("Monster purchased successfully!");
    } catch (error) {
      console.error("Error purchasing monster:", error);
      alert(error instanceof Error ? error.message : 'Failed to purchase monster');
    } finally {
      setPurchasingMonster(null);
    }
  };

  const handleUpgradeMonster = async (userMonsterId: number) => {
    setUpgradingMonster(userMonsterId);
    setAnimatingCards(prev => ({ ...prev, [userMonsterId]: true }));

    try {
      const response = await fetch('/api/monsters/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMonsterId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upgrade monster');
      }

      // Refresh user monsters list
      const userMonstersResponse = await fetch('/api/user/monsters');
      if (userMonstersResponse.ok) {
        const updatedUserMonsters = await userMonstersResponse.json();
        setUserMonsters(updatedUserMonsters);
      }

      alert("Monster upgraded successfully!");
    } catch (error) {
      console.error("Error upgrading monster:", error);
      alert(error instanceof Error ? error.message : 'Failed to upgrade monster');
    } finally {
      setUpgradingMonster(null);
      setTimeout(() => setAnimatingCards(prev => ({ ...prev, [userMonsterId]: false })), 2000);
    }
  };

  // Add rendering logic for loading and error states
  if (isLoading) {
    return <div className="text-center p-8">Loading your monsters...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  // Main component render
  return (
    <div className="relative p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Dev Button - positioned absolutely */}
      <Button onClick={handleAddTokens} className="absolute top-4 right-4 z-10">
        Dev: Add 5 Tokens
      </Button>

      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Monster Lab 🧪</h2>
        {/* Space reserved for the absolute positioned button */}
        <div className="w-32"></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Available Monsters */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Available Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {monsters.map((monster) => (
              <div key={monster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                <MonsterCard
                  monster={monster}
                  size="medium"
                />
                <Button
                  onClick={() => handlePurchaseMonster(monster.id)}
                  disabled={purchasingMonster === monster.id}
                  className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]"
                >
                  {purchasingMonster === monster.id ? "Purchasing..." : `Buy ${monster.goldCost}g`}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* User's Monsters */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Your Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {userMonsters.length === 0 ? (
              <Card className="w-full">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No monsters yet. Purchase one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              userMonsters.map((userMonster) => (
                <div key={userMonster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <MonsterCard
                    monster={userMonster.monster}
                    userMonster={userMonster}
                    isFlipped={flippedCards[userMonster.id] || false}
                    onFlip={() => setFlippedCards(prev => ({
                      ...prev,
                      [userMonster.id]: !prev[userMonster.id]
                    }))}
                    showUpgradeAnimation={animatingCards[userMonster.id] || false}
                    size="medium"
                  />
                  {!(flippedCards[userMonster.id] || false) && (
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      {userMonster.level < MAX_LEVEL ? (
                        <Button
                          size="sm"
                          onClick={() => handleUpgradeMonster(userMonster.id)}
                          disabled={upgradingMonster === userMonster.id}
                          className="shadow-lg w-full touch-manipulation min-h-[44px]"
                        >
                          {upgradingMonster === userMonster.id ? "Upgrading..." : "Level Up (200g)"}
                        </Button>
                      ) : (
                        <div className="text-center py-2 text-sm text-white/70 font-medium">
                          Max Level Reached
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Placeholder for special upgrades
                          alert("Special upgrades coming soon!");
                        }}
                        className="shadow-lg w-full touch-manipulation min-h-[44px] border-white/20 text-white hover:bg-white/10"
                      >
                        Special Upgrades
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
