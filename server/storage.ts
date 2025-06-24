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
  getMonsterAbilities(monsterId: number): Promise<any[]>;

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
  generateAiOpponent(playerTPL: number): Promise<{
    team: AiTeam;
    scaledMonsters: Array<{
      monster: Monster;
      level: number;
      hp: number;
      mp: number;
    }>;
  }>;

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
    const [user] = await db.select({
      id: users.id, email: users.email, username: users.username, passwordHash: users.passwordHash,
      firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl,
      authProvider: users.authProvider, gold: users.gold, diamonds: users.diamonds,
      currentSubject: users.currentSubject, questionsAnswered: users.questionsAnswered,
      correctAnswers: users.correctAnswers, currentStreak: users.currentStreak,
      answeredQuestionIds: users.answeredQuestionIds, battleTokens: users.battleTokens,
      battleTokensLastRefresh: users.battleTokensLastRefresh, battleSlots: users.battleSlots,
      rankPoints: users.rankPoints, storyProgress: users.storyProgress, createdAt: users.createdAt,
      updatedAt: users.updatedAt, subscriptionIntent: users.subscriptionIntent,
      notificationEmail: users.notificationEmail
    }).from(users).where(eq(users.id, id));

    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id, email: users.email, username: users.username, passwordHash: users.passwordHash,
      firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl,
      authProvider: users.authProvider, gold: users.gold, diamonds: users.diamonds,
      currentSubject: users.currentSubject, questionsAnswered: users.questionsAnswered,
      correctAnswers: users.correctAnswers, currentStreak: users.currentStreak,
      answeredQuestionIds: users.answeredQuestionIds, battleTokens: users.battleTokens,
      battleTokensLastRefresh: users.battleTokensLastRefresh, battleSlots: users.battleSlots,
      rankPoints: users.rankPoints, storyProgress: users.storyProgress, createdAt: users.createdAt,
      updatedAt: users.updatedAt, subscriptionIntent: users.subscriptionIntent,
      notificationEmail: users.notificationEmail
    }).from(users).where(eq(users.username, username));

    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id, email: users.email, username: users.username, passwordHash: users.passwordHash,
      firstName: users.firstName, lastName: users.lastName, profileImageUrl: users.profileImageUrl,
      authProvider: users.authProvider, gold: users.gold, diamonds: users.diamonds,
      currentSubject: users.currentSubject, questionsAnswered: users.questionsAnswered,
      correctAnswers: users.correctAnswers, currentStreak: users.currentStreak,
      answeredQuestionIds: users.answeredQuestionIds, battleTokens: users.battleTokens,
      battleTokensLastRefresh: users.battleTokensLastRefresh, battleSlots: users.battleSlots,
      rankPoints: users.rankPoints, storyProgress: users.storyProgress, createdAt: users.createdAt,
      updatedAt: users.updatedAt, subscriptionIntent: users.subscriptionIntent,
      notificationEmail: users.notificationEmail
    }).from(users).where(eq(users.email, email));

    return user;
  }

  async createLocalUser(username: string, email: string, passwordHash: string): Promise<User> {
    const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username,
        email,
        passwordHash,
        authProvider: 'local',
        gold: 500,
        diamonds: 0,
      })
      .returning();

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
        correctAnswers: sql`${users.correctAnswers} + 1`,
        questionsAnswered: sql`${users.questionsAnswered} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async updateUserBattleTokens(userId: string, tokenDelta: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        battleTokens: sql`${users.battleTokens} + ${tokenDelta}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  // Monster operations
  async getAllMonsters(): Promise<Monster[]> {
    return await db.select({
      id: monsters.id,
      name: monsters.name,
      type: monsters.type,
      basePower: monsters.basePower,
      baseSpeed: monsters.baseSpeed,
      baseDefense: monsters.baseDefense,
      baseHp: monsters.baseHp,
      baseMp: monsters.baseMp,
      hpPerLevel: monsters.hpPerLevel,
      mpPerLevel: monsters.mpPerLevel,
      goldCost: monsters.goldCost,
      diamondCost: monsters.diamondCost,
      description: monsters.description,
      iconClass: monsters.iconClass,
      gradient: monsters.gradient,
      resistances: monsters.resistances,
      weaknesses: monsters.weaknesses,
      levelUpgrades: monsters.levelUpgrades,
      starterSet: monsters.starterSet,
    }).from(monsters).orderBy(asc(monsters.goldCost));
  }

  async getUserMonsters(userId: string): Promise<(UserMonster & { monster: Monster })[]> {
    const results = await db
      .select({
        id: userMonsters.id,
        userId: userMonsters.userId,
        monsterId: userMonsters.monsterId,
        level: userMonsters.level,
        power: userMonsters.power,
        speed: userMonsters.speed,
        defense: userMonsters.defense,
        experience: userMonsters.experience,
        evolutionStage: userMonsters.evolutionStage,
        upgradeChoices: userMonsters.upgradeChoices,
        hp: userMonsters.hp,
        maxHp: userMonsters.maxHp,
        mp: userMonsters.mp,
        maxMp: userMonsters.maxMp,
        isShattered: userMonsters.isShattered,
        acquiredAt: userMonsters.acquiredAt,
        monster: {
          id: monsters.id,
          name: monsters.name,
          type: monsters.type,
          basePower: monsters.basePower,
          baseSpeed: monsters.baseSpeed,
          baseDefense: monsters.baseDefense,
          baseHp: monsters.baseHp,
          baseMp: monsters.baseMp,
          goldCost: monsters.goldCost,
          diamondCost: monsters.diamondCost,
          description: monsters.description,
          iconClass: monsters.iconClass,
          gradient: monsters.gradient,
          resistances: monsters.resistances,
          weaknesses: monsters.weaknesses,
          levelUpgrades: monsters.levelUpgrades,
        }
      })
      .from(userMonsters)
      .innerJoin(monsters, eq(userMonsters.monsterId, monsters.id))
      .where(eq(userMonsters.userId, userId))
      .orderBy(desc(userMonsters.acquiredAt));

    return results as (UserMonster & { monster: Monster })[];
  }

  async purchaseMonster(userId: string, monsterId: number): Promise<UserMonster> {
    // Get monster details
    const [monster] = await db.select({
      id: monsters.id,
      name: monsters.name,
      type: monsters.type,
      basePower: monsters.basePower,
      baseSpeed: monsters.baseSpeed,
      baseDefense: monsters.baseDefense,
      baseHp: monsters.baseHp,
      baseMp: monsters.baseMp,
      hpPerLevel: monsters.hpPerLevel,
      mpPerLevel: monsters.mpPerLevel,
      goldCost: monsters.goldCost,
      diamondCost: monsters.diamondCost,
      description: monsters.description,
      iconClass: monsters.iconClass,
      gradient: monsters.gradient,
      resistances: monsters.resistances,
      weaknesses: monsters.weaknesses,
      levelUpgrades: monsters.levelUpgrades,
      starterSet: monsters.starterSet,
    }).from(monsters).where(eq(monsters.id, monsterId));

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

    // Create user monster with base stats and initialize HP/MP
    const [userMonster] = await db
      .insert(userMonsters)
      .values({
        userId,
        monsterId,
        power: monster.basePower,
        speed: monster.baseSpeed,
        defense: monster.baseDefense,
        hp: monster.baseHp, // SET this to baseHp
        maxHp: monster.baseHp, // SET this to baseHp
        mp: monster.baseMp, // SET this to baseMp
        maxMp: monster.baseMp // SET this to baseMp
      })
      .returning();

    // Deduct currency
    await this.updateUserCurrency(userId, -monster.goldCost, -monster.diamondCost);

    return userMonster;
  }

  async upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const upgradeCost = 200;
    const MAX_LEVEL = 10;
    const FREE_MAX_LEVEL = 3; // Free players can only upgrade to Level 3

    // Check if user owns the monster
    const [userMonster] = await db
      .select()
      .from(userMonsters)
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));

    if (!userMonster) {
      throw new Error("Monster not found or not owned by user");
    }

    // Check if monster is already at max level
    if (userMonster.level >= MAX_LEVEL) {
      throw new Error("Monster is already at maximum level");
    }

    // Check free trial limit - block upgrades at Level 3
    if (userMonster.level >= FREE_MAX_LEVEL) {
      throw new Error("FREE_TRIAL_LIMIT");
    }

    // Check if user has enough gold
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user || user.gold < upgradeCost) {
      throw new Error("Insufficient gold");
    }

    // Check for evolution stage upgrade
    let newEvolutionStage = userMonster.evolutionStage;
    const newLevel = userMonster.level + 1;

    if (newLevel >= 10 && userMonster.evolutionStage < 4) {
      newEvolutionStage = Math.min(4, Math.floor(newLevel / 3) + 1);
    }

    // Upgrade monster stats (10% increase)
    const [upgraded] = await db
      .update(userMonsters)
      .set({
        level: newLevel,
        power: Math.floor(userMonster.power * 1.1),
        speed: Math.floor(userMonster.speed * 1.1),
        defense: Math.floor(userMonster.defense * 1.1),
        evolutionStage: newEvolutionStage,
        experience: userMonster.experience + 25,
      })
      .where(eq(userMonsters.id, userMonsterId))
      .returning();

    // Deduct gold
    await this.updateUserCurrency(userId, -upgradeCost);

    return upgraded;
  }

  async applyMonsterUpgrade(
    userId: string,
    userMonsterId: number,
    upgradeKey: string,
    upgradeValue: string,
    statBoosts: { power?: number; speed?: number; defense?: number },
    goldCost: number,
    diamondCost: number
  ): Promise<UserMonster> {
    const [userMonster] = await db
      .select()
      .from(userMonsters)
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));

    if (!userMonster) {
      throw new Error("Monster not found");
    }

    // Deduct costs
    await this.updateUserCurrency(userId, -goldCost, -diamondCost);

    // Update upgrade choices
    const currentChoices = (userMonster.upgradeChoices as Record<string, any>) || {};
    const newChoices = { ...currentChoices, [upgradeKey]: upgradeValue };

    // Apply stat boosts
    const newPower = userMonster.power + (statBoosts.power || 0);
    const newSpeed = userMonster.speed + (statBoosts.speed || 0);
    const newDefense = userMonster.defense + (statBoosts.defense || 0);

    const [upgraded] = await db
      .update(userMonsters)
      .set({
        power: newPower,
        speed: newSpeed,
        defense: newDefense,
        upgradeChoices: newChoices,
        experience: userMonster.experience + 50,
      })
      .where(eq(userMonsters.id, userMonsterId))
      .returning();

    return upgraded;
  }

  async updateMonsterStats(userId: string, userMonsterId: number, hp: number, mp: number): Promise<UserMonster> {
    const [updated] = await db
      .update(userMonsters)
      .set({
        hp: hp,
        mp: mp,
        isShattered: hp <= 0 // Automatically set shattered state when HP reaches 0
      })
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Monster not found");
    }

    return updated;
  }

  async shatterMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const [updated] = await db
      .update(userMonsters)
      .set({
        hp: 0,
        isShattered: true
      })
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Monster not found or not owned by user");
    }

    return updated;
  }

  async repairMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    // Get the monster's max HP to restore it
    const userMonstersWithBase = await db
      .select({
        user_monsters: {
          id: userMonsters.id,
          hp: userMonsters.hp,
          maxHp: userMonsters.maxHp
        },
        monsters: {
          baseHp: monsters.baseHp
        }
      })
      .from(userMonsters)
      .leftJoin(monsters, eq(userMonsters.monsterId, monsters.id))
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)));

    if (userMonstersWithBase.length === 0) {
      throw new Error("Monster not found or not owned by user");
    }

    const { user_monsters: userMonster, monsters: monster } = userMonstersWithBase[0];
    const maxHp = userMonster.maxHp || monster?.baseHp || 400;

    const [updated] = await db
      .update(userMonsters)
      .set({
        hp: maxHp,
        isShattered: false
      })
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error("Monster not found or not owned by user");
    }

    return updated;
  }

  async getMonsterAbilities(monsterId: number) {
    try {
      // Query the new relational structure
      const result = await db
        .select({
          id: abilities.id,
          name: abilities.name,
          mp_cost: abilities.mp_cost,
          power_multiplier: abilities.power_multiplier,
          affinity: abilities.affinity,
          ability_type: abilities.ability_type,
          description: abilities.description,
          scaling_stat: abilities.scaling_stat,
          healing_power: abilities.healing_power,
          target: abilities.target,
          status_effect_applies: abilities.status_effect_applies,
          status_effect_chance: abilities.status_effect_chance,
          status_effect_duration: abilities.status_effect_duration,
          status_effect_value: abilities.status_effect_value,
          status_effect_value_type: abilities.status_effect_value_type,
          status_effect_trigger_affinity: abilities.status_effect_trigger_affinity,
          priority: abilities.priority,
          crit_chance_modifier: abilities.crit_chance_modifier,
          lifesteal_percent: abilities.lifesteal_percent,
          target_stat_modifier: abilities.target_stat_modifier,
          stat_modifier_value: abilities.stat_modifier_value,
          stat_modifier_duration: abilities.stat_modifier_duration,
          min_hits: abilities.min_hits,
          max_hits: abilities.max_hits,
          override_affinity: monsterAbilities.override_affinity
        })
        .from(abilities)
        .innerJoin(monsterAbilities, eq(abilities.id, monsterAbilities.ability_id))
        .where(eq(monsterAbilities.monster_id, monsterId));

      // Apply affinity overrides (especially for Basic Attack)
      const processedAbilities = result.map(ability => ({
        ...ability,
        affinity: ability.override_affinity || ability.affinity
      }));

      return processedAbilities;
    } catch (error) {
      console.error('Database error in getMonsterAbilities:', error);
      throw error;
    }
  }

  // Question operations - FIXED getRandomQuestion function
  async getRandomQuestion(subject: string, difficulty: number, userId?: string): Promise<Question | undefined> {
    const subjectFilter = subject === "mixed" ? sql`true` : eq(questions.subject, subject);
    let excludeFilter = sql`true`;

    if (userId) {
      const user = await this.getUser(userId); // Use the fixed getUser function
      if (user && user.answeredQuestionIds) {
        const answeredIds = user.answeredQuestionIds as number[];
        if (answeredIds.length > 0) {
          excludeFilter = sql`${questions.id} NOT IN (${sql.join(answeredIds.map(id => sql`${id}`), sql`, `)})`;
        }
      }
    }

    const [question] = await db
      .select()
      .from(questions)
      .where(and(subjectFilter, eq(questions.difficulty, difficulty), excludeFilter))
      .orderBy(sql`random()`)
      .limit(1);
    return question;
  }

  async markQuestionAnswered(userId: string, questionId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) return;

    const currentAnswered = ((user as any).answeredQuestionIds as number[]) || [];

    if (!currentAnswered.includes(questionId)) {
      const updatedAnswered = [...currentAnswered, questionId];

      await db
        .update(users)
        .set({ answeredQuestionIds: updatedAnswered } as any)
        .where(eq(users.id, userId));
    }
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
    const results = await db
      .select({
        id: battles.id,
        attackerId: battles.attackerId,
        defenderId: battles.defenderId,
        attackerMonsterId: battles.attackerMonsterId,
        defenderMonsterId: battles.defenderMonsterId,
        winnerId: battles.winnerId,
        goldFee: battles.goldFee,
        diamondsAwarded: battles.diamondsAwarded,
        battleAt: battles.battleAt,
      })
      .from(battles)
      .where(sql`${battles.attackerId} = ${userId} OR ${battles.defenderId} = ${userId}`)
      .orderBy(desc(battles.battleAt))
      .limit(10);

    return results as any;
  }

  // Inventory operations
  async getUserInventory(userId: string): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, userId))
      .orderBy(asc(inventory.itemName));
  }

  async addInventoryItem(userId: string, item: InsertInventoryItem): Promise<InventoryItem> {
    // Check if item already exists - if so, update quantity
    const existing = await this.getInventoryItem(userId, item.itemName);

    if (existing) {
      return await this.updateInventoryQuantity(userId, item.itemName, item.quantity || 1);
    }

    const [newItem] = await db
      .insert(inventory)
      .values({
        ...item,
        userId
      })
      .returning();

    return newItem;
  }

  async updateInventoryQuantity(userId: string, itemName: string, quantityDelta: number): Promise<InventoryItem> {
    const existing = await this.getInventoryItem(userId, itemName);

    if (!existing) {
      throw new Error("Item not found in inventory");
    }

    const newQuantity = existing.quantity + quantityDelta;

    if (newQuantity <= 0) {
      await this.removeInventoryItem(userId, itemName);
      throw new Error("Item removed from inventory");
    }

    const [updated] = await db
      .update(inventory)
      .set({ quantity: newQuantity })
      .where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName)))
      .returning();

    return updated;
  }

  async removeInventoryItem(userId: string, itemName: string): Promise<void> {
    await db
      .delete(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName)));
  }

  async getInventoryItem(userId: string, itemName: string): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemName, itemName)));

    return item;
  }

  // Story progress operations
  async updateStoryProgress(userId: string, storyNode: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        storyProgress: storyNode,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async getStoryProgress(userId: string): Promise<string> {
    const [user] = await db
      .select({ storyProgress: users.storyProgress })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    return user.storyProgress || "Node_Start_01";
  }

  // AI Team operations
  async getAllAiTeams(): Promise<AiTeam[]> {
    return await db.select().from(aiTeams).orderBy(asc(aiTeams.name));
  }

  async createAiTeam(teamData: InsertAiTeam): Promise<AiTeam> {
    const [team] = await db.insert(aiTeams).values(teamData).returning();
    return team;
  }

  async generateAiOpponent(playerTPL: number): Promise<{
    team: AiTeam;
    scaledMonsters: Array<{
      monster: Monster;
      level: number;
      hp: number;
      mp: number;
    }>;
  }> {
    console.log(`Log 1: Player TPL calculated as: ${playerTPL}`);

    const availableTeams = await this.getAllAiTeams();

    if (!availableTeams || availableTeams.length === 0) {
      throw new Error("No AI Teams are available in the database to generate an opponent.");
    }

    console.log(`Available AI teams count: ${availableTeams.length}`);

    let selectedTeam: AiTeam | null = null;
    let composition: Array<{monsterId: number, baseLevel: number}> = [];

    // Attempt 1: Find a suitable team with flexible scaling
    for (const team of availableTeams) {
      const teamComposition = team.composition as Array<{monsterId: number, baseLevel: number}>;

      if (!teamComposition || teamComposition.length === 0) continue;

      const baseTeamTPL = teamComposition.reduce((sum, member) => sum + member.baseLevel, 0);

      if (baseTeamTPL === 0) continue;

      const minScaling = 0.5;
      const maxScaling = 2.0;
      const requiredScaling = playerTPL / baseTeamTPL;

      if (requiredScaling >= minScaling && requiredScaling <= maxScaling) {
        selectedTeam = team;
        composition = teamComposition;
        console.log(`Log 2: AI Archetype selected: ${selectedTeam.name} (flexible scaling, factor: ${requiredScaling.toFixed(2)})`);
        break;
      }
    }

    // Attempt 2: If no team found, pick a random one and redistribute levels
    if (!selectedTeam) {
      selectedTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
      composition = selectedTeam.composition as Array<{monsterId: number, baseLevel: number}>;
      console.log(`Log 2: AI Archetype selected: ${selectedTeam.name} (manual level redistribution)`);

      const targetTPL = playerTPL;
      const monstersCount = composition.length;
      let remainingTPL = targetTPL;
      const levels = Array(monstersCount).fill(0);

      for (let i = 0; i < targetTPL; i++) {
        levels[i % monstersCount]++;
      }

      const originalComposition = [...(selectedTeam.composition as Array<{monsterId: number, baseLevel: number}>)];
      composition = originalComposition.map(member => ({ ...member, baseLevel: 1 }));

      composition.forEach((member, index) => {
        member.baseLevel = Math.min(10, levels[index]);
      });
    }

    const scaledMonsters = [];

    for (const member of composition) {
      const finalLevel = Math.max(1, Math.min(10, member.baseLevel));

      const [monster] = await db.select({
        id: monsters.id,
        name: monsters.name,
        type: monsters.type,
        baseHp: monsters.baseHp,
        baseMp: monsters.baseMp,
        hpPerLevel: monsters.hpPerLevel,
        mpPerLevel: monsters.mpPerLevel,
        basePower: monsters.basePower,
        baseSpeed: monsters.baseSpeed,
        baseDefense: monsters.baseDefense,
        resistances: monsters.resistances,
        weaknesses: monsters.weaknesses,
        description: monsters.description,
        iconClass: monsters.iconClass,
        gradient: monsters.gradient,
        starterSet: monsters.starterSet,
        levelUpgrades: monsters.levelUpgrades
      }).from(monsters).where(eq(monsters.id, member.monsterId));

      if (!monster) {
        console.error(`Log 4: Validation for monster ID ${member.monsterId} FAILED - not found in database`);
        continue;
      }

      const hp = Math.floor(monster.baseHp + (monster.hpPerLevel * (finalLevel - 1)));
      const mp = Math.floor(monster.baseMp + (monster.mpPerLevel * (finalLevel - 1)));

      scaledMonsters.push({ monster, level: finalLevel, hp, mp });
    }

    if (scaledMonsters.length === 0) {
      throw new Error(`Failed to generate battle team "${selectedTeam.name}" - all monsters in its composition failed validation.`);
    }

    const monsterNames = scaledMonsters.map(m => `${m.monster.name} (Lv.${m.level})`);
    console.log(`Log 5: Final AI team generated with monsters: [${monsterNames.join(', ')}]`);

    return { team: selectedTeam, scaledMonsters };
  }

  // Battle slot operations
  async getUserBattleSlots(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.battleSlots || 3; // Default 3 slots
  }

  async updateUserBattleSlots(userId: string, slots: number): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ battleSlots: slots })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async purchaseBattleSlot(userId: string): Promise<{ user: User; cost: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const currentSlots = user.battleSlots || 3;
    const cost = 100 * Math.pow(2, currentSlots - 3); // Exponential cost: 100, 200, 400, 800...

    if (user.gold < cost) {
      throw new Error("Insufficient gold");
    }

    const [updated] = await db
      .update(users)
      .set({
        gold: user.gold - cost,
        battleSlots: currentSlots + 1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return { user: updated, cost };
  }

  // Interest Test operations
  async recordSubscriptionIntent(userId: string, intent: 'monthly' | 'yearly'): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        subscriptionIntent: intent,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async recordNotificationEmail(userId: string, email: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        notificationEmail: email,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  // Battle Token operations - FIXED with explicit getUser usage
  async refreshBattleTokens(userId: string): Promise<User> {
    const user = await this.getUser(userId); // Uses the already-fixed, explicit getUser

    if (!user) throw new Error("User not found");

    const now = new Date();
    // This line now works because getUser provides the correct camelCase property
    const lastRefresh = new Date(user.battleTokensLastRefresh);
    const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);

    // If 24+ hours have passed, refresh tokens to 5
    if (hoursSinceRefresh >= 24) {
      const [updatedUser] = await db
        .update(users)
        .set({
          battleTokens: 5,
          battleTokensLastRefresh: now,
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    }

    return user;
  }

  async spendBattleToken(userId: string): Promise<User> {
    // This function now receives a correctly-cased user object from refreshBattleTokens
    const user = await this.refreshBattleTokens(userId);

    if (user.battleTokens <= 0) {
      throw new Error("NO_BATTLE_TOKENS");
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        battleTokens: user.battleTokens - 1,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  // Rank Point operations
  async updateUserRankPoints(userId: string, rpDelta: number): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        rankPoints: sql`${users.rankPoints} + ${rpDelta}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  // AI Trainer operations
  async getAllAiTrainers(): Promise<AiTeam[]> {
    return await db
      .select()
      .from(aiTeams)
      .where(eq(aiTeams.teamType, 'trainer'))
      .orderBy(asc(aiTeams.name));
  }

  async createAiTrainer(trainerData: InsertAiTeam): Promise<AiTeam> {
    const [trainer] = await db
      .insert(aiTeams)
      .values({ ...trainerData, teamType: 'trainer' })
      .returning();

    return trainer;
  }

  // Developer Tools - FIXED addBattleTokens function WITH EXTENSIVE DEBUGGING
  async addBattleTokens(userId: string, amount: number): Promise<User> {
    console.log('STORAGE: addBattleTokens called for userId:', userId, 'amount:', amount);
    console.log('STORAGE: userId type:', typeof userId);
    console.log('STORAGE: amount type:', typeof amount);
    console.log('STORAGE: About to call this.getUser...');

    const user = await this.getUser(userId);
    console.log('STORAGE: Fetched user:', user);
    console.log('STORAGE: User type:', typeof user);
    console.log('STORAGE: User properties:', user ? Object.keys(user) : 'no properties');

    if (!user) {
      console.log('STORAGE: No user found, throwing error');
      throw new Error("User not found during token addition");
    }

    const currentTokens = user.battleTokens || 0;
    console.log('STORAGE: Current tokens:', currentTokens);
    console.log('STORAGE: Current tokens type:', typeof currentTokens);

    const newTokens = currentTokens + amount;
    console.log('STORAGE: New token count will be:', newTokens);
    console.log('STORAGE: About to execute database update...');

    console.log('STORAGE: Database update query details:');
    console.log('  - Table: users');
    console.log('  - Set: battle_tokens =', newTokens);
    console.log('  - Where: users.id =', userId);
    console.log('  - Returning: true');

    const [updatedUser] = await db
      .update(users)
      .set({
        battleTokens: newTokens,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    console.log('STORAGE: Database update returned:', updatedUser);
    console.log('STORAGE: Updated user type:', typeof updatedUser);
    console.log('STORAGE: Updated user properties:', updatedUser ? Object.keys(updatedUser) : 'no properties');
    console.log('STORAGE: Updated user battleTokens:', updatedUser?.battleTokens);

    if (!updatedUser) {
      console.log('STORAGE: Database update returned null/undefined, throwing error');
      throw new Error("Failed to update user tokens");
    }

    console.log('STORAGE: Returning updated user successfully');
    return updatedUser;
  }
}

export const storage = new DatabaseStorage();
