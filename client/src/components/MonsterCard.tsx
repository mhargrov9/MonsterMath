import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Eye, Flame, Snowflake, Brain, Sword, Mountain, Sparkles, Target } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---
// Simplified for this component's needs
interface Monster {
  id: number;
  name: string;
  type: string;
  basePower: number;
  baseSpeed: number;
  baseDefense: number;
  baseHp?: number;
  baseMp?: number;
  description?: string;
  resistances?: string[];
  weaknesses?: string[];
  level?: number; 
}

interface UserMonster {
  id: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  isShattered?: boolean;
}

interface Ability {
    id: number;
    name: string;
    description: string;
    affinity: string;
    ability_type: string;
    mp_cost: number;
}

interface MonsterCardProps {
  monster: Monster;
  userMonster?: UserMonster;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  battleMode?: boolean;
  isPlayerTurn?: boolean;
  battleMp?: number;
  battleHp?: number;
  onAbilityClick?: (ability: any) => void;
  showAbilities?: boolean;
}


// --- HELPER FUNCTIONS ---

// NEW: This function reliably gets an icon based on the ability's AFFINITY
const getAffinityIcon = (affinity: string) => {
  if (!affinity) return <Sword className="w-4 h-4 text-gray-400" />; 

  switch (affinity.toLowerCase()) {
    case 'fire': return <Flame className="w-4 h-4 text-red-500" />;
    case 'water': return <Droplets className="w-4 h-4 text-blue-500" />;
    case 'earth': return <Mountain className="w-4 h-4 text-amber-600" />;
    case 'air': return <Sparkles className="w-4 h-4 text-cyan-400" />;
    case 'electric': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'psychic': return <Brain className="w-4 h-4 text-purple-500" />;
    case 'physical': return <Sword className="w-4 h-4 text-gray-400" />;
    case 'ice': return <Snowflake className="w-4 h-4 text-blue-300" />;
    default: return <div className="w-4 h-4 bg-gray-500 rounded-sm" />;
  }
};


// --- MAIN COMPONENT ---

export default function MonsterCard({
  monster,
  userMonster,
  size = 'medium',
  battleMode = false,
  isPlayerTurn = false,
  battleMp,
  battleHp,
  onAbilityClick,
  showAbilities = true
}: MonsterCardProps) {

  const { toast } = useToast();

  // Fetch abilities for this monster
  const { data: abilities = [], isLoading: abilitiesLoading } = useQuery<Ability[]>({
    queryKey: [`/api/monster-abilities/${monster.id}`],
    enabled: !!monster.id, // Only run query if monster.id exists
  });

  const level = battleMode ? monster.level : userMonster?.level;
  const currentHp = battleMode ? battleHp : userMonster?.hp;
  const maxHp = userMonster?.maxHp || monster.baseHp;
  const displayMp = battleMode ? battleMp : userMonster?.mp;
  const maxMp = userMonster?.maxMp || monster.baseMp;

  const cardSizeClasses = {
    tiny: 'w-32',
    small: 'w-48',
    medium: 'w-72',
    large: 'w-80'
  };

  return (
    <Card className={`border-4 bg-gray-800/50 border-gray-700 text-white ${cardSizeClasses[size]}`}>
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold truncate">{monster.name}</h2>
          <Badge variant="secondary">LV. {level}</Badge>
        </div>

        {/* Image */}
        <div className="bg-gray-900/50 rounded h-32 flex items-center justify-center">
            <VeoMonster monsterId={monster.id} level={level} size={size === 'tiny' ? 'tiny' : 'small'} />
        </div>

        {/* HP and MP Bars */}
        <div className="space-y-1">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(currentHp / maxHp) * 100}%` }}></div>
            </div>
            <div className="text-xs text-right">HP: {currentHp} / {maxHp}</div>

            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(displayMp / maxMp) * 100}%` }}></div>
            </div>
            <div className="text-xs text-right">MP: {displayMp} / {maxMp}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div className="bg-gray-700/50 rounded p-1"><Zap className="w-3 h-3 mx-auto text-red-400"/> {userMonster?.power || monster.basePower}</div>
            <div className="bg-gray-700/50 rounded p-1"><Shield className="w-3 h-3 mx-auto text-blue-400"/> {userMonster?.defense || monster.baseDefense}</div>
            <div className="bg-gray-700/50 rounded p-1"><Gauge className="w-3 h-3 mx-auto text-green-400"/> {userMonster?.speed || monster.baseSpeed}</div>
        </div>

        {/* Abilities */}
        {showAbilities && (
          <div className="bg-gray-900/50 p-2 rounded space-y-2">
            <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
            {abilitiesLoading ? <p className="text-xs text-gray-400">Loading...</p> : 
             abilities.map(ability => {
                const canAfford = battleMode && isPlayerTurn && (displayMp >= ability.mp_cost);
                const isClickable = battleMode && isPlayerTurn && ability.ability_type === 'ACTIVE';

                return (
                    <div 
                        key={ability.id} 
                        className={`p-1 rounded text-xs transition-all ${isClickable && canAfford ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer' : isClickable && !canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                            if (isClickable && canAfford && onAbilityClick) {
                                onAbilityClick(ability);
                            }
                        }}
                    >
                        <div className="flex items-center gap-2 font-bold">
                            {getAffinityIcon(ability.affinity)}
                            <span>{ability.name}</span>
                            <span className="ml-auto text-blue-400">{ability.mp_cost > 0 ? `${ability.mp_cost} MP` : ''}</span>
                        </div>
                        <p className="text-gray-400 text-[10px] leading-tight pl-6">{ability.description}</p>
                    </div>
                );
             })
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}