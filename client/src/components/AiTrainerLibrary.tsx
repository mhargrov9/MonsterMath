import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MonsterCard from './MonsterCard';
import { apiRequest } from '@/lib/queryClient';
import { Monster, AiTrainer } from '@/types/game';

const AiTrainerLibrary: React.FC = () => {
  const { data: trainers, isLoading, isError } = useQuery<AiTrainer[]>({
    queryKey: ['/api/ai-teams'],
    queryFn: () => apiRequest('/api/ai-teams', { method: 'GET' }).then(res => res.json()),
  });

  const { data: allMonsters } = useQuery<Monster[]>({
    queryKey: ['/api/monsters'],
    queryFn: () => apiRequest('/api/monsters', { method: 'GET' }).then(res => res.json()),
    enabled: !!trainers,
  });

  const getMonsterById = (id: number): Monster | undefined => {
    return allMonsters?.find(m => m.id === id);
  };

  if (isLoading) return <div>Loading AI Trainers...</div>;
  if (isError || !trainers) return <div>Error loading AI Trainers.</div>;

  return (
    <div className="space-y-6">
      <CardHeader>
        <CardTitle>AI Trainer Library</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {trainers.map((trainer) => (
          <Card key={trainer.id} className="bg-white/10 border-white/20 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{trainer.name}</h3>
                  <Badge variant="secondary" className="mt-1">{trainer.archetype}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm">TPL Range</p>
                  <p className="font-bold">{trainer.minTPL} - {trainer.maxTPL}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/80">{trainer.description}</p>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Team Composition:</h4>
                <div className="flex gap-4">
                  {trainer.composition.map((comp, index) => {
                    const monster = getMonsterById(comp.monsterId);
                    if (!monster) return null;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <MonsterCard monster={{...monster, level: comp.level}} size="tiny" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AiTrainerLibrary;