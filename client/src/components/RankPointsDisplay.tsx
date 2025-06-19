import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Award } from 'lucide-react';

interface RankPointsDisplayProps {
  rankPoints: number;
  className?: string;
}

const getRankTier = (rp: number) => {
  if (rp >= 1000) return { name: 'Legendary Master', color: 'bg-gradient-to-r from-yellow-400 to-orange-500', icon: Trophy };
  if (rp >= 750) return { name: 'Elite Champion', color: 'bg-gradient-to-r from-purple-400 to-pink-500', icon: Award };
  if (rp >= 500) return { name: 'Skilled Veteran', color: 'bg-gradient-to-r from-blue-400 to-cyan-500', icon: TrendingUp };
  if (rp >= 250) return { name: 'Rising Contender', color: 'bg-gradient-to-r from-green-400 to-blue-500', icon: TrendingUp };
  if (rp >= 100) return { name: 'Proven Fighter', color: 'bg-gradient-to-r from-gray-400 to-gray-600', icon: TrendingUp };
  return { name: 'Rookie Trainer', color: 'bg-gradient-to-r from-gray-300 to-gray-400', icon: TrendingDown };
};

const getNextRankProgress = (rp: number) => {
  const thresholds = [0, 100, 250, 500, 750, 1000];
  const currentTierIndex = thresholds.findIndex((threshold, index) => 
    rp >= threshold && (index === thresholds.length - 1 || rp < thresholds[index + 1])
  );
  
  if (currentTierIndex === thresholds.length - 1) {
    return { progress: 100, nextThreshold: null, pointsToNext: 0 };
  }
  
  const currentThreshold = thresholds[currentTierIndex];
  const nextThreshold = thresholds[currentTierIndex + 1];
  const progress = ((rp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  const pointsToNext = nextThreshold - rp;
  
  return { progress, nextThreshold, pointsToNext };
};

export default function RankPointsDisplay({ rankPoints, className = "" }: RankPointsDisplayProps) {
  const tier = getRankTier(rankPoints);
  const { progress, nextThreshold, pointsToNext } = getNextRankProgress(rankPoints);
  const IconComponent = tier.icon;

  return (
    <Card className={`border-2 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconComponent className="w-5 h-5" />
          Battle Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Badge className={`${tier.color} text-white text-lg px-4 py-2`}>
            {tier.name}
          </Badge>
          <div className="mt-2">
            <span className="text-3xl font-bold">{rankPoints}</span>
            <span className="text-lg text-gray-600 dark:text-gray-400 ml-1">RP</span>
          </div>
        </div>

        {nextThreshold && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to next rank</span>
              <span>{pointsToNext} RP needed</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Win:</span>
            <span className="text-green-600">+20 RP</span>
          </div>
          <div className="flex justify-between">
            <span>Loss:</span>
            <span className="text-red-600">-10 RP</span>
          </div>
          <div className="flex justify-between">
            <span>Beat stronger opponent:</span>
            <span className="text-blue-600">+5 RP bonus</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}