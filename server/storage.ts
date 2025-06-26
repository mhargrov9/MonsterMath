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

// Interface remains the same, no changes needed here
export interface IStorage {
  // ... (all interface definitions are unchanged) ...
}

export class DatabaseStorage implements IStorage {
  // ... (user operations are unchanged) ...

  async purchaseMonster(userId: string, monsterId: number): Promise<UserMonster> {
    const [monster] = await db.select().from(monsters).where(eq(monsters.id, monsterId));

    if (!monster) {
      throw new Error("Monster not found");
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    if (user.gold < monster.goldCost || user.diamonds < monster.diamondCost) {
      throw new Error("Insufficient currency");
    }

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
        mp: monster.baseMp,
        maxMp: monster.baseMp 
      })
      .returning();

    await this.updateUserCurrency(userId, -monster.goldCost, -monster.diamondCost);

    return userMonster;
  }

  // FIXED: upgradeMonster now correctly calculates and applies HP/MP gains
  async upgradeMonster(userId: string, userMonsterId: number): Promise<UserMonster> {
    const upgradeCost = 200;
    const MAX_LEVEL = 10;
    const FREE_MAX_LEVEL = 3; 

    // Join with monsters table to get access to base stats and per-level gains
    const [result] = await db
      .select()
      .from(userMonsters)
      .where(and(eq(userMonsters.id, userMonsterId), eq(userMonsters.userId, userId)))
      .innerJoin(monsters, eq(userMonsters.monsterId, monsters.id));

    if (!result) {
      throw new Error("Monster not found or not owned by user");
    }

    const { userMonsters: um, monsters: m } = result;

    if (um.level >= MAX_LEVEL) {
      throw new Error("Monster is already at maximum level");
    }
    if (um.level >= FREE_MAX_LEVEL) {
      throw new Error("FREE_TRIAL_LIMIT");
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.gold < upgradeCost) {
      throw new Error("Insufficient gold");
    }

    const newLevel = um.level + 1;
    let newEvolutionStage = um.evolutionStage;
    if (newLevel >= 10 && um.evolutionStage < 4) {
      newEvolutionStage = Math.min(4, Math.floor(newLevel / 3) + 1);
    }

    // Calculate new stats, including HP and MP
    const newPower = Math.floor(um.power * 1.1);
    const newSpeed = Math.floor(um.speed * 1.1);
    const newDefense = Math.floor(um.defense * 1.1);
    const newMaxHp = m.baseHp + (m.hpPerLevel * (newLevel - 1));
    const newMaxMp = m.baseMp + (m.mpPerLevel * (newLevel - 1));

    const [upgraded] = await db
      .update(userMonsters)
      .set({
        level: newLevel,
        power: newPower,
        speed: newSpeed,
        defense: newDefense,
        maxHp: newMaxHp,    // Set the new max HP
        hp: newMaxHp,       // Fully heal the monster on level up
        maxMp: newMaxMp,    // Set the new max MP
        mp: newMaxMp,       // Fully restore MP on level up
        evolutionStage: newEvolutionStage,
        experience: um.experience + 25,
      })
      .where(eq(userMonsters.id, userMonsterId))
      .returning();

    await this.updateUserCurrency(userId, -upgradeCost);
    return upgraded;
  }

  // ... (applyMonsterUpgrade and other functions are unchanged) ...

  // FIXED: generateAiOpponent now correctly scales max_hp and max_mp
  async generateAiOpponent(tpl: number) {
    console.log(`Log 1: TPL calculated as: ${tpl}`);

    const PREFERRED_TEAM_SIZE = 3;
    let monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, false));
    if (monsterPool.length === 0) {
      console.log("AI GEN LOG: No non-starter monsters found. Using starters as fallback pool.");
      monsterPool = await db.select().from(monsters).where(eq(monsters.starterSet, true));
    }

    if (monsterPool.length === 0) {
        throw new Error("There are no monsters in the database to generate a team.");
    }

    const actualTeamSize = Math.min(PREFERRED_TEAM_SIZE, monsterPool.length);
    const selectedTeamIndexes = new Set<number>();
    while (selectedTeamIndexes.size < actualTeamSize) {
      selectedTeamIndexes.add(Math.floor(Math.random() * monsterPool.length));
    }

    const teamMonsters = Array.from(selectedTeamIndexes).map(index => monsterPool[index]);
    const tplPerMonster = Math.floor(tpl / actualTeamSize);

    const scaledMonsters = teamMonsters.map(monster => {
      const level = Math.max(1, Math.round(tplPerMonster / 10));

      // Calculate scaled stats
      const hp = monster.baseHp + (monster.hpPerLevel * (level - 1));
      const mp = monster.baseMp + (monster.mpPerLevel * (level - 1));

      return {
        id: monster.id,
        name: monster.name,
        level: level,
        hp: hp,
        max_hp: hp, // FIX: Set max_hp to the calculated scaled HP
        mp: mp,
        max_mp: mp, // FIX: Set max_mp to the calculated scaled MP
        power: monster.basePower, // Note: Power/Def/Spd don't currently scale for AI
        defense: monster.baseDefense,
        speed: monster.baseSpeed,
        affinity: monster.type,
        resistances: monster.resistances,
        weaknesses: monster.weaknesses,
        is_fainted: false
      };
    });

    console.log(`Log 2: Final AI team generated with monsters:`, scaledMonsters.map(m => `${m.name} (Lv.${m.level})`));

    return {
      name: "AI Challenger",
      scaledMonsters: scaledMonsters,
      tpl: tpl
    };
  }

  // ... (the rest of the file is unchanged) ...
}

export const storage = new DatabaseStorage();