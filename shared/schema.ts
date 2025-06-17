import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  username: varchar("username").unique(), // For local accounts
  passwordHash: varchar("password_hash"), // For local accounts
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  authProvider: varchar("auth_provider").default("replit").notNull(), // 'replit' or 'local'
  gold: integer("gold").default(500).notNull(),
  diamonds: integer("diamonds").default(0).notNull(),
  currentSubject: varchar("current_subject").default("mixed"),
  questionsAnswered: integer("questions_answered").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  answeredQuestionIds: jsonb("answered_question_ids").default('[]').notNull(),
  battleTokens: integer("battle_tokens").default(0).notNull(),
  battleSlots: integer("battle_slots").default(2).notNull(), // Number of monsters allowed in battle
  storyProgress: varchar("story_progress").default("Node_Start_01"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monsters table
export const monsters = pgTable("monsters", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // earth, psychic, fire, water, electric, etc.
  basePower: integer("base_power").notNull(),
  baseSpeed: integer("base_speed").notNull(),
  baseDefense: integer("base_defense").notNull(),
  baseHp: integer("base_hp").notNull(), // Hit Points
  baseMp: integer("base_mp").notNull(), // Mana Points
  goldCost: integer("gold_cost").notNull(),
  diamondCost: integer("diamond_cost").default(0).notNull(),
  description: text("description"),
  iconClass: varchar("icon_class").notNull(), // Font Awesome class
  gradient: varchar("gradient").notNull(), // CSS gradient colors
  abilities: jsonb("abilities").notNull(), // Passive and active abilities
  resistances: jsonb("resistances").default('[]').notNull(), // Damage resistances
  weaknesses: jsonb("weaknesses").default('[]').notNull(), // Damage weaknesses
  levelUpgrades: jsonb("level_upgrades").default('{}').notNull(), // Upgrades per level
  starterSet: boolean("starter_set").default(false).notNull(), // Part of starter set
});

// User monsters (owned monsters)
export const userMonsters = pgTable("user_monsters", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  monsterId: integer("monster_id").references(() => monsters.id).notNull(),
  level: integer("level").default(1).notNull(),
  power: integer("power").notNull(),
  speed: integer("speed").notNull(),
  defense: integer("defense").notNull(),
  experience: integer("experience").default(0).notNull(),
  evolutionStage: integer("evolution_stage").default(1).notNull(),
  upgradeChoices: jsonb("upgrade_choices").default('{}').notNull(), // Track chosen upgrades
  hp: integer("hp"), // Current HP - null means use base HP
  maxHp: integer("max_hp"), // Maximum HP - null means use base HP
  mp: integer("mp"), // Current MP - null means use base MP
  maxMp: integer("max_mp"), // Maximum MP - null means use base MP
  isShattered: boolean("is_shattered").default(false).notNull(), // Shattered state when HP reaches 0
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  subject: varchar("subject").notNull(), // math, spelling, mixed
  difficulty: integer("difficulty").notNull(), // 1-5 scale
  questionText: text("question_text").notNull(),
  correctAnswer: varchar("correct_answer").notNull(),
  options: jsonb("options").notNull(), // Array of answer options
  hint: text("hint"),
  goldReward: integer("gold_reward").notNull(),
});

// Battle history
export const battles = pgTable("battles", {
  id: serial("id").primaryKey(),
  attackerId: varchar("attacker_id").references(() => users.id).notNull(),
  defenderId: varchar("defender_id").references(() => users.id), // NULL for AI opponents
  attackerMonsterId: integer("attacker_monster_id").references(() => userMonsters.id).notNull(),
  defenderMonsterId: integer("defender_monster_id").references(() => userMonsters.id).notNull(),
  winnerId: varchar("winner_id").references(() => users.id), // NULL if AI wins
  goldFee: integer("gold_fee").notNull(),
  diamondsAwarded: integer("diamonds_awarded").notNull(),
  battleAt: timestamp("battle_at").defaultNow(),
});

// Player inventory for non-monster items
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  itemName: varchar("item_name").notNull(),
  itemDescription: text("item_description"),
  quantity: integer("quantity").default(1).notNull(),
  itemType: varchar("item_type").notNull(), // 'consumable', 'tool', 'quest', 'material'
  rarity: varchar("rarity").default('common'), // 'common', 'rare', 'epic', 'legendary'
  iconClass: varchar("icon_class").default('fas fa-box'), // Font Awesome icon
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// AI Teams table - stores pre-designed opponent teams
export const aiTeams = pgTable("ai_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "The Stone Wall", "The Fast Swarm"
  description: text("description"),
  composition: jsonb("composition").notNull(), // Array of {monsterId, baseLevel}
  archetype: varchar("archetype").notNull(), // tank, swarm, balanced, etc.
  minTPL: integer("min_tpl").default(2).notNull(), // Minimum team power level
  maxTPL: integer("max_tpl").default(50).notNull(), // Maximum team power level
});

// Schemas for validation
export const upsertUserSchema = createInsertSchema(users);
export const insertMonsterSchema = createInsertSchema(monsters).omit({ id: true });
export const insertUserMonsterSchema = createInsertSchema(userMonsters).omit({ id: true, acquiredAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertBattleSchema = createInsertSchema(battles).omit({ id: true, battleAt: true }).extend({
  defenderId: z.string().nullable().optional(),
  winnerId: z.string().nullable().optional()
});
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, acquiredAt: true, userId: true });
export const insertAiTeamSchema = createInsertSchema(aiTeams).omit({ id: true });

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Monster = typeof monsters.$inferSelect;
export type UserMonster = typeof userMonsters.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type InsertMonster = z.infer<typeof insertMonsterSchema>;
export type InsertUserMonster = z.infer<typeof insertUserMonsterSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type InsertInventoryItem = z.infer<typeof insertInventorySchema>;
export type AiTeam = typeof aiTeams.$inferSelect;
export type InsertAiTeam = z.infer<typeof insertAiTeamSchema>;
