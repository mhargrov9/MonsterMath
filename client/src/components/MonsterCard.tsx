import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Flame, Brain, Sword, Mountain, Sparkles, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// --- TYPE DEFINITIONS ---
interface Ability {
    id: number;
    name: string;
    description: string;
    affinity: string;
    ability_type: string;
    mp_cost: number;
}

interface Monster {
  id: number;
  name: string;
  type: string;
  level?: number;
  power?: number;
  speed?: number;
  defense?: number;
  hp?: number;
  max_hp?: number;
  mp?: number;
  max_mp?: number;
  resistances?: string[];
  weaknesses?: string[];
  basePower?: number;
  baseSpeed?: number;
  baseDefense?: number;
  baseHp?: number;
  baseMp?: number;
}

interface UserMonster {
  id: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  monster: Monster;
}

interface MonsterCardProps {
  monster: Monster | UserMonster;
  userMonster?: UserMonster;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  battleMode?: boolean;
  isPlayerTurn?: boolean;
  onAbilityClick?: (ability: Ability) => void;
  showAbilities?: boolean;
}

// --- HELPER FUNCTION ---
const getAffinityIcon = (affinity: string) => {
  if (!affinity) return <Sword className="w-4 h-4 text-gray-400" />;
  switch (affinity.toLowerCase()) {
    case 'fire': return <Flame className="w-4 h-4 text-red-500" />;
    case 'water': return <Droplets className="w-4 h-4 text-blue-500" />;
    case 'earth': return <Mountain className="w-4 h-4 text-amber-600" />;
    case 'air': return <Sparkles className="w-4 h-4 text-cyan-400" />;
    case 'electric': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'psychic': return <Brain className="w-4 h-4 text-purple-500" />;
    case 'physical': default: return <Sword className="w-4 h-4 text-gray-400" />;
  }
};

// --- MAIN COMPONENT ---
export default function MonsterCard({
  monster: monsterProp,
  userMonster,
  size = 'medium',
  battleMode = false,
  isPlayerTurn = false,
  onAbilityClick,
  showAbilities = true
}: MonsterCardProps) {

  // State for the expand/collapse feature
  const [isExpanded, setIsExpanded] = useState(false);

  const baseMonster = 'monster' in monsterProp ? monsterProp.monster : monsterProp;

  const { data: abilities = [], isLoading: abilitiesLoading } = useQuery<Ability[]>({
    queryKey: [`/api/monster-abilities/${baseMonster.id}`],
    enabled: !!baseMonster.id,
  });

  const level = userMonster?.level ?? baseMonster.level ?? 1;
  const power = userMonster?.power ?? baseMonster.power ?? baseMonster.basePower ?? 0;
  const defense = userMonster?.defense ?? baseMonster.defense ?? baseMonster.baseDefense ?? 0;
  const speed = userMonster?.speed ?? baseMonster.speed ?? baseMonster.baseSpeed ?? 0;

  const currentHp = userMonster?.hp ?? baseMonster.hp ?? baseMonster.baseHp ?? 0;
  const maxHp = userMonster?.maxHp ?? baseMonster.max_hp ?? baseMonster.baseHp ?? 1;
  const displayMp = userMonster?.mp ?? baseMonster.mp ?? baseMonster.baseMp ?? 0;
  const maxMp = userMonster?.maxMp ?? baseMonster.max_mp ?? baseMonster.baseMp ?? 1;

  const cardSizeClasses = {
    tiny: 'w-32',
    small: 'w-48',
    medium: 'w-72',
    large: 'w-80'
  };

  const handleCardClick = () => {
    // Only allow expanding/collapsing outside of battle mode
    if (!battleMode) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card 
      onClick={handleCardClick}
      className={`border-4 bg-gray-800/50 border-gray-700 text-white ${cardSizeClasses[size]} ${!battleMode && 'cursor-pointer hover:border-yellow-400 transition-colors'}`}
    >
      <CardContent className="p-2 space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold truncate">{baseMonster.name}</h2>
          <Badge variant="secondary">LV. {level}</Badge>
        </div>

        <div className="bg-gray-900/50 rounded h-32 flex items-center justify-center overflow-hidden">
            <VeoMonster monsterId={baseMonster.id} level={level} size={size === 'tiny' ? 'tiny' : 'small'} />
        </div>

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

        {size !== 'tiny' &&
            <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-gray-700/50 rounded p-1"><Zap className="w-3 h-3 mx-auto text-red-400"/> {power}</div>
                <div className="bg-gray-700/50 rounded p-1"><Shield className="w-3 h-3 mx-auto text-blue-400"/> {defense}</div>
                <div className="bg-gray-700/50 rounded p-1"><Gauge className="w-3 h-3 mx-auto text-green-400"/> {speed}</div>
            </div>
        }

        {/* --- ABILITIES ARE NOW CONDITIONALLY RENDERED --- */}
        {showAbilities && isExpanded && (
          <div className="bg-gray-900/50 p-2 rounded space-y-2 min-h-[100px]">
            <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
            {abilitiesLoading ? <p className="text-xs text-gray-400">Loading...</p> : 
             abilities.map(ability => {
                const canAfford = battleMode && isPlayerTurn && (displayMp >= ability.mp_cost);
                const isClickable = battleMode && isPlayerTurn && ability.ability_type === 'ACTIVE';
                return (
                    <div 
                        key={ability.id} 
                        className={`p-1 rounded text-xs transition-all ${isClickable && canAfford ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer' : isClickable && !canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={(e) => { 
                            if (isClickable && canAfford && onAbilityClick) {
                                e.stopPropagation(); // Prevent card from collapsing when clicking an ability
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

        {size === 'tiny' && (
            <div className="text-center mt-1">
                <Badge variant={currentHp > 0 ? "secondary" : "destructive"}>{currentHp > 0 ? 'Ready' : 'Fainted'}</Badge>
            </div>
        )}

        {/* --- UI CUE FOR EXPANDABLE CARDS --- */}
        {!battleMode && (
          <div className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{isExpanded ? 'Collapse' : 'Details'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}