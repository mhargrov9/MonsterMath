import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Flame, Brain, Sword, Mountain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

// --- Self-Contained, Correct Type Definitions ---
// These types accurately reflect the data structures and are defined locally
// to avoid conflicts with incorrect shared types.

interface Ability {
  id: number;
  name: string;
  description: string;
  ability_type: 'ACTIVE' | 'PASSIVE';
  mp_cost: number | null;
  affinity?: string | null;
}

interface BaseMonster {
  id: number | string;
  name: string;
  abilities?: Ability[];
  basePower?: number | null;
  baseDefense?: number | null;
  baseSpeed?: number | null;
  // These are on the AI Monster object at runtime
  hp?: number | null;
  maxHp?: number | null;
  mp?: number | null;
  maxMp?: number | null;
  goldCost?: number | null;
}

interface BaseUserMonster {
  id: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  hp: number | null;
  maxHp: number | null;
  mp: number | null;
  maxMp: number | null;
}

// This is the decorated UserMonster type that includes the nested base monster data
type UserMonsterWithDetails = BaseUserMonster & { monster: BaseMonster };

interface MonsterCardProps {
  monster: BaseMonster;
  userMonster?: UserMonsterWithDetails | BaseUserMonster;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  isPlayerTurn?: boolean;
  onAbilityClick?: (ability: Ability) => void;
  isToggleable?: boolean;
  onCardClick?: () => void;
  isTargetable?: boolean;
}

const getAffinityIcon = (affinity: string | null | undefined) => {
  if (!affinity) return <Sword className="w-3 h-3 mr-1" />;
  switch (affinity.toLowerCase()) {
    case 'fire': return <Flame className="w-3 h-3 mr-1 text-red-400" />;
    case 'water': return <Droplets className="w-3 h-3 mr-1 text-blue-400" />;
    case 'earth': return <Mountain className="w-3 h-3 mr-1 text-amber-500" />;
    case 'air': return <Sparkles className="w-3 h-3 mr-1 text-cyan-300" />;
    case 'electric': return <Zap className="w-3 h-3 mr-1 text-yellow-300" />;
    case 'psychic': return <Brain className="w-3 h-3 mr-1 text-purple-400" />;
    case 'physical': default: return <Sword className="w-3 h-3 mr-1 text-gray-300" />;
  }
};

export default function MonsterCard({
  monster: monsterProp,
  userMonster,
  size = 'medium',
  isPlayerTurn = false,
  onAbilityClick,
  isToggleable = true,
  onCardClick,
  isTargetable = false,
}: MonsterCardProps) {
  const [isExpanded, setIsExpanded] = useState(size === 'large');

  useEffect(() => {
    setIsExpanded(size === 'large');
  }, [size]);

  const baseMonster = monsterProp;
  const abilities = baseMonster.abilities || [];

  const level = userMonster?.level ?? 1;
  const power = userMonster?.power ?? baseMonster.basePower ?? 0;
  const defense = userMonster?.defense ?? baseMonster.baseDefense ?? 0;
  const speed = userMonster?.speed ?? baseMonster.baseSpeed ?? 0;

  const currentHp = userMonster?.hp ?? baseMonster.hp ?? 0;
  const maxHp = userMonster?.maxHp ?? baseMonster.maxHp ?? 1;
  const displayMp = userMonster?.mp ?? baseMonster.mp ?? 0;
  const maxMp = userMonster?.maxMp ?? baseMonster.maxMp ?? 1;

  const hpPercentage = maxHp > 0 ? ((currentHp ?? 0) / maxHp) * 100 : 0;
  const mpPercentage = maxMp > 0 ? ((displayMp ?? 0) / maxMp) * 100 : 0;

  const cardSizeClasses = { tiny: 'w-32', small: 'w-48', medium: 'w-72', large: 'w-80' };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCardClick) { onCardClick(); return; }
    if (isToggleable) { setIsExpanded(!isExpanded); }
  };

  const borderColorClass = isTargetable ? 'border-green-500 animate-pulse' : (onCardClick ? 'hover:border-green-500' : isToggleable ? 'hover:border-yellow-400' : 'border-cyan-500');
  const cursorClass = onCardClick || isToggleable ? 'cursor-pointer' : '';

  return (
    <Card onClick={handleCardClick} className={`border-4 bg-gray-800/50 text-white shadow-lg transition-colors ${cardSizeClasses[size]} ${borderColorClass} ${cursorClass}`}>
      <CardContent className="p-2 flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold truncate">{baseMonster.name}</h2>
          <Badge variant="secondary">LV. {level}</Badge>
        </div>
        <div className="bg-gray-900/50 rounded h-32 flex items-center justify-center overflow-hidden">
            <VeoMonster monsterId={baseMonster.id as number} level={level} size={size === 'tiny' ? 'tiny' : 'small'} />
        </div>
        <div className="space-y-1">
            <div className="bg-gray-700 rounded-full h-2.5">
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${hpPercentage}%` }}></div>
            </div>
            <div className="text-xs text-right">HP: {(currentHp ?? 0)} / {maxHp}</div>
            <div className="bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${mpPercentage}%` }}></div>
            </div>
            <div className="text-xs text-right">MP: {(displayMp ?? 0)} / {maxMp}</div>
        </div>
        {size !== 'tiny' &&
            <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-gray-700/50 rounded p-1"><Zap className="w-3 h-3 mx-auto text-red-400"/> {power}</div>
                <div className="bg-gray-700/50 rounded p-1"><Shield className="w-3 h-3 mx-auto text-blue-400"/> {defense}</div>
                <div className="bg-gray-700/50 rounded p-1"><Gauge className="w-3 h-3 mx-auto text-green-400"/> {speed}</div>
            </div>
        }
        {isExpanded && (
          <div className="mt-2 space-y-3">
            <div className="bg-gray-900/60 p-2 rounded space-y-2 min-h-[100px]">
                <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
                {abilities.length === 0 ? <p className="text-xs text-gray-400 italic">No abilities to display.</p> : 
                  abilities.map(ability => {
                    const canAfford = (displayMp ?? 0) >= (ability.mp_cost || 0);
                    const isClickable = onAbilityClick && ability.ability_type === 'ACTIVE' && isPlayerTurn;
                    const effectiveClass = isClickable && canAfford ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer' : onAbilityClick ? 'opacity-50 cursor-not-allowed' : '';
                    return (
                        <div key={ability.id} className={`p-1 rounded text-xs transition-all ${effectiveClass}`}
                            onClick={(e) => {
                                if (isClickable && canAfford && onAbilityClick) {
                                    e.stopPropagation();
                                    onAbilityClick(ability);
                                }
                            }}>
                            <div className="flex items-center gap-2 font-bold">
                                {getAffinityIcon(ability.affinity)}
                                <span>{ability.name}</span>
                                <span className="ml-auto text-blue-400">{ability.mp_cost && ability.mp_cost > 0 ? `${ability.mp_cost} MP` : ''}</span>
                            </div>
                            <p className="text-gray-400 text-[10px] leading-tight pl-6">{ability.description}</p>
                        </div>
                    );
                  })
                }
            </div>
          </div>
        )}
        {isToggleable && (
          <div className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center" onClick={(e) => {e.stopPropagation(); setIsExpanded(!isExpanded);}}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="ml-1">{isExpanded ? 'Collapse' : 'Details'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}