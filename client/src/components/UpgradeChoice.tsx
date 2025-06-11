import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Gem } from 'lucide-react';
import UltraDetailedMonsterGraphics from './UltraDetailedMonsterGraphics';
import type { UserMonster } from '@shared/schema';

interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  diamondCost: number;
  statBoosts: {
    power?: number;
    speed?: number;
    defense?: number;
  };
  upgradeKey: string;
  upgradeValue: string;
}

interface UpgradeChoiceProps {
  userMonster: UserMonster & { monster: any };
  onUpgrade: (upgradeOption: UpgradeOption) => void;
  userGold: number;
  userDiamonds: number;
}

const UpgradeChoice: React.FC<UpgradeChoiceProps> = ({ 
  userMonster, 
  onUpgrade, 
  userGold, 
  userDiamonds 
}) => {
  const getUpgradeOptions = (): UpgradeOption[] => {
    const currentChoices = userMonster.upgradeChoices as Record<string, any> || {};
    const options: UpgradeOption[] = [];

    // Teeth upgrades
    if (!currentChoices.teeth) {
      if (userMonster.monsterId === 1) { // Flamewyrm
        options.push({
          id: 'teeth_sharp',
          name: 'Razor Fangs',
          description: 'Sharp, menacing teeth that increase attack power',
          goldCost: 100,
          diamondCost: 0,
          statBoosts: { power: 15 },
          upgradeKey: 'teeth',
          upgradeValue: 'sharp'
        });
      } else if (userMonster.monsterId === 2) { // Frostbite
        options.push({
          id: 'teeth_icy',
          name: 'Ice Fangs',
          description: 'Crystalline teeth that freeze enemies',
          goldCost: 100,
          diamondCost: 0,
          statBoosts: { power: 12, speed: 8 },
          upgradeKey: 'teeth',
          upgradeValue: 'icy'
        });
      } else if (userMonster.monsterId === 3) { // Thunderclaw
        options.push({
          id: 'teeth_electric',
          name: 'Lightning Fangs',
          description: 'Electrified teeth that shock opponents',
          goldCost: 100,
          diamondCost: 0,
          statBoosts: { power: 10, speed: 15 },
          upgradeKey: 'teeth',
          upgradeValue: 'electric'
        });
      }
    }

    // Tail upgrades
    if (!currentChoices.tail) {
      if (userMonster.monsterId === 1) { // Flamewyrm
        options.push({
          id: 'tail_spiky',
          name: 'Flame Tail',
          description: 'A spiky tail wreathed in flames',
          goldCost: 150,
          diamondCost: 1,
          statBoosts: { power: 20, defense: 10 },
          upgradeKey: 'tail',
          upgradeValue: 'spiky'
        });
      } else if (userMonster.monsterId === 2) { // Frostbite
        options.push({
          id: 'tail_crystalline',
          name: 'Crystal Tail',
          description: 'A beautiful crystalline tail that can shatter armor',
          goldCost: 150,
          diamondCost: 1,
          statBoosts: { power: 18, defense: 12 },
          upgradeKey: 'tail',
          upgradeValue: 'crystalline'
        });
      } else if (userMonster.monsterId === 3) { // Thunderclaw
        options.push({
          id: 'tail_lightning',
          name: 'Lightning Tail',
          description: 'A tail that crackles with electric energy',
          goldCost: 150,
          diamondCost: 1,
          statBoosts: { power: 15, speed: 20 },
          upgradeKey: 'tail',
          upgradeValue: 'lightning'
        });
      }
    }

    // Body upgrades
    if (!currentChoices.body) {
      if (userMonster.monsterId === 1) { // Flamewyrm
        options.push({
          id: 'body_muscular',
          name: 'Inferno Muscle',
          description: 'Bulging muscles powered by inner fire',
          goldCost: 200,
          diamondCost: 2,
          statBoosts: { power: 25, defense: 15 },
          upgradeKey: 'body',
          upgradeValue: 'muscular'
        });
      } else if (userMonster.monsterId === 2) { // Frostbite
        options.push({  
          id: 'body_armored',
          name: 'Ice Armor',
          description: 'Thick armor plating made of solid ice',
          goldCost: 200,
          diamondCost: 2,
          statBoosts: { defense: 30, power: 10 },
          upgradeKey: 'body',
          upgradeValue: 'armored'
        });
      } else if (userMonster.monsterId === 3) { // Thunderclaw
        options.push({
          id: 'body_charged',
          name: 'Electric Core',
          description: 'A body charged with constant electricity',
          goldCost: 200,
          diamondCost: 2,
          statBoosts: { speed: 25, power: 20 },
          upgradeKey: 'body',
          upgradeValue: 'charged'
        });
      }
    }

    // Special upgrades (higher level required)
    if (userMonster.level >= 5) {
      if (!currentChoices.wings && userMonster.monsterId === 1) {
        options.push({
          id: 'wings_large',
          name: 'Phoenix Wings',
          description: 'Massive wings that allow flight and fire attacks',
          goldCost: 300,
          diamondCost: 5,
          statBoosts: { speed: 35, power: 30 },
          upgradeKey: 'wings',
          upgradeValue: 'large'
        });
      }

      if (!currentChoices.spikes) {
        if (userMonster.monsterId === 2) {
          options.push({
            id: 'spikes_ice',
            name: 'Ice Spikes',
            description: 'Sharp ice spikes along the back',
            goldCost: 250,
            diamondCost: 3,
            statBoosts: { defense: 25, power: 20 },
            upgradeKey: 'spikes',
            upgradeValue: 'ice'
          });
        } else if (userMonster.monsterId === 3) {
          options.push({
            id: 'spikes_electric',
            name: 'Lightning Spikes',
            description: 'Electric conductors that channel lightning',
            goldCost: 250,
            diamondCost: 3,
            statBoosts: { speed: 30, power: 25 },
            upgradeKey: 'spikes',
            upgradeValue: 'electric'
          });
        }
      }
    }

    return options;
  };

  const canAfford = (option: UpgradeOption): boolean => {
    return userGold >= option.goldCost && userDiamonds >= option.diamondCost;
  };

  const upgradeOptions = getUpgradeOptions();

  if (upgradeOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Upgrades Available</CardTitle>
          <CardDescription>
            This monster has all available upgrades! Try leveling up for more options.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose an Upgrade Path</h3>
      <div className="grid gap-4">
        {upgradeOptions.map((option) => {
          const affordable = canAfford(option);
          
          return (
            <Card key={option.id} className={`transition-all ${affordable ? 'hover:shadow-lg' : 'opacity-60'}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{option.name}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <DetailedMonsterGraphics 
                      monsterId={userMonster.monsterId} 
                      evolutionStage={userMonster.evolutionStage}
                      upgradeChoices={Object.assign(
                        {},
                        userMonster.upgradeChoices || {},
                        { [option.upgradeKey]: option.upgradeValue }
                      )}
                      size="small"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Stat boosts */}
                  <div className="flex gap-2 flex-wrap">
                    {option.statBoosts.power && (
                      <Badge variant="destructive">+{option.statBoosts.power} Power</Badge>
                    )}
                    {option.statBoosts.speed && (
                      <Badge variant="secondary">+{option.statBoosts.speed} Speed</Badge>
                    )}
                    {option.statBoosts.defense && (
                      <Badge variant="outline">+{option.statBoosts.defense} Defense</Badge>
                    )}
                  </div>
                  
                  {/* Cost and button */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className={option.goldCost > userGold ? 'text-red-500' : 'text-green-600'}>
                          {option.goldCost}
                        </span>
                      </div>
                      {option.diamondCost > 0 && (
                        <div className="flex items-center gap-1">
                          <Gem className="w-4 h-4 text-blue-500" />
                          <span className={option.diamondCost > userDiamonds ? 'text-red-500' : 'text-green-600'}>
                            {option.diamondCost}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => onUpgrade(option)}
                      disabled={!affordable}
                      variant={affordable ? "default" : "secondary"}
                    >
                      {affordable ? 'Upgrade' : 'Cannot Afford'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UpgradeChoice;