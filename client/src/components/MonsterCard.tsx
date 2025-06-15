import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Eye, Flame, Snowflake, Brain, Sword, Hand, Mountain, Sparkles, Target, Plus, ShieldX } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
    isShattered?: boolean;
  };
  isFlipped?: boolean;
  onFlip?: () => void;
  showUpgradeAnimation?: boolean;
  size?: 'small' | 'medium' | 'large';
  // Battle-specific props
  battleMode?: boolean;
  isPlayerTurn?: boolean;
  battleMp?: number;
  onAbilityClick?: (abilityName: string, manaCost: number, damage: number, description: string) => void;
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

const getAbilityIcon = (abilityName: string) => {
  const name = abilityName.toLowerCase();
  if (name.includes('precognition') || name.includes('mind')) return <Brain className="w-3 h-3 text-purple-500" />;
  if (name.includes('strike') || name.includes('beam')) return <Target className="w-3 h-3 text-blue-500" />;
  if (name.includes('punch') || name.includes('fist')) return <Hand className="w-3 h-3 text-red-500" />;
  if (name.includes('stomp') || name.includes('tremor') || name.includes('core')) return <Mountain className="w-3 h-3 text-orange-500" />;
  if (name.includes('magma') || name.includes('fire')) return <Flame className="w-3 h-3 text-red-500" />;
  if (name.includes('psy') || name.includes('psychic')) return <Sparkles className="w-3 h-3 text-purple-500" />;
  return <Sword className="w-3 h-3 text-gray-500" />;
};

export default function MonsterCard({ 
  monster, 
  userMonster, 
  isFlipped = false, 
  onFlip, 
  showUpgradeAnimation = false,
  size = 'medium',
  battleMode = false,
  isPlayerTurn = false,
  battleMp = 0,
  onAbilityClick
}: MonsterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const monsterData = getMonsterData(monster.id);
  const level = userMonster?.level || 1;
  const isShattered = userMonster?.isShattered || false;
  // Use persistent HP/MP from database, fall back to base values only for new monsters
  const currentHp = userMonster?.hp !== null && userMonster?.hp !== undefined 
    ? userMonster.hp 
    : (monster.baseHp || 950);
  const maxHp = userMonster?.maxHp !== null && userMonster?.maxHp !== undefined 
    ? userMonster.maxHp 
    : (monster.baseHp || 950);
  const displayMp = battleMode 
    ? (battleMp ?? (userMonster?.mp !== null && userMonster?.mp !== undefined ? userMonster.mp : (monster.baseMp || 200)))
    : (userMonster?.mp !== null && userMonster?.mp !== undefined ? userMonster.mp : (monster.baseMp || 200));
  const maxMp = userMonster?.maxMp !== null && userMonster?.maxMp !== undefined 
    ? userMonster.maxMp 
    : (monster.baseMp || 200);

  const cardSizes = {
    small: { width: 280, height: 780 },
    medium: { width: 350, height: 900 },
    large: { width: 420, height: 1020 }
  };

  const cardSize = cardSizes[size];

  // Calculate healing cost (1 Gold per 10 HP healed, rounded up)
  const hpMissing = maxHp - currentHp;
  const healingCost = Math.ceil(hpMissing / 10);
  const needsHealing = userMonster && currentHp < maxHp && !battleMode && !isShattered;
  


  // Healing mutation
  const healMutation = useMutation({
    mutationFn: async () => {
      if (!userMonster) throw new Error("No monster to heal");
      
      return await apiRequest("POST", "/api/monsters/heal", {
        monsterId: userMonster.id,
        healingCost: healingCost
      });
    },
    onSuccess: () => {
      toast({
        title: "Monster Healed!",
        description: `${monster.name} has been fully healed for ${healingCost} Gold.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/monsters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Healing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      } ${isHovered ? 'scale-105 shadow-xl' : ''} ${onFlip ? 'cursor-pointer' : ''} ${
        isShattered ? 'grayscale opacity-60' : ''
      }`}
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
            {/* Pulsating Eye - only for owned monsters */}
            {userMonster && (monster.id === 7 || monster.id === 6) && (
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Eye className="w-4 h-4 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold tracking-wider">{monster.name.toUpperCase()}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-red-400 font-bold">HP {currentHp} / {maxHp}</div>
            {/* Shattered Status Icon */}
            {isShattered && (
              <div className="flex items-center gap-1 mt-1">
                <ShieldX className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600 font-bold">SHATTERED</span>
              </div>
            )}
            {/* Heal Button */}
            {needsHealing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-1 h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
                    disabled={healMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Heal
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Heal {monster.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Fully heal for {healingCost} Gold?
                      <br />
                      <span className="text-sm text-muted-foreground">
                        Restoring {hpMissing} HP ({currentHp} → {maxHp})
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.stopPropagation();
                        healMutation.mutate();
                      }}
                      disabled={healMutation.isPending}
                    >
                      {healMutation.isPending ? 'Healing...' : 'Yes, Heal'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
        <div className="p-2 flex gap-2" style={{ height: '400px' }}>
          {/* Stats Block */}
          <div className="w-1/3 space-y-1">
            <div className="bg-white/70 dark:bg-black/30 p-1.5 rounded text-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <Zap className="w-3 h-3 text-red-500" />
                <span className="font-semibold">Power:</span>
              </div>
              <div className="text-sm font-bold">{userMonster?.power || monster.basePower}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-1.5 rounded text-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <Shield className="w-3 h-3 text-blue-500" />
                <span className="font-semibold">Defense:</span>
              </div>
              <div className="text-sm font-bold">{userMonster?.defense || monster.baseDefense}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-1.5 rounded text-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <Gauge className="w-3 h-3 text-green-500" />
                <span className="font-semibold">Speed:</span>
              </div>
              <div className="text-sm font-bold">{userMonster?.speed || monster.baseSpeed}</div>
            </div>

            <div className="bg-white/70 dark:bg-black/30 p-1.5 rounded text-xs">
              <div className="flex items-center gap-1 mb-0.5">
                <Droplets className="w-3 h-3 text-cyan-500" />
                <span className="font-semibold">Mana:</span>
              </div>
              <div className="text-sm font-bold">{displayMp}/{maxMp}</div>
            </div>

            {/* Basic Attack Button */}
            <div 
              className={`mt-2 p-1.5 rounded border transition-all duration-200 text-xs ${
                battleMode && isPlayerTurn 
                  ? 'bg-blue-100 border-blue-500 border-2 shadow-lg cursor-pointer hover:bg-blue-200' 
                  : 'bg-white/70 dark:bg-black/30 border-gray-300'
              }`}
              onClick={() => {
                if (battleMode && isPlayerTurn && onAbilityClick) {
                  const power = userMonster?.power || monster.basePower;
                  const damage = Math.floor(power * 0.6);
                  onAbilityClick('Basic Attack', 0, damage, '');
                }
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="outline" className="text-xs px-1 py-0.5 rounded-full bg-blue-500 text-white border-blue-500">
                  B
                </Badge>
                <Sword className="w-3 h-3 text-blue-500" />
                <span className="font-semibold">Basic Attack</span>
                <span className="text-blue-600 font-medium">(0 MP)</span>
              </div>

            </div>
          </div>

          {/* Abilities Box */}
          <div className="w-2/3">
            <div className="bg-white/70 dark:bg-black/30 p-2 rounded" style={{ height: '360px' }}>
              <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">ABILITIES</div>
              <div className="space-y-2 text-xs">
                {monsterData.abilities.map((ability, index) => {
                  const manaCost = ability.cost ? parseInt(ability.cost.replace(/\D/g, '')) : 0;
                  const canAfford = battleMode && isPlayerTurn && ability.type === 'ACTIVE' && battleMp >= manaCost;
                  const isClickable = battleMode && isPlayerTurn && ability.type === 'ACTIVE';
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-1.5 rounded border transition-all duration-200 ${
                        canAfford 
                          ? 'bg-red-100 border-red-500 border-2 shadow-lg cursor-pointer hover:bg-red-200' 
                          : isClickable && !canAfford
                          ? 'bg-gray-100 border-gray-400 opacity-50 cursor-not-allowed'
                          : 'bg-white/50 dark:bg-black/20 border-gray-300'
                      }`}
                      onClick={() => {
                        if (canAfford && onAbilityClick) {
                          const damage = ability.type === 'ACTIVE' ? 40 : 0;
                          onAbilityClick(ability.name, manaCost, damage, ability.description);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {ability.type === 'PASSIVE' ? (
                          <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">P</span>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-xs px-1 py-0.5 rounded-full">
                            A
                          </Badge>
                        )}
                        {getAbilityIcon(ability.name)}
                        <span className="font-semibold">{ability.name}</span>
                        {ability.cost && <span className="text-blue-600 font-medium">({ability.cost})</span>}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-tight text-xs ml-6">
                        {ability.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Flavor Text */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-2">
          <div className="text-xs italic text-center text-gray-700 dark:text-gray-300 leading-tight">
            "{monsterData.flavorText}"
          </div>
        </div>

        {/* Footer - Weakness & Resistance */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-1.5 flex justify-between items-center text-xs">
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