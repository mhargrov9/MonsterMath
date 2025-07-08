import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import {
  Zap,
  Shield,
  Gauge,
  Droplets,
  Flame,
  Brain,
  Sword,
  Mountain,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BattleMonster, Monster, Ability } from '@shared/types';

interface MonsterCardProps {
  monster: Monster;
  userMonster?: BattleMonster; // Use the more specific BattleMonster type
  size?: 'tiny' | 'small' | 'medium' | 'large';
  isPlayerTurn?: boolean;
  onAbilityClick?: (ability: Ability) => void;
  onForfeitTurn?: () => void;
  startExpanded?: boolean;
  isToggleable?: boolean;
  onCardClick?: () => void;
  isTargeting?: boolean;
  isValidTarget?: boolean;
  onTargetClick?: (targetId: number) => void;
  isBenchedFainted?: boolean; // <-- ADDED: For visual styling of fainted benched monsters
}

const getAffinityIcon = (affinity: string | null) => {
  if (!affinity) return <Sword className="w-3 h-3 mr-1" />;
  switch (affinity.toLowerCase()) {
    case 'fire':
      return <Flame className="w-3 h-3 mr-1 text-red-400" />;
    case 'water':
      return <Droplets className="w-3 h-3 mr-1 text-blue-400" />;
    case 'earth':
      return <Mountain className="w-3 h-3 mr-1 text-amber-500" />;
    case 'air':
      return <Sparkles className="w-3 h-3 mr-1 text-cyan-300" />;
    case 'electric':
      return <Zap className="w-3 h-3 mr-1 text-yellow-300" />;
    case 'psychic':
      return <Brain className="w-3 h-3 mr-1 text-purple-400" />;
    case 'physical':
    default:
      return <Sword className="w-3 h-3 mr-1 text-gray-300" />;
  }
};

export default function MonsterCard({
  monster,
  userMonster,
  size = 'medium',
  isPlayerTurn = false,
  onAbilityClick,
  onForfeitTurn,
  startExpanded = false,
  isToggleable = true,
  onCardClick,
  isTargeting = false,
  isValidTarget = false,
  onTargetClick,
  isBenchedFainted = false, // <-- ADDED
}: MonsterCardProps) {
  const [isExpanded, setIsExpanded] = useState(startExpanded);

  useEffect(() => {
    setIsExpanded(startExpanded);
  }, [startExpanded]);

  const abilities = monster.abilities || [];
  const level = userMonster?.level ?? 1;
  const power = userMonster?.power ?? monster.basePower ?? 0;
  const defense = userMonster?.defense ?? monster.baseDefense ?? 0;
  const speed = userMonster?.speed ?? monster.baseSpeed ?? 0;
  const currentHp = userMonster?.battleHp ?? 0;
  const maxHp = userMonster?.battleMaxHp ?? 1;
  const displayMp = userMonster?.battleMp ?? 0;
  const maxMp = userMonster?.battleMaxMp ?? 1;

  const cardSizeClasses = {
    tiny: 'w-32',
    small: 'w-48',
    medium: 'w-72',
    large: 'w-80',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isTargeting && isValidTarget && onTargetClick && userMonster) {
      e.stopPropagation();
      onTargetClick(userMonster.id);
      return;
    }

    if (onCardClick) {
      e.stopPropagation();
      onCardClick();
      return;
    }

    if (isToggleable) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  const borderColorClass =
    isTargeting && isValidTarget
      ? 'border-green-400 hover:border-green-300 ring-2 ring-green-400/50'
      : onCardClick
        ? 'hover:border-green-500'
        : isToggleable
          ? 'hover:border-yellow-400'
          : 'border-cyan-500';

  const cursorClass = onCardClick || isToggleable || (isTargeting && isValidTarget) ? 'cursor-pointer' : '';
  const faintedClass = isBenchedFainted ? 'grayscale opacity-60' : '';

  return (
    <Card
      onClick={handleCardClick}
      className={`border-4 bg-gray-800/50 text-white shadow-lg transition-all ${cardSizeClasses[size]} ${borderColorClass} ${cursorClass} ${faintedClass}`}
    >
      <CardContent className="p-2 space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold truncate">{monster.name}</h2>
          <Badge variant="secondary">LV. {level}</Badge>
        </div>
        <div className="bg-gray-900/50 rounded h-32 flex items-center justify-center overflow-hidden">
          <VeoMonster monsterId={monster.id} level={level} size={size === 'tiny' ? 'tiny' : 'small'} />
        </div>
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(currentHp / maxHp) * 100}%` }} />
          </div>
          <div className="text-xs text-right">HP: {currentHp} / {maxHp}</div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${(displayMp / maxMp) * 100}%` }} />
          </div>
          <div className="text-xs text-right">MP: {displayMp} / {maxMp}</div>
        </div>
        {size !== 'tiny' && (
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div className="bg-gray-700/50 rounded p-1"><Zap className="w-3 h-3 mx-auto text-red-400" /> {power}</div>
            <div className="bg-gray-700/50 rounded p-1"><Shield className="w-3 h-3 mx-auto text-blue-400" /> {defense}</div>
            <div className="bg-gray-700/50 rounded p-1"><Gauge className="w-3 h-3 mx-auto text-green-400" /> {speed}</div>
          </div>
        )}
        {isExpanded && (
          <div className="mt-2 space-y-3">
            {monster.description && size !== 'tiny' && (
              <div className="bg-gray-900/60 p-2 rounded">
                <p className="text-xs italic text-gray-400">{monster.description}</p>
              </div>
            )}
            <div className="bg-gray-900/60 p-2 rounded space-y-2 min-h-[100px]">
              <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
              {abilities.map((ability) => {
                const canAfford = displayMp >= (ability.mp_cost || 0);
                const isClickable = onAbilityClick && ability.ability_type === 'ACTIVE' && isPlayerTurn;
                const effectiveClass = isClickable && canAfford
                    ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer'
                    : onAbilityClick
                      ? 'opacity-50 cursor-not-allowed'
                      : '';
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
                      <span className="ml-auto text-blue-400">{ability.mp_cost && ability.mp_cost > 0 ? `${ability.mp_cost} MP` : ''}</span>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-tight pl-6">{ability.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isToggleable && (
          <div className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="ml-1">{isExpanded ? 'Collapse' : 'Details'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}