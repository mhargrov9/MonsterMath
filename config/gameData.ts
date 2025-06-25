// Legacy constants - these are now managed in the database
// AI opponents are stored in ai_teams table
// Monster names come from monsters table queries

// Keep this file minimal - only truly static game constants
export const GAME_CONSTANTS = {
  MAX_BATTLE_SLOTS: 5,
  BASE_BATTLE_SLOTS: 2,
  MAX_MONSTER_LEVEL: 10,
  BATTLE_TOKEN_REFRESH_HOURS: 4,
} as const;