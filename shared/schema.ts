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
  decimal,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email').unique(),
  username: varchar('username').unique(), // For local accounts
  passwordHash: varchar('password_hash'), // For local accounts
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  authProvider: varchar('auth_provider').default('replit').notNull(), // 'replit' or 'local'
  gold: integer('gold').default(500).notNull(),
  diamonds: integer('diamonds').default(0).notNull(),
  currentSubject: varchar('current_subject').default('mixed'),
  questionsAnswered: integer('questions_answered').default(0).notNull(),
  correctAnswers: integer('correct_answers').default(0).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  answeredQuestionIds: jsonb('answered_question_ids').default('[]').notNull(),
  battleTokens: integer('battle_tokens').default(5).notNull(),
  battleTokensLastRefresh: timestamp('battle_tokens_last_refresh')
    .defaultNow()
    .notNull(),
  battleSlots: integer('battle_slots').default(2).notNull(),
  rankPoints: integer('rank_points').default(0).notNull(),
  rank_xp: integer('rank_xp').default(0).notNull(),
  storyProgress: varchar('story_progress').default('Node_Start_01'),
  player_tier: integer('player_tier').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  subscriptionIntent: varchar('subscription_intent'),
  notificationEmail: varchar('notification_email'),
});

// Ranks table for player progression
export const ranks = pgTable('ranks', {
  id: serial('id').primaryKey(),
  tier_name: varchar('tier_name').notNull(),
  sub_tier: integer('sub_tier').notNull(),
  xp_required: integer('xp_required').notNull(),
  icon_url: varchar('icon_url'),
});

// Monsters table
export const monsters = pgTable('monsters', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  type: varchar('type').notNull(),
  basePower: integer('base_power').notNull(),
  baseSpeed: integer('base_speed').notNull(),
  baseDefense: integer('base_defense').notNull(),
  baseHp: integer('base_hp').notNull(),
  baseMp: integer('base_mp').notNull(),
  hpPerLevel: integer('hp_per_level').default(50).notNull(),
  mpPerLevel: integer('mp_per_level').default(20).notNull(),
  goldCost: integer('gold_cost').notNull(),
  diamondCost: integer('diamond_cost').default(0).notNull(),
  description: text('description'),
  iconClass: varchar('icon_class').notNull(),
  gradient: varchar('gradient').notNull(),
  resistances: jsonb('resistances').default('[]').notNull(),
  weaknesses: jsonb('weaknesses').default('[]').notNull(),
  levelUpgrades: jsonb('level_upgrades').default('{}').notNull(),
  starterSet: boolean('starter_set').default(false).notNull(),
  monster_tier: integer('monster_tier').default(1).notNull(),
});

// Abilities table
export const abilities = pgTable('abilities', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  ability_type: varchar('ability_type').notNull(),
  mp_cost: integer('mp_cost'),
  affinity: varchar('affinity'),
  power_multiplier: decimal('power_multiplier', { precision: 4, scale: 2 }),
  scaling_stat: varchar('scaling_stat'),
  healing_power: integer('healing_power').default(0).notNull(),
  target_scope: varchar('target_scope'),
  max_targets: integer('max_targets').default(1).notNull(),
  activation_scope: varchar('activation_scope'),
  activation_trigger: varchar('activation_trigger'),
  trigger_condition_type: varchar('trigger_condition_type'),
  trigger_condition_operator: varchar('trigger_condition_operator'),
  trigger_condition_value: integer('trigger_condition_value'),
  status_effect_trigger_affinity: varchar('status_effect_trigger_affinity'),
  status_effect_id: integer('status_effect_id').references(
    () => statusEffects.id,
  ),
  override_duration: integer('override_duration'),
  override_value: decimal('override_value', { precision: 10, scale: 2 }),
  override_chance: decimal('override_chance', { precision: 4, scale: 2 }),
  priority: integer('priority').default(0).notNull(),
  crit_chance_modifier: decimal('crit_chance_modifier', {
    precision: 4,
    scale: 2,
  })
    .default('0')
    .notNull(),
  lifesteal_percent: decimal('lifesteal_percent', { precision: 4, scale: 2 })
    .default('0')
    .notNull(),
  stat_modifiers: jsonb('stat_modifiers'), // THIS IS THE CORRECT, REQUIRED COLUMN
  min_hits: integer('min_hits').default(1).notNull(),
  max_hits: integer('max_hits').default(1).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Monster-Abilities join table
export const monsterAbilities = pgTable('monster_abilities', {
  monster_id: integer('monster_id')
    .references(() => monsters.id)
    .notNull(),
  ability_id: integer('ability_id')
    .references(() => abilities.id)
    .notNull(),
  is_basic_attack: boolean('is_basic_attack').default(false),
  override_affinity: varchar('override_affinity'),
  created_at: timestamp('created_at').defaultNow(),
});

// User monsters (owned monsters)
export const userMonsters = pgTable('user_monsters', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .references(() => users.id)
    .notNull(),
  monsterId: integer('monster_id')
    .references(() => monsters.id)
    .notNull(),
  level: integer('level').default(1).notNull(),
  power: integer('power').notNull(),
  speed: integer('speed').notNull(),
  defense: integer('defense').notNull(),
  experience: integer('experience').default(0).notNull(),
  evolutionStage: integer('evolution_stage').default(1).notNull(),
  upgradeChoices: jsonb('upgrade_choices').default('{}').notNull(),
  hp: integer('hp'),
  maxHp: integer('max_hp'),
  mp: integer('mp'),
  maxMp: integer('max_mp'),
  isShattered: boolean('is_shattered').default(false).notNull(),
  acquiredAt: timestamp('acquired_at').defaultNow(),
});

// Other tables... (Questions, Battles, etc.)
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  subject: varchar('subject').notNull(),
  difficulty: integer('difficulty').notNull(),
  questionText: text('question_text').notNull(),
  correctAnswer: varchar('correct_answer').notNull(),
  options: jsonb('options').notNull(),
  hint: text('hint'),
  goldReward: integer('gold_reward').notNull(),
});

export const battles = pgTable('battles', {
  id: serial('id').primaryKey(),
  attackerId: varchar('attacker_id')
    .references(() => users.id)
    .notNull(),
  defenderId: varchar('defender_id').references(() => users.id),
  attackerMonsterId: integer('attacker_monster_id')
    .references(() => userMonsters.id)
    .notNull(),
  defenderMonsterId: integer('defender_monster_id')
    .references(() => userMonsters.id)
    .notNull(),
  winnerId: varchar('winner_id').references(() => users.id),
  goldFee: integer('gold_fee').notNull(),
  diamondsAwarded: integer('diamonds_awarded').notNull(),
  battleAt: timestamp('battle_at').defaultNow(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .references(() => users.id)
    .notNull(),
  itemName: varchar('item_name').notNull(),
  itemDescription: text('item_description'),
  quantity: integer('quantity').default(1).notNull(),
  itemType: varchar('item_type').notNull(),
  rarity: varchar('rarity').default('common'),
  iconClass: varchar('icon_class').default('fas fa-box'),
  acquiredAt: timestamp('acquired_at').defaultNow(),
});

export const aiTeams = pgTable('ai_teams', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  composition: jsonb('composition').notNull(),
  archetype: varchar('archetype').notNull(),
  minTPL: integer('min_tpl').default(2).notNull(),
  maxTPL: integer('max_tpl').default(50).notNull(),
});

export const statusEffects = pgTable('status_effects', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull().unique(),
  description: text('description'),
  effect_type: varchar('effect_type').notNull(),
  default_duration: integer('default_duration').default(1),
  default_value: decimal('default_value'),
  secondary_value: decimal('secondary_value'),
  value_type: varchar('value_type'),
  duration_reduction_position: varchar('duration_reduction_position')
    .default('ACTIVE_ONLY')
    .notNull(),
  is_positive: boolean('is_positive').default(false).notNull(),
});

// Schemas for validation
export const upsertUserSchema = createInsertSchema(users);
export const insertRankSchema = createInsertSchema(ranks).omit({ id: true });
export const insertMonsterSchema = createInsertSchema(monsters).omit({
  id: true,
});
export const insertUserMonsterSchema = createInsertSchema(userMonsters).omit({
  id: true,
  acquiredAt: true,
});
export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});
export const insertBattleSchema = createInsertSchema(battles)
  .omit({ id: true, battleAt: true })
  .extend({
    defenderId: z.string().nullable().optional(),
    winnerId: z.string().nullable().optional(),
  });
export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  acquiredAt: true,
  userId: true,
});
export const insertAiTeamSchema = createInsertSchema(aiTeams).omit({
  id: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Rank = typeof ranks.$inferSelect;
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
export type InsertRank = z.infer<typeof insertRankSchema>;
