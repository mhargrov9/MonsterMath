import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MonsterCard from './MonsterCard';
import { useAuth } from '@/hooks/useAuth';
import { Monster, PlayerCombatMonster } from '@/types/game';

interface MonsterLabData {
    allMonsters: Monster[];
    userMonsters: PlayerCombatMonster[];
}

const fetchApiJson = async (path: string): Promise<MonsterLabData> => {
    const res = await fetch(path);
    if (!res.ok) {
        throw new Error(`Request to ${path} failed with status ${res.status}`);
    }
    return res.json();
};

const MonsterLab: React.FC = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const { data, isLoading, isError } = useQuery<MonsterLabData>({ 
        queryKey: ['/api/monster-lab-data'], 
        queryFn: () => fetchApiJson('/api/monster-lab-data'),
        enabled: isAuthenticated,
    });

    const isLoadingData = isLoading || isAuthLoading;

    if (isLoadingData) {
        return <div className="text-center p-8 text-white">Loading Monster Lab...</div>;
    }

    if (isError) {
        return (
            <div className="p-4">
                <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">
                    <p className="font-bold">Could not load Monster Lab data. The server may be experiencing issues.</p>
                </div>
            </div>
        );
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
                        {(data?.allMonsters && data.allMonsters.length > 0) ? (
                            data.allMonsters.map((monster) => (
                                <div key={`avail-${monster.id}`} className="flex flex-col items-center gap-3 w-full max-w-sm">
                                    <MonsterCard monster={monster} size="medium" isToggleable={true} />
                                    <Button disabled className="shadow-lg w-full max-w-xs touch-manipulation min-h-[48px]">
                                        {`Buy for ${monster.goldCost || 0}g`}
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
                        {data?.userMonsters && data.userMonsters.length > 0 ? (
                            data.userMonsters.map((userMonster) => (
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