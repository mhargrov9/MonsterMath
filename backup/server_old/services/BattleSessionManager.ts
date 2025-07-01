import { nanoid } from 'nanoid';
import { BattleState, BattleSession, TurnAction, TurnResult } from '../types/battle';
import { PlayerCombatMonster, AiCombatMonster } from '@shared/schema';

/**
 * Professional battle session management with in-memory storage.
 * In production, this would use Redis for horizontal scaling.
 */
export class BattleSessionManager {
  private sessions: Map<string, BattleSession> = new Map();
  private userBattles: Map<string, string> = new Map(); // userId -> battleId mapping

  // Session expiry time (30 minutes)
  private readonly SESSION_EXPIRY_MS = 30 * 60 * 1000;

  constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Creates a new battle session with unique ID
   */
  createSession(userId: string, playerTeam: PlayerCombatMonster[], aiTeam: AiCombatMonster[]): string {
    // Check if user already has an active battle
    const existingBattleId = this.userBattles.get(userId);
    if (existingBattleId && this.sessions.has(existingBattleId)) {
      throw new Error('BATTLE_ALREADY_IN_PROGRESS');
    }

    const battleId = `battle_${nanoid(12)}`;
    const now = Date.now();

    const initialState: BattleState = {
      id: battleId,
      playerTeam,
      aiTeam,
      activePlayerIndex: 0,
      activeAiIndex: 0,
      turnCount: 1,
      currentTurn: 'player',
      status: 'active',
      log: ['Battle Started!'],
      activeEffects: [],
      turnHistory: []
    };

    const session: BattleSession = {
      id: battleId,
      userId,
      state: initialState,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.SESSION_EXPIRY_MS
    };

    this.sessions.set(battleId, session);
    this.userBattles.set(userId, battleId);

    return battleId;
  }

  /**
   * Retrieves a battle session by ID
   */
  getSession(battleId: string, userId: string): BattleSession | null {
    const session = this.sessions.get(battleId);

    if (!session) {
      return null;
    }

    // Verify ownership
    if (session.userId !== userId) {
      throw new Error('UNAUTHORIZED_ACCESS');
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.endSession(battleId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + this.SESSION_EXPIRY_MS;

    return session;
  }

  /**
   * Updates battle state after turn processing
   */
  updateSession(battleId: string, userId: string, newState: BattleState): void {
    const session = this.getSession(battleId, userId);
    if (!session) {
      throw new Error('BATTLE_NOT_FOUND');
    }

    session.state = newState;
    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + this.SESSION_EXPIRY_MS;
  }

  /**
   * Ends a battle session and cleans up
   */
  endSession(battleId: string): void {
    const session = this.sessions.get(battleId);
    if (session) {
      this.userBattles.delete(session.userId);
      this.sessions.delete(battleId);
    }
  }

  /**
   * Gets active battle for a user
   */
  getUserBattle(userId: string): BattleSession | null {
    const battleId = this.userBattles.get(userId);
    if (!battleId) return null;

    return this.getSession(battleId, userId);
  }

  /**
   * Cleans up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [battleId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(battleId);
      }
    }

    for (const battleId of expiredSessions) {
      this.endSession(battleId);
    }

    if (expiredSessions.length > 0) {
      console.log(`[BattleSessionManager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Gets session statistics (for monitoring)
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      activeUsers: this.userBattles.size,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}

// Singleton instance
export const battleSessionManager = new BattleSessionManager();