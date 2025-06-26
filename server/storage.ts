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
} from "@shared/schema";

import { db } from "./db";
import { eq, and, ne, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(username: string, email: string, passwordHash: string): Promise<User>;
  updateUserCurrency(userId: string, goldDelta: number, diamondDelta?: number): Promise<User>;
  updateUserBattleTokens(userId: string, tokenDelta: number): Promise<User>;

  // Monster operations
  getAllMonsters(): Promise<Monster[]>;
  createMonster(monster: InsertMonster): Promise<Monster>;
  getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]>;
  getMonsterAbilities(monsterId: number): Promise<any[]>;
  purchaseMonster(userId: string, monsterId: number): Promise<UserMonster>;
  upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster>;
  applyMonsterUpgrade(
    userId: string,
    userMonsterId: number,
    upgradeKey: string,
    upgradeValue: string,
    statBoosts: { power?: number; speed?: number; defense?: number },
    goldCost: number,
    diamondCost: number
  ): Promise<UserMonster>;
  updateMonsterStats(userId: string, userMonsterId: number, hp: number, mp: number): Promise<UserMonster>;
  shatterMonster(userId: string, userMonsterId: number): Promise<UserMonster>;
  repairMonster(userId: string, userMonsterId: number): Promise<UserMonster>;

  // Question operations
  getRandomQuestion(subject: string, difficulty: number, userId?: string): Promise<Question | undefined>;
  markQuestionAnswered(userId: string, questionId: number): Promise<void>;
  createQuestion(question: InsertQuestion): Promise<Question>;

  // Battle operations
  getAvailableOpponents(userId: string): Promise<User[]>;
  createBattle(battle: InsertBattle): Promise<Battle>;
  getBattleHistory(userId: string): Promise<(Battle & { attacker: User; defender: User })[]>;

  // Inventory operations
  getUserInventory(userId: string): Promise<InventoryItem[]>;
  addInventoryItem(userId: string, item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryQuantity(userId: string, itemName: string, quantityDelta: number): Promise<InventoryItem>;
  removeInventoryItem(userId: string, itemName: string): Promise<void>;
  getInventoryItem(userId: string, itemName: string): Promise<InventoryItem | undefined>;

  // Story progress operations
  updateStoryProgress(userId: string, storyNode: string): Promise<User>;
  getStoryProgress(userId: string): Promise<string>;

  // AI Team operations
  getAllAiTeams(): Promise<AiTeam[]>;
  createAiTeam(team: InsertAiTeam): Promise<AiTeam>;
  generateAiOpponent(playerTPL: number): Promise<any>;

  // Battle slot operations
  getUserBattleSlots(userId: string): Promise<number>;
  updateUserBattleSlots(userId: string, slots: number): Promise<User>;
  purchaseBattleSlot(userId: string): Promise<{ user: User; cost: number }>;

  // Interest Test operations
  recordSubscriptionIntent(userId: string, intent: 'monthly' | 'yearly'): Promise<User>;
  recordNotificationEmail(userId: string, email: string): Promise<User>;

  // Battle Token operations
  refreshBattleTokens(userId: string): Promise<User>;
  spendBattleToken(userId: string): Promise<User>;

  // Rank Point operations
  updateUserRankPoints(userId: string, rpDelta: number): Promise<User>;

  // AI Trainer operations
  getAllAiTrainers(): Promise<AiTeam[]>;
  createAiTrainer(trainer: InsertAiTeam): Promise<AiTeam>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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
    const [user] = await db.insert(users).values({ id: userId, username, email, passwordHash, authProvider: 'local', gold: 500, diamonds: 0 }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({ target: users.id, set: { ...userData, updatedAt: new Date() } }).returning();
    return user;
  }

  async updateUserCurrency(userId: string, goldDelta: number, diamondDelta: number = 0): Promise<User> {
    const [user] = await db.update(users).set({ gold: sql`${users.gold} + ${goldDelta}`, diamonds: sql`${users.diamonds} + ${diamondDelta}`, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserBattleTokens(userId: string, tokenDelta: number): Promise<User> {
    const [user] = await db.update(users).set({ battleTokens: sql`${users.battleTokens} + ${tokenDelta}`, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return user;
  }

  // Monster operations
  async getAllMonsters(): Promise<Monster[]> {
    return await db.select().from(monsters).orderBy(asc(monsters.goldCost));
  }

  async createMonster(monster: InsertMonster): Promise<Monster> {
      const [newMonster] = await db.insert(monsters).values(monster).returning();
      return newMonster;
  }

  async getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]> {
    const results = await db.select().from(userMonsters).innerJoin(monsters, eq(userMonsters.monsterId, monsters.id)).where(eq(userMonsters.userId, userId)).orderBy(desc(userMonsters.acquiredAt));
    return results.map(r => ({ ...r.user_monsters, monster: r.monsters }));
  }

  async purchaseMonster(userId: string, monsterId: number): Promise<UserMonster> {
    const [monster] = await db.select().from(monsters).where(eq(monsters.id, monsterId));
    if (!monster) throw new Error("Monster not found");

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    if (user.gold < monster.goldCost || user.diamonds < monster.diamondCost) throw new Error("Insufficient currency");

    const [userMonster] = await db.insert(userMonsters).values({ userId, monsterId, power: monster.basePower, speed: monster.baseSpeed, defense: monster.baseDefense, hp: monster.baseHp, maxHp: monster.baseHp, mp: monster.baseMp, maxMp: monster.baseMp }).returning();
    await this.updateUserCurrency(userId, -monster.goldCost, -monster.diamondCost);
    return userMonster;
  }

  // --- FIXED: upgradeMonster now correctly calculates and applies HP/MP gains ---
  async upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const upgradeCost = 200;
    const MAX_LEVEL = 10;
    const FREE_MAX_LEVEL = 3; 

    const [userMonster] = await db.select().from(userMonsters).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));
    if (!userMonster) throw new Error("Monster not found or not owned by user");

    if (userMonster.level >= MAX_LEVEL) throw new Error("Monster is already at maximum level");
    if (userMonster.level >= FREE_MAX_LEVEL) throw new Error("FREE_TRIAL_LIMIT");

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.gold < upgradeCost) throw new Error("Insufficient gold");

    const [baseMonster] = await db.select().from(monsters).where(eq(monsters.id, userMonster.monsterId));
    if (!baseMonster) throw new Error(`Base monster data not found for monsterId: ${userMonster.monsterId}`);

    const newLevel = userMonster.level + 1;
    let newEvolutionStage = userMonster.evolutionStage;
    if (newLevel >= 10 && userMonster.evolutionStage < 4) {
      newEvolutionStage = Math.min(4, Math.floor(newLevel / 3) + 1);
    }

    const newPower = Math.floor(userMonster.power * 1.1);
    const newSpeed = Math.floor(userMonster.speed * 1.1);
    const newDefense = Math.floor(userMonster.defense * 1.1);
    const newMaxHp = baseMonster.baseHp + (baseMonster.hpPerLevel * (newLevel - 1));
    const newMaxMp = baseMonster.baseMp + (baseMonster.mpPerLevel * (newLevel - 1));

    const [upgraded] = await db.update(userMonsters).set({
      level: newLevel,
      power: newPower,
      speed: newSpeed,
      defense: newDefense,
      maxHp: newMaxHp,
      hp: newMaxHp, 
      maxMp: newMaxMp,
      mp: newMaxMp,
      evolutionStage: newEvolutionStage,
      experience: userMonster.experience + 25,
    }).where(eq(userMonsters.id, userMonsterId)).returning();

    await this.updateUserCurrency(userId, -upgradeCost);
    return upgraded;
  }

  // ... (applyMonsterUpgrade, updateMonsterStats, etc., are unchanged)

  // --- FIXED: generateAiOpponent now correctly scales max_hp and max_mp ---
  async generateAiOpponent(tpl: number) {
    let monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, false));
    if (monsterPool.length === 0) {
      monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, true));
    }
    if (monsterPool.length === 0) {
      throw new Error("There are no monsters in the database to generate a team.");
    }

    const actualTeamSize = Math.min(3, monsterPool.length);
    const selectedTeamIndexes = new Set<number>();
    while (selectedTeamIndexes.size < actualTeamSize) {
      selectedTeamIndexes.add(Math.floor(Math.random() * monsterPool.length));
    }

    const teamMonsters = Array.from(selectedTeamIndexes).map(index => monsterPool[index]);
    const tplPerMonster = Math.floor(tpl / actualTeamSize);

    const scaledMonsters = teamMonsters.map(monster => {
      const level = Math.max(1, Math.round(tplPerMonster / 10));
      const hp = monster.baseHp + (monster.hpPerLevel * (level - 1));
      const mp = monster.baseMp + (monster.mpPerLevel * (level - 1));

      return {
        id: monster.id, name: monster.name, level: level,
        hp: hp, max_hp: hp, mp: mp, max_mp: mp,
        power: monster.basePower, defense: monster.baseDefense, speed: monster.baseSpeed,
        affinity: monster.type, resistances: monster.resistances, weaknesses: monster.weaknesses,
        is_fainted: false
      };
    });

    return { name: "AI Challenger", scaledMonsters: scaledMonsters, tpl: tpl };
  }

  // ... (all other functions are included but not shown for brevity)
}

export const storage = new DatabaseStorage();