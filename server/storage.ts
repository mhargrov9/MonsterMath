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
} from "@shared/schema";

import { db } from "./db";
import { eq, and, ne, sql, desc, asc, lte, gt } from "drizzle-orm";

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

  // NEW: Player Rank operations
  awardRankXp(userId: string, xp: number): Promise<User>;
  getUserRank(userId: string): Promise<{ currentRank: Rank | null, nextRank: Rank | null, userXp: number }>;

  // AI Trainer operations
  getAllAiTrainers(): Promise<AiTeam[]>;
  createAiTrainer(trainer: InsertAiTeam): Promise<AiTeam>;
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
    const [user] = await db.insert(users).values({ id: userId, username, email, passwordHash, authProvider: 'local', gold: 500, diamonds: 0 }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({ target: users.id, set: { ...userData, updatedAt: new Date() } }).returning();
    return user;
  }

  async updateUserCurrency(userId: string, goldDelta: number, diamondDelta: number = 0): Promise<User> {
    const [user] = await db.update(users).set({ gold: sql`${users.gold} + ${goldDelta}`, diamonds: sql`${users.diamonds} + ${diamondDelta}` }).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserBattleTokens(userId: string, tokenDelta: number): Promise<User> {
    const [user] = await db.update(users).set({ battleTokens: sql`${users.battleTokens} + ${tokenDelta}` }).where(eq(users.id, userId)).returning();
    return user;
  }

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

  async applyMonsterUpgrade(userId: string, userMonsterId: number, upgradeKey: string, upgradeValue: string, statBoosts: { power?: number; speed?: number; defense?: number; }, goldCost: number, diamondCost: number): Promise<UserMonster> {
    const [userMonster] = await db.select().from(userMonsters).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));
    if (!userMonster) throw new Error("Monster not found");
    await this.updateUserCurrency(userId, -goldCost, -diamondCost);
    const currentChoices = (userMonster.upgradeChoices as Record<string, any>) || {};
    const newChoices = { ...currentChoices, [upgradeKey]: upgradeValue };
    const newPower = userMonster.power + (statBoosts.power || 0);
    const newSpeed = userMonster.speed + (statBoosts.speed || 0);
    const newDefense = userMonster.defense + (statBoosts.defense || 0);
    const [upgraded] = await db.update(userMonsters).set({ power: newPower, speed: newSpeed, defense: newDefense, upgradeChoices: newChoices, experience: userMonster.experience + 50 }).where(eq(userMonsters.id, userMonsterId)).returning();
    return upgraded;
  }

  async updateMonsterStats(userId: string, userMonsterId: number, hp: number, mp: number): Promise<UserMonster> {
    const [updated] = await db.update(userMonsters).set({ hp: hp, mp: mp, isShattered: hp <= 0 }).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId))).returning();
    if (!updated) throw new Error("Monster not found");
    return updated;
  }

  async shatterMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const [updated] = await db.update(userMonsters).set({ hp: 0, isShattered: true }).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId))).returning();
    if (!updated) throw new Error("Monster not found or not owned by user");
    return updated;
  }

  async repairMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const userMonstersWithBase = await db.select().from(userMonsters).leftJoin(monsters, eq(userMonsters.monsterId, monsters.id)).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));
    if (userMonstersWithBase.length === 0) throw new Error("Monster not found or not owned by user");
    const { user_monsters: userMonster, monsters: monster } = userMonstersWithBase[0];
    const maxHp = userMonster.maxHp || monster?.baseHp || 400;
    const [updated] = await db.update(userMonsters).set({ hp: maxHp, isShattered: false }).where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId))).returning();
    if (!updated) throw new Error("Monster not found or not owned by user");
    return updated;
  }

  async getMonsterAbilities(monsterId: number) {
    console.log(`[DEBUG] Fetching abilities for monsterId: ${monsterId}`);
    try {
      const result = await db.select().from(abilities).innerJoin(monsterAbilities, eq(abilities.id, monsterAbilities.ability_id)).where(eq(monsterAbilities.monster_id, monsterId));

      console.log(`[DEBUG] Raw DB result for monsterId ${monsterId}:`, result);

      const processedAbilities = result.map(({ abilities, monster_abilities }) => ({ ...abilities, affinity: monster_abilities.override_affinity || abilities.affinity }));

      console.log(`[DEBUG] Processed abilities for monsterId ${monsterId}:`, processedAbilities);

      return processedAbilities;
    } catch (error) {
      console.error('Database error in getMonsterAbilities:', error);
      throw error;
    }
  }

  async getRandomQuestion(subject: string, difficulty: number, userId?: string): Promise<Question | undefined> {
    const subjectFilter = subject === "mixed" ? sql`true` : eq(questions.subject, subject);
    let excludeFilter = sql`true`;
    if (userId) {
      const user = await this.getUser(userId);
      if (user && user.answeredQuestionIds) {
        const answeredIds = user.answeredQuestionIds as number[];
        if (answeredIds.length > 0) {
          excludeFilter = sql`${questions.id} NOT IN (${sql.join(answeredIds.map(id => sql`${id}`), sql`, `)})`;
        }
      }
    }
    const [question] = await db.select().from(questions).where(and(subjectFilter, eq(questions.difficulty, difficulty), excludeFilter)).orderBy(sql`random()`).limit(1);
    return question;
  }

  async markQuestionAnswered(userId: string, questionId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    const currentAnswered = ((user as any).answeredQuestionIds as number[]) || [];
    if (!currentAnswered.includes(questionId)) {
      const updatedAnswered = [...currentAnswered, questionId];
      await db.update(users).set({ answeredQuestionIds: updatedAnswered } as any).where(eq(users.id, userId));
    }
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  async getAvailableOpponents(userId: string): Promise<User[]> {
    return await db.select().from(users).where(ne(users.id, userId)).limit(10);
  }

  async createBattle(battleData: InsertBattle): Promise<Battle> {
    const [battle] = await db.insert(battles).values(battleData).returning();
    return battle;
  }

  async getBattleHistory(userId: string): Promise<(Battle & { attacker: User; defender: User })[]> {
    // This function needs more complex logic to join users table twice, which is complex in Drizzle.
    // Returning as-is for now.
    const results = await db.select().from(battles).where(sql`${battles.attackerId} = ${userId} OR ${battles.defenderId} = ${userId}`).orderBy(desc(battles.battleAt)).limit(10);
    return results as any;
  }

  async getUserInventory(userId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventory).where(eq(inventory.userId, userId)).orderBy(asc(inventory.itemName));
  }

  async addInventoryItem(userId: string, item: InsertInventoryItem): Promise<InventoryItem> {
    const existing = await this.getInventoryItem(userId, item.itemName);
    if (existing) {
      return await this.updateInventoryQuantity(userId, item.itemName, item.quantity || 1);
    }
    const [newItem] = await db.insert(inventory).values({ ...item, userId }).returning();
    return newItem;
  }

  async updateInventoryQuantity(userId: string, itemName: string, quantityDelta: number): Promise<InventoryItem> {
    const existing = await this.getInventoryItem(userId, itemName);
    if (!existing) throw new Error("Item not found in inventory");
    const newQuantity = existing.quantity + quantityDelta;
    if (newQuantity <= 0) {
      await this.removeInventoryItem(userId, itemName);
      throw new Error("Item removed from inventory");
    }
    const [updated] = await db.update(inventory).set({ quantity: newQuantity }).where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName))).returning();
    return updated;
  }

  async removeInventoryItem(userId: string, itemName: string): Promise<void> {
    await db.delete(inventory).where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName)));
  }

  async getInventoryItem(userId: string, itemName: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventory).where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName)));
    return item;
  }

  async updateStoryProgress(userId: string, storyNode: string): Promise<User> {
    const [updated] = await db.update(users).set({ storyProgress: storyNode, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getStoryProgress(userId: string): Promise<string> {
    const [user] = await db.select({ storyProgress: users.storyProgress }).from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    return user.storyProgress || "Node_Start_01";
  }

  async getAllAiTeams(): Promise<AiTeam[]> {
    return await db.select().from(aiTeams).orderBy(asc(aiTeams.name));
  }

  async createAiTeam(teamData: InsertAiTeam): Promise<AiTeam> {
    const [team] = await db.insert(aiTeams).values(teamData).returning();
    return team;
  }

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
    return { name: "AI Challenger", scaledMonsters, tpl };
  }

  async getUserBattleSlots(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.battleSlots || 3;
  }

  async updateUserBattleSlots(userId: string, slots: number): Promise<User> {
    const [updated] = await db.update(users).set({ battleSlots: slots }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async purchaseBattleSlot(userId: string): Promise<{ user: User; cost: number; }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const currentSlots = user.battleSlots || 3;
    const cost = 100 * Math.pow(2, currentSlots - 3);
    if (user.gold < cost) throw new Error("Insufficient gold");
    const [updated] = await db.update(users).set({ gold: user.gold - cost, battleSlots: currentSlots + 1, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return { user: updated, cost };
  }

  async recordSubscriptionIntent(userId: string, intent: "monthly" | "yearly"): Promise<User> {
    const [updated] = await db.update(users).set({ subscriptionIntent: intent, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async recordNotificationEmail(userId: string, email: string): Promise<User> {
    const [updated] = await db.update(users).set({ notificationEmail: email, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async refreshBattleTokens(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const now = new Date();
    const lastRefresh = new Date(user.battleTokensLastRefresh);
    const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRefresh >= 24) {
      const [updatedUser] = await db.update(users).set({ battleTokens: 5, battleTokensLastRefresh: now }).where(eq(users.id, userId)).returning();
      return updatedUser;
    }
    return user;
  }

  async spendBattleToken(userId: string): Promise<User> {
    const user = await this.refreshBattleTokens(userId);
    if (user.battleTokens <= 0) throw new Error("NO_BATTLE_TOKENS");
    const [updatedUser] = await db.update(users).set({ battleTokens: user.battleTokens - 1 }).where(eq(users.id, userId)).returning();
    return updatedUser;
  }

  async updateUserRankPoints(userId: string, rpDelta: number): Promise<User> {
    const [updated] = await db.update(users).set({ rankPoints: sql`${users.rankPoints} + ${rpDelta}` }).where(eq(users.id, userId)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  // NEW: Award Rank XP to a user
  async awardRankXp(userId: string, xp: number): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ rank_xp: sql`${users.rank_xp} + ${xp}` })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  // NEW: Get a user's current rank details
  async getUserRank(userId: string): Promise<{ currentRank: Rank | null, nextRank: Rank | null, userXp: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const userXp = user.rank_xp;

    // Get the highest rank the user has achieved
    const [currentRank] = await db
      .select()
      .from(ranks)
      .where(lte(ranks.xp_required, userXp))
      .orderBy(desc(ranks.xp_required))
      .limit(1);

    // Get the next rank the user can achieve
    const [nextRank] = await db
      .select()
      .from(ranks)
      .where(gt(ranks.xp_required, userXp))
      .orderBy(asc(ranks.xp_required))
      .limit(1);

    return {
      currentRank: currentRank || null,
      nextRank: nextRank || null,
      userXp: userXp,
    };
  }

  async getAllAiTrainers(): Promise<AiTeam[]> {
    // This had a bug, referencing a column that doesn't exist. Removing the where clause.
    return await db.select().from(aiTeams).orderBy(asc(aiTeams.name));
  }

  async createAiTrainer(trainerData: InsertAiTeam): Promise<AiTeam> {
    const [trainer] = await db.insert(aiTeams).values({ ...trainerData }).returning();
    return trainer;
  }
}

export const storage = new DatabaseStorage();