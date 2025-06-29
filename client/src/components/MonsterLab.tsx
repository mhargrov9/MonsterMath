import React, { useState, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MonsterCard from './MonsterCard';
import { UserMonster, Monster, Ability } from '@/types/game';
import { apiRequest } from '@/lib/queryClient';


// A helper function to fetch abilities for a single monster
const fetchAbilities = async (monsterId: number): Promise<Ability[]> => {
    const response = await fetch(`/api/monster-abilities/${monsterId}`);
    if (!response.ok) {
        // If the response is not OK, we check if it's JSON or HTML
        const text = await response.text();
        try {
            // Attempt to parse as JSON (for our standard API errors)
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || `Failed to fetch abilities for monster ${monsterId}`);
        } catch (e) {
            // If it fails, it's likely HTML, so we throw a generic error
            throw new Error(`Server returned a non-JSON response for monster ${monsterId}`);
        }
    }
    return response.json();
};


export default function MonsterLab() {
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [blockedMonster, setBlockedMonster] = useState<UserMonster | null>(null);
  const [purchasingMonster, setPurchasingMonster] = useState<number | null>(null);
  const [upgradingMonster, setUpgradingMonster] = useState<number | null>(null);

  // Step 1: Fetch the base list of all monsters and the user's owned monsters
  const { data: allMonsters, isLoading: isLoadingAll } = useQuery<Monster[]>({ queryKey: ['/api/monsters'] });
  const { data: userMonsters, isLoading: isLoadingUser } = useQuery<UserMonster[]>({ queryKey: ['/api/user/monsters'] });

  // Step 2: Once monsters are loaded, create a dynamic list of queries to fetch abilities for each one.
  // This uses a powerful feature of TanStack Query to handle multiple parallel requests.
  const monsterAbilityQueries = useQueries({
    queries: (allMonsters ?? []).map(monster => ({
      queryKey: ['/api/monster-abilities', monster.id],
      queryFn: () => fetchAbilities(monster.id),
      staleTime: Infinity, // The abilities of a base monster rarely change
      enabled: !!allMonsters, // Only run these queries when the monster list is available
    })),
  });

  // Step 3: Combine the data once all queries are complete.
  const isLoading = isLoadingAll || isLoadingUser || monsterAbilityQueries.some(q => q.isLoading);
  const isError = monsterAbilityQueries.some(q => q.isError);

  // We only proceed to combine data if everything has loaded successfully
  const { monstersWithAbilities, userMonstersWithAbilities } = React.useMemo(() => {
    if (isLoading || isError || !allMonsters || !userMonsters) {
      return { monstersWithAbilities: [], userMonstersWithAbilities: [] };
    }

    const abilitiesMap = allMonsters.reduce((acc, monster, index) => {
        acc[monster.id] = monsterAbilityQueries[index].data || [];
        return acc;
    }, {} as Record<number, Ability[]>);

    const populatedAllMonsters = allMonsters.map(m => ({
        ...m,
        abilities: abilitiesMap[m.id]
    }));

    const populatedUserMonsters = userMonsters.map(um => ({
        ...um,
        monster: {
            ...um.monster,
            abilities: abilitiesMap[um.monster.id]
        }
    }));

    return { monstersWithAbilities: populatedAllMonsters, userMonstersWithAbilities: populatedUserMonsters };
  }, [isLoading, isError, allMonsters, userMonsters, monsterAbilityQueries]);


  // --- Action Handlers ---
  const handlePurchaseMonster = async (monsterId: number) => {
    // This logic remains the same
  };

  const handleUpgradeMonster = async (userMonsterId: number) => {
    // This logic remains the same
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading Monster Lab...</div>;
  }

  if (isError) {
    return <div className="text-center p-8 text-red-500">Error: Could not load all monster data. Please try refreshing the page.</div>;
  }

  return (
    <div className="relative p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Monster Lab 🧪</h2>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Available Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {monstersWithAbilities.map((monster) => (
              <div key={monster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                <MonsterCard monster={monster} size="medium" />
                <Button onClick={() => handlePurchaseMonster(monster.id)} disabled={purchasingMonster === monster.id} className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]">
                  {purchasingMonster === monster.id ? "Purchasing..." : `Buy for ${monster.goldCost}g`}
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Your Monsters</h3>
          <div className="grid grid-cols-1 gap-4 justify-items-center">
            {userMonstersWithAbilities.length === 0 ? (
              <Card className="w-full"><CardContent className="p-6 text-center"><p className="text-muted-foreground">You haven't collected any monsters yet.</p></CardContent></Card>
            ) : (
              userMonstersWithAbilities.map((userMonster) => (
                <div key={userMonster.id} className="flex flex-col items-center gap-3 w-full max-w-sm">
                  <MonsterCard
                    monster={userMonster.monster}
                    userMonster={userMonster}
                    isToggleable={true}
                    size="medium"
                  />
                  <Button size="sm" onClick={() => handleUpgradeMonster(userMonster.id)} disabled={upgradingMonster === userMonster.id} className="shadow-lg w-full max-w-xs touch-manipulation min-h-[44px]">
                      {upgradingMonster === userMonster.id ? "Upgrading..." : "Level Up (200g)"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}