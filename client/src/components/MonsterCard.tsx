// client/src/components/MonsterCard.tsx

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
import { UserMonster, Monster, Ability } from '@shared/types';

interface MonsterCardProps {
  monster: Monster;
  userMonster?: UserMonster;
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
  isFainted?: boolean;
}

const getAffinityIcon = (affinity: string) => {
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
  monster: monsterProp,
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
  isFainted = false,
}: MonsterCardProps) {
  const [isExpanded, setIsExpanded] = useState(startExpanded);

  useEffect(() => {
    setIsExpanded(startExpanded);
  }, [startExpanded]);

  const baseMonster = 'monster' in monsterProp ? monsterProp.monster : monsterProp;
  const abilities = baseMonster.abilities || [];

  const faintedFromProps = userMonster?.isFainted || isFainted;

  const level = userMonster?.level ?? baseMonster.level ?? 1;
  const power = userMonster?.power ?? baseMonster.basePower ?? 0;
  const defense = userMonster?.defense ?? baseMonster.baseDefense ?? 0;
  const speed = userMonster?.speed ?? baseMonster.baseSpeed ?? 0;
  const currentHp = faintedFromProps ? 0 : (userMonster?.battleHp ?? userMonster?.hp ?? 0);
  const maxHp = userMonster?.battleMaxHp ?? userMonster?.maxHp ?? 1;
  const displayMp = userMonster?.battleMp ?? userMonster?.mp ?? 0;
  const maxMp = userMonster?.maxMp ?? 1;

  const cardSizeClasses = {
    tiny: 'w-32',
    small: 'w-48',
    medium: 'w-72',
    large: 'w-80',
  };

  const faintedClasses = faintedFromProps ? 'filter grayscale opacity-60' : '';

  const handleCardClick = (e: React.MouseEvent) => {
    if (faintedFromProps) return;
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
      : onCardClick && !faintedFromProps
        ? 'hover:border-green-500'
        : isToggleable && !faintedFromProps
          ? 'hover:border-yellow-400'
          : 'border-cyan-500';
  const cursorClass =
    (onCardClick || isToggleable || (isTargeting && isValidTarget)) && !faintedFromProps
      ? 'cursor-pointer'
      : 'cursor-default';

  return (
    <Card
      onClick={handleCardClick}
      className={`border-4 bg-gray-800/50 text-white shadow-lg transition-all ${cardSizeClasses[size]} ${borderColorClass} ${cursorClass} ${faintedClasses}`}
    >
      <CardContent className="p-2 space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-md font-bold truncate">{baseMonster.name}</h2>
          <Badge variant="secondary">LV. {level}</Badge>
        </div>
        <div className="bg-gray-900/50 rounded h-32 flex items-center justify-center overflow-hidden">
          <VeoMonster
            monsterId={baseMonster.id}
            level={level}
            size={size === 'tiny' ? 'tiny' : 'small'}
          />
        </div>
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-red-500 h-2.5 rounded-full"
              style={{ width: `${(currentHp / maxHp) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-right">
            HP: {currentHp} / {maxHp}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${(displayMp / maxMp) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-right">
            MP: {displayMp} / {maxMp}
          </div>
        </div>
        {isExpanded && (
          <div className="mt-2 space-y-3">
            <div className="bg-gray-900/60 p-2 rounded space-y-2 min-h-[100px]">
              <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">
                Abilities
              </h4>
              {faintedFromProps ? (
                 <p className="text-xs text-red-400 italic text-center font-bold">Fainted</p>
              ) : abilities.map((ability) => {
                  const canAfford = displayMp >= (ability.mp_cost || 0);
                  const isClickable =
                    onAbilityClick &&
                    ability.ability_type === 'ACTIVE' &&
                    isPlayerTurn;
                  const effectiveClass =
                    isClickable && canAfford
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
                        <span className="ml-auto text-blue-400">
                          {ability.mp_cost > 0 ? `${ability.mp_cost} MP` : ''}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[10px] leading-tight pl-6">
                        {ability.description}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}