import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Flame, Brain, Sword, Mountain, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

// --- TYPE DEFINITIONS (Aligned with parent components) ---
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
  id: number;
  name: string;
  type?: string;
  description?: string;
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
  battleMode?: boolean;
  isPlayerTurn?: boolean;
  onAbilityClick?: (ability: Ability) => void;
  showAbilities?: boolean;
  startExpanded?: boolean;
  isToggleable?: boolean;
  isTargetable?: boolean;
  onCardClick?: () => void;
  isFlipped?: boolean;
  onFlip?: () => void;
  showUpgradeAnimation?: boolean;
}

// --- HELPER FUNCTION ---
const getAffinityIcon = (affinity: string) => {
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

// --- MAIN COMPONENT ---
export default function MonsterCard({
  monster: monsterProp,
  userMonster,
  size = 'medium',
  battleMode = false,
  isPlayerTurn = false,
  onAbilityClick,
  showAbilities = true,
  startExpanded = false,
  isToggleable = true,
  isTargetable = false,
  onCardClick,
  isFlipped, // For MonsterLab
  onFlip, // For MonsterLab
  showUpgradeAnimation // For MonsterLab
}: MonsterCardProps) {

  const [isExpanded, setIsExpanded] = useState(startExpanded);

  useEffect(() => {
    setIsExpanded(startExpanded);
  }, [startExpanded]);

  // FIX: This component now relies on the parent to provide abilities.
  // We no longer fetch abilities inside the card itself.
  const baseMonster = 'monster' in monsterProp ? monsterProp.monster : monsterProp;
  const abilities = baseMonster.abilities || [];

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

  const handleCardClick = (e: React.MouseEvent) => {
    if (onCardClick) {
      e.stopPropagation();
      onCardClick();
      return;
    }
    // In MonsterLab, onFlip handles toggling details.
    if (onFlip) {
      onFlip();
      return;
    }
    if (isToggleable) {
      setIsExpanded(!isExpanded);
    }
  };

  const borderColorClass = isTargetable ? 'border-green-500 animate-pulse'
    : isToggleable || onFlip ? 'hover:border-yellow-400'
    : 'border-cyan-500';

  const finalIsExpanded = onFlip ? isFlipped : isExpanded;

  return (
    <Card
      onClick={handleCardClick}
      className={`border-4 bg-gray-800/50 text-white shadow-lg transition-colors ${cardSizeClasses[size]} ${borderColorClass} ${(isTargetable || isToggleable || onFlip) && 'cursor-pointer'}`}
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

        {finalIsExpanded && (
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {baseMonster.resistances.map(res => (
                        <Badge key={res} variant="secondary" className="capitalize bg-green-900/80 text-green-300 border-green-700/80">
                          {getAffinityIcon(res)} {res}
                        </Badge>
                      ))}
                    </div>
                  ) : <p className="text-gray-500 italic text-[11px]">None</p> }
                </div>
                <div>
                  <h5 className="font-bold text-red-400">Weak to</h5>
                  {baseMonster.weaknesses && baseMonster.weaknesses.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {baseMonster.weaknesses.map(weak => (
                        <Badge key={weak} variant="destructive" className="capitalize bg-red-900/80 text-red-300 border-red-700/80">
                          {getAffinityIcon(weak)} {weak}
                        </Badge>
                      ))}
                    </div>
                  ) : <p className="text-gray-500 italic text-[11px]">None</p> }
                </div>
              </div>
            )}

            {showAbilities && (
              <div className="bg-gray-900/60 p-2 rounded space-y-2 min-h-[100px]">
                <h4 className="text-sm font-semibold border-b border-gray-600 pb-1">Abilities</h4>
                {abilities.length === 0 ? <p className="text-xs text-gray-400 italic">No abilities to display.</p> : 
                  abilities.map(ability => {
                    const canAfford = battleMode && isPlayerTurn && (displayMp >= ability.mp_cost);
                    const isClickable = battleMode && isPlayerTurn && ability.ability_type === 'ACTIVE';
                    return (
                        <div
                            key={ability.id}
                            className={`p-1 rounded text-xs transition-all ${isClickable && canAfford ? 'bg-green-800/50 hover:bg-green-700/70 cursor-pointer' : isClickable && !canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            )}
          </div>
        )}

        {(isToggleable || onFlip) && (
          <div className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center">
            {finalIsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="ml-1">{finalIsExpanded ? 'Collapse' : 'Details'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}