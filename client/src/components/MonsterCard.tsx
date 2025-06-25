import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import VeoMonster from './VeoMonster';
import { Zap, Shield, Gauge, Droplets, Eye, Flame, Snowflake, Brain, Sword, Hand, Mountain, Sparkles, Target, Plus, ShieldX } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
    resistances?: string;
    weaknesses?: string;
    description?: string;
    starterSet?: boolean;
    level?: number; // Added level property to monster interface
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
  battleHp?: number;
  onAbilityClick?: (ability: any) => void;
  showAbilities?: boolean;
}

const getMonsterData = (monsterId: number, monster: any) => {
  // Use database description if available, otherwise fall back to default
  const description = monster.description || "A mysterious creature with unknown abilities.";

  // Parse database resistances and weaknesses, fall back to arrays if needed
  let resistances = [];
  let weaknesses = [];

  try {
    resistances = Array.isArray(monster.resistances) ? monster.resistances : JSON.parse(monster.resistances || '[]');
    weaknesses = Array.isArray(monster.weaknesses) ? monster.weaknesses : JSON.parse(monster.weaknesses || '[]');
  } catch (e) {
    resistances = [];
    weaknesses = [];
  }

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
        flavorText: description,
        weakness: weaknesses[0] || "Water",
        resistance: resistances[0] || "Fire",
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
        flavorText: description,
        weakness: weaknesses[0] || "Physical",
        resistance: resistances[0] || "Psychic",
        cardStyle: "crystalline border-purple-600 bg-gradient-to-br from-purple-50 to-blue-100 dark:from-purple-950 dark:to-blue-900"
      };

    case 8: // Geode Tortoise
      return {
        archetype: "Tank",
        affinities: ["Earth", "Crystal"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Water",
        resistance: resistances[0] || "Electric",
        cardStyle: "border-green-600 bg-gradient-to-br from-green-50 to-brown-100 dark:from-green-950 dark:to-brown-900"
      };

    case 9: // Gale-Feather Griffin
      return {
        archetype: "Scout",
        affinities: ["Air", "Flying"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Electric",
        resistance: resistances[0] || "Earth",
        cardStyle: "border-cyan-600 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-950 dark:to-blue-900"
      };

    case 10: // Cinder-Tail Salamander
      return {
        archetype: "Attacker",
        affinities: ["Fire"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Water",
        resistance: resistances[0] || "Fire",
        cardStyle: "border-red-600 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-900"
      };

    case 11: // River-Spirit Axolotl
      return {
        archetype: "Support",
        affinities: ["Water", "Spirit"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Poison",
        resistance: resistances[0] || "Water",
        cardStyle: "border-blue-600 bg-gradient-to-br from-blue-50 to-teal-100 dark:from-blue-950 dark:to-teal-900"
      };

    case 12: // Spark-Tail Squirrel
      return {
        archetype: "Controller",
        affinities: ["Electric"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Earth",
        resistance: resistances[0] || "Air",
        cardStyle: "border-yellow-600 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-900"
      };

    default:
      return {
        archetype: "Unknown",
        affinities: ["Neutral"],
        abilities: [],
        flavorText: description,
        weakness: weaknesses[0] || "Unknown",
        resistance: resistances[0] || "Unknown",
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
    case 'electric': return <Zap className="w-4 h-4 text-yellow-500" />;
    case 'earth': return <Mountain className="w-4 h-4 text-brown-500" />;
    case 'poison': return <Droplets className="w-4 h-4 text-green-500" />;
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
    case 'electric': return <Zap className="w-4 h-4 text-yellow-500" />;
    case 'earth': return <Mountain className="w-4 h-4 text-brown-500" />;
    case 'air': return <Sparkles className="w-4 h-4 text-cyan-500" />;
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
  battleHp,
  onAbilityClick,
  showAbilities = true
}: MonsterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const monsterData = getMonsterData(monster.id, monster);

  console.log('MonsterCard received userMonster prop:', userMonster);

  // FIXED: Check monster prop first (which contains battleState data), then fall back to userMonster
  const level = monster.level || userMonster?.level || 1;

  // NEW: Fetch abilities from the relational API endpoint
  const { data: abilitiesData, isLoading: abilitiesLoading, error: abilitiesError } = useQuery({
    queryKey: [`/api/monster-abilities/${monster.id}`],
    enabled: !!monster.id, // Only run query if monster.id exists
  });

  // Process the abilities data - API returns abilities array directly
  const actualAbilities = abilitiesData || [];

  const isShattered = userMonster?.isShattered || false;

  // Use persistent HP/MP from database, fall back to base values only for new monsters
  const currentHp = battleHp ?? (userMonster?.hp ?? monster.baseHp ?? 0);
  const maxHp = userMonster?.maxHp !== null && userMonster?.maxHp !== undefined
    ? userMonster.maxHp
    : (monster.baseHp || 950);

  const displayMp = battleMode
    ? (battleMp ?? (userMonster?.mp !== null && userMonster?.mp !== undefined ? userMonster.mp : (monster.baseMp || 200)))
    : (userMonster?.mp !== null && userMonster?.mp !== undefined ? userMonster.mp : (monster.baseMp || 200));

  const maxMp = userMonster?.maxMp !== null && userMonster?.maxMp !== undefined
    ? userMonster.maxMp
    : (monster.baseMp || 200);

  // Responsive card classes based on size - increased heights to show all content
  const getCardClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'w-64 sm:w-72 h-[720px] sm:h-[800px] md:h-[840px]';
      case 'medium':
        return 'w-72 sm:w-80 md:w-84 lg:w-88 h-[820px] sm:h-[900px] md:h-[940px] lg:h-[980px]';
      case 'large':
        return 'w-80 sm:w-88 md:w-96 lg:w-[420px] h-[870px] sm:h-[950px] md:h-[1020px] lg:h-[1100px]';
      default:
        return 'w-72 sm:w-80 md:w-84 lg:w-88 h-[820px] sm:h-[900px] md:h-[940px] lg:h-[980px]';
    }
  };

  const cardClasses = getCardClasses(size);

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
        className={`${monsterData.cardStyle} ${cardClasses} border-4 cursor-pointer transition-all duration-500 hover:scale-105`}
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
      className={`${monsterData.cardStyle} ${cardClasses} border-4 relative overflow-hidden transition-all duration-500 ${
        showUpgradeAnimation ? 'animate-pulse shadow-2xl shadow-yellow-400/50' : ''
      } ${isHovered ? 'scale-105 shadow-xl' : ''} ${onFlip ? 'cursor-pointer' : ''} ${
        isShattered ? 'grayscale opacity-60' : ''
      }`}
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
            {monsterData.archetype} --- {monsterData.affinities.join(' / ')}
          </span>
        </div>

        {/* Main Content */}
        <div className="p-2 flex gap-2 flex-1 min-h-0">
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
          </div>

          {/* Abilities Box */}
          <div className="w-2/3 flex flex-col">
            <div className="bg-white/70 dark:bg-black/30 p-2 rounded flex-1">
              <div className="text-xs font-bold mb-2 border-b border-gray-400 pb-1">ABILITIES</div>
              <div className="space-y-2 text-xs">
                {/* Loading State */}
                {abilitiesLoading && (
                  <div className="text-center text-gray-500 text-xs">
                    Loading abilities...
                  </div>
                )}

                {/* Error State */}
                {abilitiesError && (
                  <div className="text-center text-red-500 text-xs">
                    Failed to load abilities
                  </div>
                )}

                {/* Abilities List */}
                {!abilitiesLoading && !abilitiesError && actualAbilities.length === 0 && (
                  <div className="text-center text-gray-500 text-xs">
                    No abilities available
                  </div>
                )}

                {showAbilities && actualAbilities.map((ability: any, index: number) => {
                  const manaCost = ability.mp_cost || 0;
                  const canAfford = battleMode && isPlayerTurn && ability.ability_type === 'ACTIVE' && displayMp >= manaCost;
                  const isClickable = battleMode && isPlayerTurn && ability.ability_type === 'ACTIVE';

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
                          onAbilityClick(ability);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {ability.ability_type === 'PASSIVE' ? (
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
                        {ability.mp_cost && <span className="text-blue-600 font-medium">({ability.mp_cost} MP)</span>}
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
      </CardContent>
    </Card>
  );
}
