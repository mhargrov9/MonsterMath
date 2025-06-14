import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Eye, Flame, Snowflake } from 'lucide-react';

interface MonsterCardProps {
  monster: {
    id: number;
    name: string;
    type: string;
    basePower: number;
    baseSpeed: number;
    baseDefense: number;
    baseHp?: number;
    baseMp?: number;
    goldCost?: number;
    diamondCost?: number;
  };
  userMonster?: {
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
    experience: number;
  };
  isFlipped?: boolean;
  onFlip?: () => void;
  showUpgradeAnimation?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const getMonsterData = (monsterId: number) => {
  switch (monsterId) {
    case 6: // Gigalith
      return {
        archetype: "Tank Creature",
        affinities: ["Earth", "Fire"],
        abilities: [
          {
            type: "PASSIVE",
            name: "Magma Core",
            description: "Deals 10 Fire damage to any monster that makes physical contact with Gigalith."
          },
          {
            type: "ACTIVE",
            name: "Magma Punch",
            cost: "40 MP",
            description: "A powerful punch dealing 1.2x Power as Fire damage."
          },
          {
            type: "ACTIVE", 
            name: "Tremor Stomp",
            cost: "50 MP",
            description: "Deals 0.8x Power as Earth damage and has a 20% chance to make opponent flinch."
          }
        ],
        flavorText: "Born in the planet's core, its fists can shatter mountains and its heart is a captive star.",
        weakness: "Water",
        resistance: "Fire",
        cardStyle: "stone-textured border-amber-600 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950 dark:to-red-900"
      };
    case 7: // Aetherion
      return {
        archetype: "Glass Cannon",
        affinities: ["Psychic", "Arcane"],
        abilities: [
          {
            type: "PASSIVE",
            name: "Precognition", 
            description: "A 15% chance to completely dodge an incoming attack, taking 0 damage."
          },
          {
            type: "ACTIVE",
            name: "Mind Strike",
            cost: "30 MP",
            description: "A basic ranged attack dealing 1x Power as Psychic damage that is difficult to evade."
          },
          {
            type: "ACTIVE",
            name: "Psy-Beam", 
            cost: "70 MP",
            description: "A focused beam dealing 1.5x Power as Psychic damage, but has a 10% chance to fail."
          }
        ],
        flavorText: "A living star-chart, gazing into all possible futures at once. Its silence is not empty, but full of thoughts that could shatter reality.",
        weakness: "Physical",
        resistance: "Psychic",
        cardStyle: "crystalline border-purple-600 bg-gradient-to-br from-purple-50 to-blue-100 dark:from-purple-950 dark:to-blue-900"
      };
    default:
      return {
        archetype: "Unknown",
        affinities: ["Neutral"],
        abilities: [],
        flavorText: "A mysterious creature with unknown abilities.",
        weakness: "Unknown",
        resistance: "Unknown",
        cardStyle: "border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900"
      };
  }
};

const getWeaknessIcon = (weakness: string) => {
  switch (weakness.toLowerCase()) {
    case 'water': return <Droplets className="w-4 h-4 text-blue-500" />;
    case 'fire': return <Flame className="w-4 h-4 text-red-500" />;
    case 'ice': return <Snowflake className="w-4 h-4 text-cyan-500" />;
    case 'physical': return <Zap className="w-4 h-4 text-yellow-500" />;
    case 'psychic': return <Eye className="w-4 h-4 text-purple-500" />;
    default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  }
};

const getResistanceIcon = (resistance: string) => {
  switch (resistance.toLowerCase()) {
    case 'fire': return <Flame className="w-4 h-4 text-red-500" />;
    case 'water': return <Droplets className="w-4 h-4 text-blue-500" />;
    case 'ice': return <Snowflake className="w-4 h-4 text-cyan-500" />;
    case 'physical': return <Shield className="w-4 h-4 text-gray-500" />;
    case 'psychic': return <Eye className="w-4 h-4 text-purple-500" />;
    default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  }
};

export default function MonsterCard({ 
  monster, 
  userMonster, 
  isFlipped = false, 
  onFlip, 
  showUpgradeAnimation = false,
  size = 'medium'
}: MonsterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const monsterData = getMonsterData(monster.id);
  const level = userMonster?.level || 1;
  const currentHp = userMonster?.hp || monster.baseHp || 950;
  const maxHp = userMonster?.maxHp || monster.baseHp || 950;
  const currentMp = userMonster?.mp || monster.baseMp || 200;
  const maxMp = userMonster?.maxMp || monster.baseMp || 200;

  const cardSizes = {
    small: { width: 280, height: 400 },
    medium: { width: 350, height: 500 },
    large: { width: 420, height: 600 }
  };

  const cardSize = cardSizes[size];

  if (isFlipped && userMonster) {
    // Battle Record (Back of Card)
    return (
      <Card 
        className={`${monsterData.cardStyle} border-4 cursor-pointer transition-all duration-500 hover:scale-105`}
        style={{ width: cardSize.width, height: cardSize.height }}
        onClick={onFlip}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-4 h-full flex flex-col">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gradient bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              BATTLE RECORD
            </h2>
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {monster.name} - Level {level}
            </div>
          </div>

          <div className="space-y-3 flex-1">
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-sm font-semibold mb-2">Combat Statistics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Wins: 12</div>
                <div>Total Battles: 20</div>
                <div>Win Rate: 60%</div>
                <div>Experience: {userMonster.experience}</div>
              </div>
            </div>

            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-sm font-semibold mb-2">Battle Records</div>
              <div className="text-xs space-y-1">
                <div>Biggest Hit Dealt: 152 damage</div>
                <div>Favorite Move: Magma Punch</div>
                <div>Times Used: 35</div>
              </div>
            </div>

            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg">
              <div className="text-sm font-semibold mb-2">History</div>
              <div className="text-xs">
                <div>First Acquired: June 14, 2025</div>
                <div>Evolution Stage: {userMonster.evolutionStage}</div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
            Click to flip back
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`${monsterData.cardStyle} border-4 relative overflow-hidden transition-all duration-500 ${
        showUpgradeAnimation ? 'animate-pulse shadow-2xl shadow-yellow-400/50' : ''
      } ${isHovered ? 'scale-105 shadow-xl' : ''} ${onFlip ? 'cursor-pointer' : ''}`}
      style={{ width: cardSize.width, height: cardSize.height }}
      onClick={onFlip}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Upgrade Animation Overlay */}
      {showUpgradeAnimation && (
        <div className="absolute inset-0 bg-gradient-radial from-yellow-400/30 via-orange-400/20 to-transparent animate-ping z-10" />
      )}

      <CardContent className="p-0 h-full flex flex-col relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Level Gem */}
            <div className={`px-2 py-1 rounded-full border-2 border-yellow-400 bg-gradient-to-br from-yellow-200 to-orange-300 text-black font-bold text-sm ${
              showUpgradeAnimation ? 'animate-bounce' : ''
            }`}>
              LV. {level}
            </div>
            <h1 className="text-xl font-bold tracking-wider">{monster.name.toUpperCase()}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-red-400 font-bold">HP {currentHp} / {maxHp}</div>
          </div>
        </div>

        {/* Monster Image */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative">
          <VeoMonster
            monsterId={monster.id}
            evolutionStage={userMonster?.evolutionStage || 1}
            upgradeChoices={{
              ...userMonster?.upgradeChoices,
              level: level
            }}
            size={size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'}
          />
          
          {/* Living Animation Overlay for specific monsters */}
          {monster.id === 6 && (
            <div className="absolute inset-0 bg-gradient-radial from-red-500/10 via-transparent to-transparent animate-pulse pointer-events-none" />
          )}
          {monster.id === 7 && (
            <div className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-transparent to-transparent animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Type Line */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-3 py-2 text-center">
          <span className="text-sm font-semibold">
            {monsterData.archetype} — {monsterData.affinities.join(' / ')}
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 flex gap-3">
          {/* Stats Block */}
          <div className="w-1/3 space-y-2">
            <div className="bg-white/70 dark:bg-black/30 p-2 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-red-500" />
                <span className="font-semibold">Power:</span>
              </div>
              <div className="text-lg font-bold">{userMonster?.power || monster.basePower}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-2 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-blue-500" />
                <span className="font-semibold">Defense:</span>
              </div>
              <div className="text-lg font-bold">{userMonster?.defense || monster.baseDefense}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-2 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Gauge className="w-3 h-3 text-green-500" />
                <span className="font-semibold">Speed:</span>
              </div>
              <div className="text-lg font-bold">{userMonster?.speed || monster.baseSpeed}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-2 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Droplets className="w-3 h-3 text-cyan-500" />
                <span className="font-semibold">Mana:</span>
              </div>
              <div className="text-sm font-bold">{currentMp}/{maxMp}</div>
            </div>
          </div>

          {/* Abilities Box */}
          <div className="w-2/3">
            <div className="bg-white/70 dark:bg-black/30 p-2 rounded h-full">
              <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">ABILITIES</div>
              <div className="space-y-2 text-xs">
                {monsterData.abilities.map((ability, index) => (
                  <div key={index}>
                    <div className="flex gap-1">
                      <Badge variant={ability.type === 'PASSIVE' ? 'secondary' : 'destructive'} className="text-xs px-1 py-0">
                        {ability.type === 'PASSIVE' ? 'P' : 'A'}
                      </Badge>
                      <span className="font-semibold">{ability.name}</span>
                      {ability.cost && <span className="text-blue-600">({ability.cost})</span>}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 leading-tight">
                      {ability.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Flavor Text */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-3">
          <div className="text-xs italic text-center text-gray-700 dark:text-gray-300 leading-relaxed">
            "{monsterData.flavorText}"
          </div>
        </div>

        {/* Footer - Weakness & Resistance */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-2 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1">
            <span>Weakness:</span>
            {getWeaknessIcon(monsterData.weakness)}
            <span>{monsterData.weakness}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Resistance:</span>
            {getResistanceIcon(monsterData.resistance)}
            <span>{monsterData.resistance}</span>
          </div>
        </div>

        {onFlip && (
          <div className="absolute bottom-1 right-1 text-xs text-gray-500 dark:text-gray-400">
            Click to flip
          </div>
        )}
      </CardContent>
    </Card>
  );
}