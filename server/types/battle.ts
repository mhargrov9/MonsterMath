import { PlayerCombatMonster, AiCombatMonster, Ability } from '@shared/schema';

export type TurnPhase = 'start-of-turn' | 'action' | 'end-of-turn';
export type BattleStatus = 'active' | 'victory' | 'defeat' | 'abandoned';
export type CurrentTurn = 'player' | 'ai';

export interface StatusEffect {
  id: string;
  type: 'PARALYZED' | 'BURNED' | 'POISONED' | 'CONFUSED' | 'FROZEN';
  targetMonsterId: number;
  duration: number;
  value?: number;
  chance?: number;
}

export interface ActiveEffect {
  id: string;
  sourceAbilityId: number;
  targetMonsterId: number;
  stat: 'power' | 'defense' | 'speed';
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  duration: number;
}

export interface TurnSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  actingMonsterId: number;
  action?: TurnAction;
  stateBeforeAction: Partial<BattleState>;
  stateAfterAction: Partial<BattleState>;
  damage?: number;
  healing?: number;
  effects?: string[];
}

export interface BattleState {
  id: string;
  playerTeam: PlayerCombatMonster[];
  aiTeam: AiCombatMonster[];
  activePlayerIndex: number;
  activeAiIndex: number;
  turnCount: number;
  currentTurn: CurrentTurn;
  status: BattleStatus;
  log: string[];
  activeEffects: ActiveEffect[];
  statusEffects?: StatusEffect[];
  turnHistory: TurnSnapshot[];
}

export interface BattleSession {
  id: string;
  userId: string;
  state: BattleState;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface TurnAction {
  type: 'USE_ABILITY' | 'SWAP_MONSTER' | 'FORFEIT';
  payload: {
    abilityId?: number;
    targetId?: number;
    monsterId?: number;
  };
}

export interface TurnResult {
  success: boolean;
  nextState: BattleState;
  log: string[];
  error?: string;
}

export interface BattleEndResult {
  winner: 'player' | 'ai';
  rewards: {
    rankXp: number;
    gold?: number;
  };
  statistics: {
    turnsPlayed: number;
    damageDealt: number;
    damageTaken: number;
    abilitiesUsed: number;
  };
}