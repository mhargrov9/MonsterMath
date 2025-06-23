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
  battleTokens: integer("battle_tokens").default(5).notNull(),
  battleTokensLastRefresh: timestamp("battle_tokens_last_refresh").defaultNow().notNull(), // Last token refresh time
  battleSlots: integer("battle_slots").default(2).notNull(), // Number of monsters allowed in battle
  rankPoints: integer("rank_points").default(0).notNull(), // RP system for battle rankings
  storyProgress: varchar("story_progress").default("Node_Start_01"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  subscriptionIntent: varchar("subscription_intent"), // 'monthly' or 'yearly'
  notificationEmail: varchar("notification_email"),
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
  hpPerLevel: integer("hp_per_level").default(50).notNull(), // HP gained per level
  mpPerLevel: integer("mp_per_level").default(20).notNull(), // MP gained per level
  goldCost: integer("gold_cost").notNull(),
  diamondCost: integer("diamond_cost").default(0).notNull(),
  description: text("description"),
  iconClass: varchar("icon_class").notNull(), // Font Awesome class
  gradient: varchar("gradient").notNull(), // CSS gradient colors
  
  resistances: jsonb("resistances").default('[]').notNull(), // Damage resistances
  weaknesses: jsonb("weaknesses").default('[]').notNull(), // Damage weaknesses
  levelUpgrades: jsonb("level_upgrades").default('{}').notNull(), // Upgrades per level
  starterSet: boolean("starter_set").default(false).notNull(), // Part of starter set
});


// Abilities table - NEW relational structure
// Abilities table - FINAL relational structure
export const abilities = pgTable("abilities", {
  id: serial("id").primaryKey(),

  // Group 1: Core Identity Columns
  name: varchar("name").notNull(),
  description: text("description"),

  // Group 2: Mechanical Function Columns
  ability_type: varchar("ability_type").notNull(), // 'ACTIVE' or 'PASSIVE'
  mp_cost: integer("mp_cost"),
  affinity: varchar("affinity"),
  power_multiplier: decimal("power_multiplier", { precision: 4, scale: 2 }),
  scaling_stat: varchar("scaling_stat"), // 'POWER', 'DEFENSE', etc.
  healing_power: integer("healing_power").default(0).notNull(),
  target: varchar("target"), // 'OPPONENT', 'SELF'

  // Group 3: Status Effect Columns
  status_effect_applies: varchar("status_effect_applies"), // 'POISONED', 'PARALYZED', etc.
  status_effect_chance: decimal("status_effect_chance", { precision: 4, scale: 2 }), // 0.0 to 1.0
  status_effect_duration: integer("status_effect_duration"),
  status_effect_value: decimal("status_effect_value", { precision: 10, scale: 2 }),
  status_effect_value_type: varchar("status_effect_value_type"), // 'FLAT_HP', 'PERCENT_MAX_HP'
  status_effect_trigger_affinity: varchar("status_effect_trigger_affinity"),

  // Group 4: Advanced & Future-Proofing Columns
  priority: integer("priority").default(0).notNull(),
  crit_chance_modifier: decimal("crit_chance_modifier", { precision: 4, scale: 2 }).default('0').notNull(),
  lifesteal_percent: decimal("lifesteal_percent", { precision: 4, scale: 2 }).default('0').notNull(),
  target_stat_modifier: varchar("target_stat_modifier"),
  stat_modifier_value: integer("stat_modifier_value"),
  stat_modifier_duration: integer("stat_modifier_duration"),

  // Multi-hit ability support
  min_hits: integer("min_hits").default(1).notNull(),
  max_hits: integer("max_hits").default(1).notNull(),

  created_at: timestamp("created_at").defaultNow()
});

// Monster-Abilities join table - Links monsters to their abilities
export const monsterAbilities = pgTable("monster_abilities", {
  monster_id: integer("monster_id").references(() => monsters.id).notNull(),
  ability_id: integer("ability_id").references(() => abilities.id).notNull(),
  is_basic_attack: boolean("is_basic_attack").default(false),
  override_affinity: varchar("override_affinity"), // For Basic Attack inheritance
  created_at: timestamp("created_at").defaultNow(),
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
export type Ability = typeof abilities.$inferSelect;
export type MonsterAbility = typeof monsterAbilities.$inferSelect;
