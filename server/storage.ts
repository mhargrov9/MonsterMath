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
  ranks,
  type User,
  type Rank,
  type UpsertUser,
  type Monster,
  type UserMonster,
  type Question,
  type Battle,
  type InventoryItem,
  type AiTeam,
  type InsertMonster,
  type InsertUserMonster,
  type InsertQuestion,
  type InsertBattle,
  type InsertInventoryItem,
  type InsertAiTeam,
} from "../shared/schema";

import { db } from "./db";
import { eq, and, ne, sql, desc, asc, lte, gt, notInArray } from "drizzle-orm";

export interface IStorage {
  // ... (other interface methods)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(username: string, email: string, passwordHash: string): Promise<User>;
  getAllMonsters(): Promise<Monster[]>;
  getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]>;
  getMonsterAbilities(monsterId: number): Promise<any[]>;
  getMonsterLabData(userId: string): Promise<{ allMonsters: Monster[], userMonsters: (UserMonster & { monster: Monster })[] }>;
  getQuestion(userId: string, subject: string, difficulty: number): Promise<Question | null>;
  saveQuestionResult(userId: string, questionId: number, isCorrect: boolean, goldReward: number): Promise<User>;
  generateAiOpponent(playerTPL: number): Promise<any>;
  spendBattleToken(userId: string): Promise<User>;
  awardRankXp(userId: string, xp: number): Promise<User>;
  getUserBattleSlots(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // ... (other storage methods)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createLocalUser(username: string, email: string, passwordHash: string): Promise<User> {
    const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db.insert(users).values({ id: userId, username, email, passwordHash, authProvider: 'local' }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({ target: users.id, set: { ...userData, updatedAt: new Date() } }).returning();
    return user;
  }

  async getAllMonsters(): Promise<Monster[]> {
    return await db.select().from(monsters).orderBy(asc(monsters.goldCost));
  }

  async getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]> {
    const results = await db.select().from(userMonsters).innerJoin(monsters, eq(userMonsters.monsterId, monsters.id)).where(eq(userMonsters.userId, userId)).orderBy(desc(userMonsters.acquiredAt));
    return results.map(r => ({ ...r.user_monsters, monster: r.monsters }));
  }

  async getMonsterAbilities(monsterId: number) {
    const result = await db.select().from(abilities).innerJoin(monsterAbilities, eq(abilities.id, monsterAbilities.ability_id)).where(eq(monsterAbilities.monster_id, monsterId));
    return result.map(({ abilities, monster_abilities }) => ({ ...abilities, affinity: monster_abilities.override_affinity || abilities.affinity }));
  }

  async getMonsterLabData(userId: string): Promise<{ allMonsters: Monster[], userMonsters: (UserMonster & { monster: Monster })[] }> {
    console.log("[storage] Attempting to fetch all monsters...");
    const baseMonsters = await this.getAllMonsters();
    console.log("[storage] Successfully fetched all monsters.");

    console.log("[storage] Attempting to fetch user monsters...");
    const userMonstersData = await this.getUserMonsters(userId);
    console.log("[storage] Successfully fetched user monsters.");

    // --- THIS IS THE FIX ---
    // Fetch abilities for all monsters and attach them.
    const allMonstersWithAbilities = await Promise.all(
        baseMonsters.map(async (monster) => {
            const abilities = await this.getMonsterAbilities(monster.id as number);
            return { ...monster, abilities };
        })
    );

    const userMonstersWithAbilities = await Promise.all(
        userMonstersData.map(async (userMonster) => {
            const abilities = await this.getMonsterAbilities(userMonster.monsterId);
            return { ...userMonster, monster: { ...userMonster.monster, abilities } };
        })
    );

    return { allMonsters: allMonstersWithAbilities, userMonsters: userMonstersWithAbilities };
  }

  async getQuestion(userId: string, subject: string, difficulty: number): Promise<Question | null> {
    const user = await this.getUser(userId);
    const answeredIds = user?.answeredQuestionIds as number[] || [];

    let query = db.select().from(questions).where(
      and(
        eq(questions.difficulty, difficulty),
        answeredIds.length > 0 ? notInArray(questions.id, answeredIds) : undefined
      )
    ).orderBy(sql`RANDOM()`).limit(1);

    if (subject !== 'mixed') {
        query = db.select().from(questions).where(
            and(
                eq(questions.subject, subject),
                eq(questions.difficulty, difficulty),
                answeredIds.length > 0 ? notInArray(questions.id, answeredIds) : undefined
            )
        ).orderBy(sql`RANDOM()`).limit(1);
    }

    const [question] = await query;
    return question || null;
  }

  async saveQuestionResult(userId: string, questionId: number, isCorrect: boolean, goldReward: number): Promise<User> {
      const user = await this.getUser(userId);
      if (!user) throw new Error("User not found");

      const answeredQuestionIds = [...(user.answeredQuestionIds as number[]), questionId];
      let gold = user.gold;
      let correctAnswers = user.correctAnswers;

      if(isCorrect) {
          gold += goldReward;
          correctAnswers += 1;
      }

      const [updatedUser] = await db.update(users).set({
          answeredQuestionIds,
          gold,
          correctAnswers,
          questionsAnswered: (user.questionsAnswered || 0) + 1,
      }).where(eq(users.id, userId)).returning();

      return updatedUser;
  }

  async generateAiOpponent(tpl: number) {
    let monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, true));
    if (monsterPool.length === 0) {
      throw new Error("There are no starter monsters in the database to generate a team.");
    }
    const actualTeamSize = Math.min(3, monsterPool.length);
    const teamMonsters = [...monsterPool].sort(() => 0.5 - Math.random()).slice(0, actualTeamSize);

    const scaledMonstersWithAbilities = await Promise.all(teamMonsters.map(async (monster) => {
      const monsterAbilities = await this.getMonsterAbilities(monster.id as number);
      return { ...monster, hp: monster.baseHp, maxHp: monster.baseHp, mp: monster.baseMp, maxMp: monster.baseMp, abilities: monsterAbilities };
    }));

    return { name: "AI Challenger", scaledMonsters: scaledMonstersWithAbilities };
  }

  async spendBattleToken(userId: string): Promise<User> {
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user[0] || user[0].battleTokens <= 0) throw new Error("NO_BATTLE_TOKENS");
    const [updatedUser] = await db.update(users).set({ battleTokens: user[0].battleTokens - 1 }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async awardRankXp(userId: string, xp: number): Promise<User> {
    const [updated] = await db.update(users).set({ rank_xp: sql`${users.rank_xp} + ${xp}` }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getUserBattleSlots(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.battleSlots || 3;
  }
}

export const storage = new DatabaseStorage();