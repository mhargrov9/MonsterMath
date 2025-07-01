// Server-side game constants only.
// All dynamic data (monsters, abilities, AI opponents) comes from the database.

export const SERVER_CONSTANTS = {
  MAX_BATTLE_SLOTS: 5,
  BASE_BATTLE_SLOTS: 2,
  MAX_MONSTER_LEVEL: 10,
  BATTLE_TOKEN_REFRESH_HOURS: 4,
  DEFAULT_BATTLE_TOKENS: 5, // Merged from config/gameData.ts
} as const;