// Shared types for the entire application - single source of truth

export type Turn = 'player' | 'ai' | 'pre-battle' | 'player-must-swap';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  affinityMultiplier: number;
}

export interface UserMonster {
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
  acquiredAt?: string | Date | null;
  monster: Monster;
  hp: number;
  mp: number;
  maxHp?: number;
  maxMp?: number;
  battleHp?: number;
  battleMaxHp?: number;
  battleMp?: number;
  battleMaxMp?: number;
  isShattered?: boolean;
  statusEffects?: StatusEffect[];
}

export interface Monster {
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
  battleHp?: number;
  battleMaxHp?: number;
  battleMp?: number;
  battleMaxMp?: number;
  weaknesses?: string[];
  statusEffects?: StatusEffect[];
  levelUpgrades?: any;
  hp?: number;
  mp?: number;
}

// Status effect details structure for abilities
export interface StatusEffectDetails {
  id?: number;
  name: string;
  effect_type: string;
  value_type: string;
  default_value: string;
  default_duration?: number;
  duration_reduction_position?: string;
}

// Status effect applied to monsters
export interface StatusEffect {
  name: string;
  duration: number;
  isNew?: boolean;
  effectDetails: StatusEffectDetails;
  override_value?: string;
}

export interface Ability {
  id: number;
  name: string;
  description?: string;
  ability_type: string;
  mp_cost?: number;
  affinity?: string | null;
  power_multiplier?: string;
  scaling_stat?: string;
  target_scope?: string;
  healing_power?: number;
  status_effect_applies?: string;
  status_effect_chance?: number;
  status_effect_duration?: number;
  // Additional database fields for status effects and passive abilities
  status_effect_id?: number;
  effectDetails?: StatusEffectDetails;
  override_chance?: number;
  override_duration?: number;
  override_value?: string;
  activation_trigger?: string;
  activation_scope?: string;
}

export interface GameUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  gold: number;
  diamonds: number;
  currentSubject?: string;
  questionsAnswered: number;
  correctAnswers: number;
  currentStreak: number;
  battleTokens: number;
}

export interface Question {
  id: number;
  subject: string;
  difficulty: number;
  questionText: string;
  correctAnswer: string;
  options: string[];
  hint?: string;
  goldReward: number;
}

export interface Battle {
  id: number;
  attackerId: string;
  defenderId: string;
  attackerMonsterId: number;
  defenderMonsterId: number;
  winnerId: string;
  goldFee: number;
  diamondsAwarded: number;
  battleAt?: string;
}

export interface ActiveEffect {
  id: number;
  type: string;
  value: number;
  duration: number;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'crit';
  targetId: number;
  isPlayerTarget: boolean;
}

export type Subject = "math" | "spelling" | "mixed";
export type GameTab = "learn" | "lab" | "battle" | "story";