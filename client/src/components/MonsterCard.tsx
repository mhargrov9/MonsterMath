import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Flame, Brain, Sword, Mountain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface Ability {
  id: number;
  name: string;
  description: string;
  ability_type: 'ACTIVE' | 'PASSIVE';
  mp_cost: number;
  affinity: string;
  power_multiplier?: number;
  scaling_stat?: string;
  healing_power?: number;
  target_scope?: string;
}

interface Monster {
  id: number | string;
  name: string;
  type?: string;
  description?: string;
  level?: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  resistances?: string[];
  weaknesses?: string[];
  basePower?: number;
  baseSpeed?: number;
  baseDefense?: number;
  abilities?: Ability[];
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
  monster: Monster;
  userMonster?: UserMonster;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  isPlayerTurn?: boolean;
  onAbilityClick?: (ability: Ability) => void;
  startExpanded?: boolean;
  isToggleable?: boolean;
  onCardClick?: () => void;
  isTargetable?: boolean;
}

const getAffinityIcon = (affinity: string | undefined) => {
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
  startExpanded = false,
  isToggleable = true,
  onCardClick,
  isTargetable = false,
}: MonsterCardProps) {

  const [isExpanded, setIsExpanded] = useState(startExpanded);

  useEffect(() => {
    if (startExpanded) {
        setIsExpanded(true);
    }
  }, [startExpanded]);

  const baseMonster = userMonster ? userMonster.monster : monsterProp;
  const abilities = baseMonster.abilities || [];

  const level = userMonster?.level ?? baseMonster.level ?? 1;
  const power = userMonster?.power ?? baseMonster.basePower ?? 0;
  const defense = userMonster?.defense ?? baseMonster.baseDefense ?? 0;
  const speed = userMonster?.speed ?? baseMonster.baseSpeed ?? 0;

  const currentHp = userMonster?.hp ?? monsterProp.hp;
  const maxHp = userMonster?.maxHp ?? monsterProp.maxHp ?? 1;
  const displayMp = userMonster?.mp ?? monsterProp.mp;
  const maxMp = userMonster?.maxMp ?? monsterProp.maxMp ?? 1;

  const cardSizeClasses = { tiny: 'w-32', small: 'w-48', medium: 'w-72', large: 'w-80' };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCardClick) {
        onCardClick();
        return;
    }
    if (isToggleable) { 
        setIsExpanded(!isExpanded); 
    }
  };

  const borderColorClass = isTargetable ? 'border-green-500 animate-pulse' : (onCardClick ? 'hover:border-green-500' : isToggleable ? 'hover:border-yellow-400' : 'border-cyan-500');
  const cursorClass = onCardClick || isToggleable ? 'cursor-pointer' : '';

  return (
    <Card
      onClick={handleCardClick}
      className={`border-4 bg-gray-800/50 text-white shadow-lg transition-colors ${cardSizeClasses[size]} ${borderColorClass} ${cursorClass}`}
    >
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
                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(currentHp / maxHp) * 100}%` }}></div>
            </div>
            <div className="text-xs text-right">HP: {currentHp} / {maxHp}</div>
            <div className="bg-gray-700 rounded-full h-2.5">
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
        {isExpanded && (
          <div className="mt-2 space-y-3">
            {baseMonster.description && size !== 'tiny' && (
              <div className="bg-gray-900/60 p-2 rounded">
                <p className="text-xs italic text-gray-400">{baseMonster.description}</p>
              </div>
            )}
            {(baseMonster.resistances?.length || baseMonster.weaknesses?.length) && size !== 'tiny' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <h5 className="font-bold text-green-400">Resists</h5>
                  {baseMonster.resistances && baseMonster.resistances.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">{baseMonster.resistances.map(res => (<Badge key={res} variant="secondary" className="capitalize bg-green-900/80 text-green-300 border-green-700/80">{getAffinityIcon(res)} {res}</Badge>))}</div>
                  ) : <p className="text-gray-500 italic text-[11px]">None</p> }
                </div>
                <div>
                  <h5 className="font-bold text-red-400">Weak to</h5>
                  {baseMonster.weaknesses && baseMonster.weaknesses.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">{baseMonster.weaknesses.map(weak => (<Badge key={weak} variant="destructive" className="capitalize bg-red-900/80 text-red-300 border-red-700/80">{getAffinityIcon(weak)} {weak}</Badge>))}</div>
                  ) : <p className="text-gray-500 italic text-[11px]">None</p> }
                </div>
              </div>
            )}
            <div className="bg-gray-900/60 p-2 rounded space-y-2 min-h-[100px]">
                <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
                {abilities.length === 0 ? <p className="text-xs text-gray-400 italic">No abilities to display.</p> : 
                  abilities.map(ability => {
                    const canAfford = displayMp >= (ability.mp_cost || 0);
                    const isClickable = onAbilityClick && ability.ability_type === 'ACTIVE' && isPlayerTurn;
                    const effectiveClass = isClickable && canAfford ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer' : onAbilityClick ? 'opacity-50 cursor-not-allowed' : '';

                    return (
                        <div
                            key={ability.id}
                            className={`p-1 rounded text-xs transition-all ${effectiveClass}`}
                            onClick={(e) => {
                                if (isClickable && canAfford && onAbilityClick) {
                                    e.stopPropagation();
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