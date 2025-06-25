// Server-side game constants only
// All dynamic data (monsters, AI opponents) comes from database

export const SERVER_CONSTANTS = {
  MAX_BATTLE_SLOTS: 5,
  BASE_BATTLE_SLOTS: 2,
  MAX_MONSTER_LEVEL: 10,
  BATTLE_TOKEN_REFRESH_HOURS: 4,
  DEFAULT_BATTLE_TOKENS: 5,
} as const;