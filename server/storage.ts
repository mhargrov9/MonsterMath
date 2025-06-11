import {
  users,
  monsters,
  userMonsters,
  questions,
  battles,
  type User,
  type UpsertUser,
  type Monster,
  type UserMonster,
  type Question,
  type Battle,
  type InsertMonster,
  type InsertUserMonster,
  type InsertQuestion,
  type InsertBattle,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCurrency(userId: string, goldDelta: number, diamondDelta?: number): Promise<User>;
  
  // Monster operations
  getAllMonsters(): Promise<Monster[]>;
  createMonster(monster: InsertMonster): Promise<Monster>;
  getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]>;
  purchaseMonster(userId: string, monsterId: number): Promise<UserMonster>;
  upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster>;
  
  // Question operations
  getRandomQuestion(subject: string, difficulty: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Battle operations
  getAvailableOpponents(userId: string): Promise<User[]>;
  createBattle(battle: InsertBattle): Promise<Battle>;
  getBattleHistory(userId: string): Promise<(Battle & { attacker: User; defender: User })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCurrency(userId: string, goldDelta: number, diamondDelta: number = 0): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        gold: sql`${users.gold} + ${goldDelta}`,
        diamonds: sql`${users.diamonds} + ${diamondDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Monster operations
  async getAllMonsters(): Promise<Monster[]> {
    return await db.select().from(monsters).orderBy(asc(monsters.goldCost));
  }

  async createMonster(monsterData: InsertMonster): Promise<Monster> {
    const [monster] = await db.insert(monsters).values(monsterData).returning();
    return monster;
  }

  async getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]> {
    return await db
      .select()
      .from(userMonsters)
      .innerJoin(monsters, eq(userMonsters.monsterId, monsters.id))
      .where(eq(userMonsters.userId, userId))
      .orderBy(desc(userMonsters.acquiredAt));
  }

  async purchaseMonster(userId: string, monsterId: number): Promise<UserMonster> {
    // Get monster details
    const [monster] = await db.select().from(monsters).where(eq(monsters.id, monsterId));
    if (!monster) {
      throw new Error("Monster not found");
    }

    // Get user to check currency
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error("User not found");
    }

    if (user.gold < monster.goldCost || user.diamonds < monster.diamondCost) {
      throw new Error("Insufficient currency");
    }

    // Create user monster with base stats
    const [userMonster] = await db
      .insert(userMonsters)
      .values({
        userId,
        monsterId,
        power: monster.basePower,
        speed: monster.baseSpeed,
        defense: monster.baseDefense,
      })
      .returning();

    // Deduct currency
    await this.updateUserCurrency(userId, -monster.goldCost, -monster.diamondCost);

    return userMonster;
  }

  async upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const upgradeCost = 200;

    // Check if user owns the monster
    const [userMonster] = await db
      .select()
      .from(userMonsters)
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));

    if (!userMonster) {
      throw new Error("Monster not found or not owned by user");
    }

    // Check if user has enough gold
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.gold < upgradeCost) {
      throw new Error("Insufficient gold");
    }

    // Upgrade monster stats (10% increase)
    const [upgraded] = await db
      .update(userMonsters)
      .set({
        level: userMonster.level + 1,
        power: Math.floor(userMonster.power * 1.1),
        speed: Math.floor(userMonster.speed * 1.1),
        defense: Math.floor(userMonster.defense * 1.1),
      })
      .where(eq(userMonsters.id, userMonsterId))
      .returning();

    // Deduct gold
    await this.updateUserCurrency(userId, -upgradeCost);

    return upgraded;
  }

  // Question operations
  async getRandomQuestion(subject: string, difficulty: number): Promise<Question | undefined> {
    const subjectFilter = subject === "mixed" ? sql`true` : eq(questions.subject, subject);
    const [question] = await db
      .select()
      .from(questions)
      .where(and(subjectFilter, eq(questions.difficulty, difficulty)))
      .orderBy(sql`random()`)
      .limit(1);
    return question;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  // Battle operations
  async getAvailableOpponents(userId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(ne(users.id, userId))
      .limit(10);
  }

  async createBattle(battleData: InsertBattle): Promise<Battle> {
    const [battle] = await db.insert(battles).values(battleData).returning();
    return battle;
  }

  async getBattleHistory(userId: string): Promise<(Battle & { attacker: User; defender: User })[]> {
    return await db
      .select({
        ...battles,
        attacker: users,
        defender: users,
      })
      .from(battles)
      .leftJoin(users, eq(battles.attackerId, users.id))
      .leftJoin(users, eq(battles.defenderId, users.id))
      .where(sql`${battles.attackerId} = ${userId} OR ${battles.defenderId} = ${userId}`)
      .orderBy(desc(battles.battleAt))
      .limit(10) as any;
  }
}

export const storage = new DatabaseStorage();
