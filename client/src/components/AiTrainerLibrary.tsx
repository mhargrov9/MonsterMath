import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Crown, Swords, Shield, Heart, Zap, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AiTrainer {
  id: number;
  name: string;
  description: string;
  composition: Array<{ monsterId: number; baseLevel: number }>;
  archetype: string;
  minTPL: number;
  maxTPL: number;
}

interface AiTrainerLibraryProps {
  onSelectTrainer?: (trainer: AiTrainer) => void;
  playerTPL: number;
}

const getArchetypeIcon = (archetype: string) => {
  switch (archetype.toLowerCase()) {
    case 'tank': return <Shield className="w-4 h-4" />;
    case 'swarm': return <Users className="w-4 h-4" />;
    case 'control': return <Zap className="w-4 h-4" />;
    case 'aggro': return <Swords className="w-4 h-4" />;
    case 'support': return <Heart className="w-4 h-4" />;
    case 'balanced': return <Target className="w-4 h-4" />;
    default: return <Crown className="w-4 h-4" />;
  }
};

const getArchetypeColor = (archetype: string) => {
  switch (archetype.toLowerCase()) {
    case 'tank': return 'bg-blue-500';
    case 'swarm': return 'bg-red-500';
    case 'control': return 'bg-purple-500';
    case 'aggro': return 'bg-orange-500';
    case 'support': return 'bg-green-500';
    case 'balanced': return 'bg-gray-500';
    default: return 'bg-yellow-500';
  }
};

const getMonsterName = (monsterId: number) => {
  const monsters = {
    8: 'Geode Tortoise',
    9: 'Gale-Feather Griffin',
    10: 'Cinder-Tail Salamander',
    11: 'River-Spirit Axolotl',
    12: 'Spark-Tail Squirrel'
  };
  return monsters[monsterId as keyof typeof monsters] || 'Unknown Monster';
};

export default function AiTrainerLibrary({ onSelectTrainer, playerTPL }: AiTrainerLibraryProps) {
  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ['/api/ai-trainers'],
    retry: false
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            AI Trainer Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading trainers...</p>
        </CardContent>
      </Card>
    );
  }

  // Filter trainers that match player's TPL range
  const availableTrainers = trainers.filter((trainer: AiTrainer) => 
    playerTPL >= trainer.minTPL && playerTPL <= trainer.maxTPL
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          AI Trainer Library
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your Team Power Level: {playerTPL} | Available Opponents: {availableTrainers.length}
        </p>
      </CardHeader>
      <CardContent>
        {availableTrainers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No trainers available for your current Team Power Level.
              Try adjusting your team composition.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTrainers.map((trainer: AiTrainer) => (
              <Card key={trainer.id} className="border-2 hover:border-blue-400 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{trainer.name}</CardTitle>
                    <Badge className={`${getArchetypeColor(trainer.archetype)} text-white`}>
                      <span className="flex items-center gap-1">
                        {getArchetypeIcon(trainer.archetype)}
                        {trainer.archetype.toUpperCase()}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trainer.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Team Composition:</h4>
                    {trainer.composition.map((member, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{getMonsterName(member.monsterId)}</span>
                        <Badge variant="outline">Lv. {member.baseLevel}</Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>TPL Range:</span>
                    <span className="font-mono">{trainer.minTPL} - {trainer.maxTPL}</span>
                  </div>

                  <Button 
                    onClick={() => onSelectTrainer?.(trainer)}
                    className="w-full"
                    size="sm"
                  >
                    Challenge Trainer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}