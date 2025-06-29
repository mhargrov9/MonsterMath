import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MonsterCard from './MonsterCard';
import { Monster, UserMonster, Ability } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';

const fetchApiJson = async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
        const errorText = await res.text().catch(() => 'Failed to read error response');
        throw new Error(`Request to ${path} failed with status ${res.status}. Response: ${errorText.slice(0, 200)}`);
    }
    return res.json();
};

const MonsterLab: React.FC = () => {
    const { user } = useAuth();
    const [isReady, setIsReady] = useState(false);

    // This useEffect creates the small delay needed to resolve the race condition.
    useEffect(() => {
        if (user) {
            // Wait 100ms after the user is confirmed to be authenticated before fetching data.
            const timer = setTimeout(() => setIsReady(true), 100);
            return () => clearTimeout(timer);
        }
    }, [user]);

    // --- Step 1: Fetch primary data sources ---
    const { data: allMonsters, isLoading: isLoadingAll, isError: isErrorAll, error: errorAll } = useQuery<Monster[]>({ 
        queryKey: ['/api/monsters'], 
        queryFn: () => fetchApiJson('/api/monsters'),
        enabled: isReady, // Query only runs when the component is ready.
        retry: false,
    });

    const { data: userMonsters, isLoading: isLoadingUser, isError: isErrorUser, error: errorUser } = useQuery<UserMonster[]>({ 
        queryKey: ['/api/user/monsters'],
        queryFn: () => fetchApiJson('/api/user/monsters'),
        enabled: isReady, // Query only runs when the component is ready.
        retry: false,
    });

    // For simplicity, we will add ability fetching back in a future step.
    // Our goal now is to confirm the primary data loads.

    const isLoading = isLoadingAll || isLoadingUser || !isReady;

    if (!isReady) {
         return <div className="text-center p-8 text-white">Authenticating...</div>;
    }

    if (isLoading) {
        return <div className="text-center p-8 text-white">Loading Monster Data...</div>;
    }

    return (
        <div className="relative p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Monster Lab 🧪</h2>
            </div>
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Available Monsters Section */}
                <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Available Monsters</h3>
                    <div className="grid grid-cols-1 gap-4 justify-items-center">
                        {isErrorAll ? (
                            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg"><p className="font-bold">Error: {(errorAll as Error).message}</p></div>
                        ) : (allMonsters && allMonsters.length > 0) ? (
                            allMonsters.map((monster) => (
                                <div key={`avail-${monster.id}`} className="flex flex-col items-center gap-3 w-full max-w-sm">
                                    <MonsterCard monster={monster} size="medium" isToggleable={true} />
                                    <Button disabled className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]">
                                        {`Buy for ${monster.goldCost}g`}
                                    </Button>
                                </div>
                            ))
                        ) : <p className="text-white/70">No monsters available for purchase.</p>
                        }
                    </div>
                </div>
                {/* Your Monsters Section */}
                <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Your Monsters</h3>
                    <div className="grid grid-cols-1 gap-4 justify-items-center">
                        {isErrorUser ? (
                            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg"><p className="font-bold">Error: {(errorUser as Error).message}</p></div>
                        ) : userMonsters && userMonsters.length > 0 ? (
                            userMonsters.map((userMonster) => (
                                <div key={`user-${userMonster.id}`} className="flex flex-col items-center gap-3 w-full max-w-sm">
                                  <MonsterCard monster={userMonster.monster} userMonster={userMonster} isToggleable={true} size="medium" />
                                  <Button disabled className="shadow-lg w-full max-w-xs touch-manipulation min-h-[44px]">
                                      Level Up (200g)
                                  </Button>
                                </div>
                            ))
                        ) : (
                          <Card className="w-full bg-white/5 border-white/10"><CardContent className="p-6 text-center"><p className="text-white/70">You haven't collected any monsters yet.</p></CardContent></Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonsterLab;