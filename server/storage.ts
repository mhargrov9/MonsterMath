import {
  users,
  monsters,
  userMonsters,
  questions,
  battles,
  inventory,
  aiTeams,
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
    return await db.select().from(monsters).orderBy(asc(monsters.goldCost));
  }

  async createMonster(monsterData: InsertMonster): Promise<Monster> {
    const [monster] = await db.insert(monsters).values(monsterData).returning();
    return monster;
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
          abilities: monsters.abilities,
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

    // Create user monster with base stats and initialize HP/MP
    const [userMonster] = await db
      .insert(userMonsters)
      .values({
        userId,
        monsterId,
        power: monster.basePower,
        speed: monster.baseSpeed,
        defense: monster.baseDefense,
        hp: monster.baseHp,
        maxHp: monster.baseHp,
        mp: Math.floor((monster.baseMp || 200) * 0.8), // Start with 80% MP
        maxMp: monster.baseMp,
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
      .select()
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

  // Question operations
  async getRandomQuestion(subject: string, difficulty: number, userId?: string): Promise<Question | undefined> {
    const subjectFilter = subject === "mixed" ? sql`true` : eq(questions.subject, subject);
    
    let excludeFilter = sql`true`;
    
    // If userId provided, exclude already answered questions
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user && (user as any).answeredQuestionIds) {
        const answeredIds = (user as any).answeredQuestionIds as number[];
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
    // Get all available AI teams
    const availableTeams = await this.getAllAiTeams();
    
    // Filter teams that can work with the player's TPL (+/- 10% range)
    const minTPL = Math.max(2, Math.floor(playerTPL * 0.9));
    const maxTPL = Math.ceil(playerTPL * 1.1);
    
    const suitableTeams = availableTeams.filter(team => 
      team.minTPL <= maxTPL && team.maxTPL >= minTPL
    );
    
    if (suitableTeams.length === 0) {
      throw new Error("No suitable AI teams found for this power level");
    }
    
    // Randomly select a team
    const selectedTeam = suitableTeams[Math.floor(Math.random() * suitableTeams.length)];
    
    // Parse the team composition
    const composition = selectedTeam.composition as Array<{monsterId: number, baseLevel: number}>;
    
    // Calculate base TPL for this team
    const baseTeamTPL = composition.reduce((sum, member) => sum + member.baseLevel, 0);
    
    // Calculate scaling factor to match target TPL
    const targetTPL = playerTPL; // Exact match for fairness
    const scalingFactor = targetTPL / baseTeamTPL;
    
    // Scale monster levels and get monster data
    const scaledMonsters = [];
    for (const member of composition) {
      const scaledLevel = Math.max(1, Math.min(10, Math.round(member.baseLevel * scalingFactor)));
      
      // Get monster data
      const [monster] = await db.select().from(monsters).where(eq(monsters.id, member.monsterId));
      if (!monster) {
        console.error(`Monster with ID ${member.monsterId} not found in database for AI team ${selectedTeam.name}`);
        throw new Error(`Monster with ID ${member.monsterId} not found - please check AI team configuration`);
      }
      
      // Validate required monster fields
      if (!monster.baseHp || !monster.baseMp || monster.hpPerLevel === undefined || monster.mpPerLevel === undefined) {
        console.error(`Monster ${monster.name} (ID: ${monster.id}) missing required fields:`, {
          baseHp: monster.baseHp,
          baseMp: monster.baseMp,
          hpPerLevel: monster.hpPerLevel,
          mpPerLevel: monster.mpPerLevel
        });
        throw new Error(`Monster ${monster.name} has incomplete data - cannot generate battle stats`);
      }
      
      // Calculate HP and MP based on level
      const baseHp = monster.baseHp;
      const baseMp = monster.baseMp;
      const hpPerLevel = monster.hpPerLevel;
      const mpPerLevel = monster.mpPerLevel;
      
      const hp = Math.floor(baseHp + (hpPerLevel * (scaledLevel - 1)));
      const mp = Math.floor(baseMp + (mpPerLevel * (scaledLevel - 1)));
      
      scaledMonsters.push({
        monster,
        level: scaledLevel,
        hp,
        mp
      });
    }
    
    // Ensure we have at least one monster
    if (scaledMonsters.length === 0) {
      throw new Error(`No valid monsters found for AI team ${selectedTeam.name} - team composition may be corrupted`);
    }
    
    return {
      team: selectedTeam,
      scaledMonsters
    };
  }

  // Battle slot operations
  async getUserBattleSlots(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.battleSlots || 2;
  }

  async updateUserBattleSlots(userId: string, slots: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ battleSlots: slots, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Interest Test operations
  async recordSubscriptionIntent(userId: string, intent: 'monthly' | 'yearly'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ subscriptionIntent: intent })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async recordNotificationEmail(userId: string, email: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ notificationEmail: email })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async refreshBattleTokens(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastRefresh = new Date(user.battleTokensLastRefresh);
    const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);

    // If 24+ hours have passed, refresh tokens to 5
    if (hoursSinceRefresh >= 24) {
      const [updatedUser] = await db
        .update(users)
        .set({
          battleTokens: 5,
          battleTokensLastRefresh: now,
          updatedAt: now
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    }

    return user;
  }

  async spendBattleToken(userId: string): Promise<User> {
    // First check if tokens need refreshing
    const user = await this.refreshBattleTokens(userId);
    
    if (user.battleTokens <= 0) {
      throw new Error("NO_BATTLE_TOKENS");
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        battleTokens: user.battleTokens - 1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async purchaseBattleSlot(userId: string): Promise<{ user: User; cost: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // Calculate cost based on current slots: slot 3=50, slot 4=150, slot 5=400
    const slotCosts = [0, 0, 50, 150, 400]; // Index matches slot number
    const nextSlot = user.battleSlots + 1;
    const cost = slotCosts[nextSlot] || 1000; // Max slots reached
    
    if (nextSlot > 5) throw new Error("Maximum battle slots reached");
    if (user.diamonds < cost) throw new Error("Insufficient diamonds");
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        battleSlots: nextSlot,
        diamonds: user.diamonds - cost,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { user: updatedUser, cost };
  }

  async updateUserRankPoints(userId: string, rpDelta: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const newRP = Math.max(0, user.rankPoints + rpDelta); // Don't go below 0
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        rankPoints: newRP,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getAllAiTrainers(): Promise<AiTeam[]> {
    return await db.select().from(aiTeams);
  }

  async createAiTrainer(trainerData: InsertAiTeam): Promise<AiTeam> {
    const [trainer] = await db
      .insert(aiTeams)
      .values(trainerData)
      .returning();
      
    return trainer;
  }
}

export const storage = new DatabaseStorage();
