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
}

export interface Monster {
  id: number;
  name: string;
  type: string;
  basePower: number;
  baseSpeed: number;
  baseDefense: number;
  goldCost: number;
  diamondCost: number;
  description?: string;
  iconClass: string;
  gradient: string;
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

export type Subject = "math" | "spelling" | "mixed";
export type GameTab = "learn" | "lab" | "battle";
