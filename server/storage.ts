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
}

export const storage = new DatabaseStorage();
