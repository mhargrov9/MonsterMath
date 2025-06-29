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
import { eq, and, ne, sql, desc, asc, lte, gt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(username: string, email: string, passwordHash: string): Promise<User>;

  // Monster operations
  getAllMonsters(): Promise<Monster[]>;
  getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]>;
  getMonsterAbilities(monsterId: number): Promise<any[]>;

  // New combined data fetcher
  getMonsterLabData(userId: string): Promise<{ allMonsters: Monster[], userMonsters: (UserMonster & { monster: Monster })[] }>;

  // Other operations...
  generateAiOpponent(playerTPL: number): Promise<any>;
  spendBattleToken(userId: string): Promise<User>;
  awardRankXp(userId: string, xp: number): Promise<User>;
  getUserBattleSlots(userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
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
    // *** THIS IS THE FIX ***
    // We are changing from parallel to sequential execution to isolate the crash.
    console.log("[storage] Attempting to fetch all monsters...");
    const allMonsters = await this.getAllMonsters();
    console.log("[storage] Successfully fetched all monsters.");

    console.log("[storage] Attempting to fetch user monsters...");
    const userMonsters = await this.getUserMonsters(userId);
    console.log("[storage] Successfully fetched user monsters.");

    return { allMonsters, userMonsters };
  }

  async generateAiOpponent(tpl: number) {
    let monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, true));
    if (monsterPool.length === 0) {
      throw new Error("There are no starter monsters in the database to generate a team.");
    }
    const actualTeamSize = Math.min(3, monsterPool.length);
    const teamMonsters = [...monsterPool].sort(() => 0.5 - Math.random()).slice(0, actualTeamSize);

    const scaledMonstersWithAbilities = await Promise.all(teamMonsters.map(async (monster) => {
      const monsterAbilities = await this.getMonsterAbilities(monster.id);
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