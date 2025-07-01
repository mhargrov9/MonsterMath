// Types for the battle system
interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
}

interface UserMonster {
  id: number;
  userId: string;
  monsterId: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  experience: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  hp: number;
  mp: number;
  monster: Monster;
}

interface Monster {
  id: number;
  name: string;
  type: string;
  basePower: number;
  baseSpeed: number;
  baseDefense: number;
  baseHp?: number;
  baseMp?: number;
  goldCost: number;
  diamondCost: number;
  description?: string;
  iconClass: string;
  gradient: string;
  abilities?: any[];
  resistances?: string[];
  weaknesses?: string[];
  levelUpgrades?: any;
  hp?: number;
  mp?: number;
}

interface Ability {
  id: number;
  name: string;
  description?: string;
  ability_type: string;
  mp_cost?: number;
  affinity?: string | null;
  power_multiplier?: string;
  scaling_stat?: string;
}

// Helper function to get modified stats (can be expanded with activeEffects later)
const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
  // This function can be expanded with activeEffects later
  if ('monster' in monster) { // It's a UserMonster
      return monster[statName];
  }
  // It's a base Monster for the AI
  const baseStatMap = {
      power: 'basePower',
      defense: 'baseDefense',
      speed: 'baseSpeed'
  } as const;
  return (monster as any)[baseStatMap[statName]] || 0;
};

// Helper function to calculate type effectiveness
const getAffinityMultiplier = (attackAffinity: string | null | undefined, defender: Monster): number => {
  if (!attackAffinity) return 1.0;
  const lower = attackAffinity.toLowerCase();
  if (defender.weaknesses && Array.isArray(defender.weaknesses)) {
    if (defender.weaknesses.map((w: any) => w.toLowerCase()).includes(lower)) return 2.0;
  }
  if (defender.resistances && Array.isArray(defender.resistances)) {
    if (defender.resistances.map((r: any) => r.toLowerCase()).includes(lower)) return 0.5;
  }
  return 1.0;
};

// Main damage calculation function
export const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => {
  const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
  const attackingPower = getModifiedStat(attacker, scalingStatName);
  const defendingDefense = getModifiedStat(defender, 'defense');
  const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
  const damageMultiplier = 100 / (100 + defendingDefense);
  let rawDamage = attackPower * damageMultiplier;
  const defenderMonster = 'monster' in defender ? defender.monster : defender;
  const affinityMultiplier = getAffinityMultiplier(ability.affinity, defenderMonster);
  rawDamage *= affinityMultiplier;
  const isCritical = Math.random() < 0.05;
  if (isCritical) rawDamage *= 1.5;
  const variance = 0.9 + Math.random() * 0.2;
  rawDamage *= variance;
  const finalDamage = Math.round(Math.max(1, rawDamage));
  return { damage: finalDamage, isCritical, affinityMultiplier };
};