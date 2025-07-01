import { db } from "./db.js";
import { eq, and, desc, asc, sql, lt, gte } from "drizzle-orm";
import {
  users,
  monsters,
  userMonsters,
  questions,
  battles,
  inventory,
  aiTeams,
  abilities,
  monsterAbilities,
  type User,
  type Monster,
  type UserMonster,
  type Question,
  type Battle,
  type InventoryItem,
  type AiTeam,
  type Ability,
  type UpsertUser,
} from "../shared/schema.js";
import bcrypt from "bcrypt";

/**
 * Storage interface defines all database operations
 * This is the single source of truth for data access according to the Prime Directive
 */
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(username: string, email: string, passwordHash: string): Promise<User>;
  
  // Monster management
  getAllMonsters(): Promise<Monster[]>;
  getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]>;
  getMonsterAbilities(monsterId: number): Promise<any[]>;
  getMonsterLabData(userId: string): Promise<{ allMonsters: Monster[], userMonsters: (UserMonster & { monster: Monster })[] }>;
  
  // Learning system
  getQuestion(userId: string, subject: string, difficulty: number): Promise<Question | null>;
  saveQuestionResult(userId: string, questionId: number, isCorrect: boolean, goldReward: number): Promise<User>;
  
  // Battle system
  generateAiOpponent(playerTPL: number): Promise<any>;
  spendBattleToken(userId: string): Promise<User>;
  awardRankXp(userId: string, xp: number): Promise<User>;
  getUserBattleSlots(userId: string): Promise<number>;
}

/**
 * Database storage implementation - The Data Access Layer (DAL)
 * All database operations must go through this class according to the architectural mandate
 */
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createLocalUser(username: string, email: string, passwordHash: string): Promise<User> {
    const newUser = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      email,
      passwordHash,
      authProvider: 'local' as const,
      firstName: username,
      lastName: '',
      profileImageUrl: null,
      gold: 500,
      diamonds: 0,
      currentSubject: 'mixed',
      questionsAnswered: 0,
      correctAnswers: 0,
      currentStreak: 0,
      answeredQuestionIds: [],
      battleTokens: 5,
      battleTokensLastRefresh: new Date(),
      battleSlots: 2,
      rankPoints: 0,
      rank_xp: 0,
      storyProgress: 'Node_Start_01',
      player_tier: 1,
      subscriptionIntent: null,
      notificationEmail: null
    };

    const result = await db.insert(users).values(newUser).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      const updated = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updated[0];
    } else {
      const newUser = {
        ...userData,
        authProvider: 'replit' as const,
        gold: 500,
        diamonds: 0,
        currentSubject: 'mixed',
        questionsAnswered: 0,
        correctAnswers: 0,
        currentStreak: 0,
        answeredQuestionIds: [],
        battleTokens: 5,
        battleTokensLastRefresh: new Date(),
        battleSlots: 2,
        rankPoints: 0,
        rank_xp: 0,
        storyProgress: 'Node_Start_01',
        player_tier: 1,
        subscriptionIntent: null,
        notificationEmail: null
      };

      const result = await db.insert(users).values(newUser).returning();
      return result[0];
    }
  }

  async getAllMonsters(): Promise<Monster[]> {
    console.log("[storage] Attempting to fetch all monsters...");
    try {
      const result = await db.select().from(monsters).orderBy(asc(monsters.id));
      console.log("[storage] Successfully fetched all monsters.");
      return result;
    } catch (error) {
      console.error("[storage] Error fetching monsters:", error);
      throw error;
    }
  }

  async getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]> {
    console.log("[storage] Attempting to fetch user monsters...");
    try {
      const result = await db
        .select()
        .from(userMonsters)
        .innerJoin(monsters, eq(userMonsters.monsterId, monsters.id))
        .where(eq(userMonsters.userId, userId))
        .orderBy(asc(userMonsters.acquiredAt));
      
      console.log("[storage] Successfully fetched user monsters.");
      return result.map(row => ({
        ...row.user_monsters,
        monster: row.monsters
      }));
    } catch (error) {
      console.error("[storage] Error fetching user monsters:", error);
      throw error;
    }
  }

  async getMonsterAbilities(monsterId: number) {
    const result = await db
      .select({
        ability: abilities
      })
      .from(monsterAbilities)
      .innerJoin(abilities, eq(monsterAbilities.ability_id, abilities.id))
      .where(eq(monsterAbilities.monster_id, monsterId));
    
    return result.map(row => row.ability);
  }

  async getMonsterLabData(userId: string): Promise<{ allMonsters: Monster[], userMonsters: (UserMonster & { monster: Monster })[] }> {
    const [allMonsters, userMonsters] = await Promise.all([
      this.getAllMonsters(),
      this.getUserMonsters(userId)
    ]);

    return { allMonsters, userMonsters };
  }

  async getQuestion(userId: string, subject: string, difficulty: number): Promise<Question | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const answeredIds = Array.isArray(user.answeredQuestionIds) ? user.answeredQuestionIds : [];
    
    let query = db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.subject, subject),
          eq(questions.difficulty, difficulty)
        )
      );

    if (answeredIds.length > 0) {
      // Filter out already answered questions
      const result = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subject, subject),
            eq(questions.difficulty, difficulty),
            sql`${questions.id} NOT IN (${sql.join(answeredIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(1);
      return result[0] || null;
    }

    const result = await query.orderBy(sql`RANDOM()`).limit(1);
    return result[0] || null;
  }

  async saveQuestionResult(userId: string, questionId: number, isCorrect: boolean, goldReward: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const answeredIds = Array.isArray(user.answeredQuestionIds) ? user.answeredQuestionIds : [];
    const updatedAnsweredIds = [...answeredIds, questionId];

    const updates: Partial<User> = {
      answeredQuestionIds: updatedAnsweredIds,
      questionsAnswered: user.questionsAnswered + 1,
      gold: user.gold + goldReward
    };

    if (isCorrect) {
      updates.correctAnswers = user.correctAnswers + 1;
      updates.currentStreak = user.currentStreak + 1;
    } else {
      updates.currentStreak = 0;
    }

    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }

  async generateAiOpponent(tpl: number) {
    // Find AI teams within TPL range (±10%)
    const minTpl = Math.floor(tpl * 0.9);
    const maxTpl = Math.ceil(tpl * 1.1);
    
    const availableTeams = await db
      .select()
      .from(aiTeams)
      .where(
        and(
          gte(aiTeams.minTPL, minTpl),
          lt(aiTeams.maxTPL, maxTpl)
        )
      );

    if (availableTeams.length === 0) {
      // Fallback to closest team
      const fallbackTeams = await db
        .select()
        .from(aiTeams)
        .orderBy(sql`ABS(${aiTeams.minTPL} - ${tpl})`)
        .limit(1);
      
      return fallbackTeams[0] || null;
    }

    // Random selection from available teams
    const randomIndex = Math.floor(Math.random() * availableTeams.length);
    return availableTeams[randomIndex];
  }

  async spendBattleToken(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    if (user.battleTokens <= 0) {
      throw new Error('No battle tokens available');
    }

    const result = await db
      .update(users)
      .set({ battleTokens: user.battleTokens - 1 })
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }

  async awardRankXp(userId: string, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const result = await db
      .update(users)
      .set({ 
        rankPoints: user.rankPoints + xp,
        rank_xp: user.rank_xp + xp 
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0];
  }

  async getUserBattleSlots(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.battleSlots || 2;
  }
}

// Export the singleton instance according to the established pattern
export const storage = new DatabaseStorage();