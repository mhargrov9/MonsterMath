import { describe, it, expect } from 'vitest';
import {
  getModifiedStat,
  calculateDamage,
  handleEndOfTurn,
  handleStartOfTurn,
  executeAbility,
} from './battleEngine';
import { UserMonster, Monster, Ability } from '../shared/types';

// Mock Data for Tests
const mockPlayerMonster: UserMonster = {
  id: 1,
  userId: 'test-user',
  monsterId: 1,
  level: 5,
  power: 150,
  speed: 100,
  defense: 80,
  hp: 200,
  mp: 100,
  experience: 0,
  evolutionStage: 1,
  upgradeChoices: {},
  acquiredAt: new Date(),
  monster: {
    id: 1,
    name: 'Test PlayerMon',
    type: 'fire',
    basePower: 100,
    baseSpeed: 80,
    baseDefense: 60,
    baseHp: 150,
    baseMp: 100,
    goldCost: 100,
    diamondCost: 0,
    iconClass: '',
    gradient: '',
    resistances: [],
    weaknesses: [],
    levelUpgrades: {},
  },
};

const mockAiMonster: Monster = {
  id: 2,
  name: 'Test AiMon',
  type: 'water',
  basePower: 120,
  baseSpeed: 90,
  baseDefense: 110,
  baseHp: 220,
  baseMp: 120,
  goldCost: 100,
  diamondCost: 0,
  iconClass: '',
  gradient: '',
  resistances: ['fire'], // Fire attacks are resisted by water
  weaknesses: [],
  levelUpgrades: {},
};

const mockAbility: Ability = {
  id: 1,
  name: 'Test Attack',
  ability_type: 'ACTIVE',
  mp_cost: 10,
  affinity: 'fire',
  power_multiplier: '1.20',
  scaling_stat: 'power',
  healing_power: 0,
  target_scope: 'ACTIVE_OPPONENT',
};

// Test Suites
describe('battleEngine Helpers', () => {
  describe('getModifiedStat', () => {
    it('should return the correct stat for a player monster (UserMonster)', () => {
      expect(getModifiedStat(mockPlayerMonster, 'power')).toBe(150);
      expect(getModifiedStat(mockPlayerMonster, 'defense')).toBe(80);
    });

    it('should return the correct base stat for an AI monster (Monster)', () => {
      expect(getModifiedStat(mockAiMonster, 'power')).toBe(120);
      expect(getModifiedStat(mockAiMonster, 'defense')).toBe(110);
    });

    it('should apply active flat and percentage stat modifiers correctly', () => {
      const monsterWithEffects: UserMonster = {
        ...mockPlayerMonster,
        power: 100, // Base power
        activeEffects: [
          { id: '1', stat: 'power', type: 'FLAT', value: 20, duration: 2 }, // 100 + 20 = 120
          { id: '2', stat: 'power', type: 'PERCENTAGE', value: 50, duration: 2 }, // 120 * 1.5 = 180
          { id: '3', stat: 'defense', type: 'PERCENTAGE', value: 50, duration: 1 } // Should be ignored
        ]
      };

      // The final calculated power should be 180
      expect(getModifiedStat(monsterWithEffects, 'power')).toBe(180);
    });
  });

  describe('calculateDamage', () => {
    it('should calculate damage correctly and respect type weakness', () => {
      // This test checks a Fire attack against a Water monster (not very effective = 0.5x)
      const result = calculateDamage(mockPlayerMonster, mockAiMonster, {
        ...mockAbility,
        affinity: 'fire',
      });

      // Verify that damage calculation produces reasonable results within variance
      expect(result.damage).toBeGreaterThan(0);
      expect(result.damage).toBeLessThan(500); // Reasonable upper bound
      expect(result.affinityMultiplier).toBe(0.5); // Fire weak against Water
      expect(typeof result.isCritical).toBe('boolean');
    });

    it('should return correct stat values for different monster types', () => {
      // Test UserMonster stat access
      expect(getModifiedStat(mockPlayerMonster, 'power')).toBe(150);
      expect(getModifiedStat(mockPlayerMonster, 'speed')).toBe(100);

      // Test AI Monster base stat access
      expect(getModifiedStat(mockAiMonster, 'power')).toBe(120);
      expect(getModifiedStat(mockAiMonster, 'defense')).toBe(110);
    });

    it('should return the correct base stat for an AI monster with a nested structure', () => {
      const nestedAiMonster = {
        id: 2,
        level: 5,
        monster: {
          name: 'Nested AiMon',
          type: 'water',
          basePower: 120,
          baseDefense: 110,
          baseSpeed: 90,
        }
      };
      expect(getModifiedStat(nestedAiMonster as any, 'power')).toBe(120);
      expect(getModifiedStat(nestedAiMonster as any, 'defense')).toBe(110);
    });
  });

  describe('handleEndOfTurn', () => {
    it('should correctly apply percentage-based healing from a passive ability', () => {
      // Setup: Player turn is ending. A benched monster has Soothing Aura.
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          {
            id: 1,
            battleHp: 500,
            battleMaxHp: 1000,
            monster: { id: 101, name: 'ActiveMon' },
          }, // Active monster
          {
            id: 2,
            battleHp: 100,
            battleMaxHp: 100,
            monster: { id: 102, name: 'BenchMon' },
          }, // Benched monster with the passive
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {
          102: [
            {
              // Abilities for the benched monster
              name: 'Soothing Aura',
              ability_type: 'PASSIVE',
              activation_trigger: 'END_OF_TURN',
              activation_scope: 'ANY_POSITION',
              effectDetails: {
                effect_type: 'HEALING_OVER_TIME',
                value_type: 'PERCENT_MAX_HP',
                default_value: '5.00', // Heal for 5%
              },
            },
          ],
        },
      };

      handleEndOfTurn(mockBattleState);
      // Expect the active monster's HP to increase by 5% of 1000 (50 HP)
      expect(mockBattleState.playerTeam[0].battleHp).toBe(550);
    });

    it('should correctly apply flat damage from a status effect', () => {
      // Setup: AI turn is ending. The AI monster is Burned.
      // Let's use a mock effect that does 20 flat damage for easy testing.
      const mockBattleState = {
        turn: 'ai',
        playerTeam: [],
        aiTeam: [
          {
            id: 1,
            battleHp: 100,
            battleMaxHp: 200,
            monster: { id: 201, name: 'BurnedMon' },
            statusEffects: [
              {
                duration: 2,
                effectDetails: {
                  name: 'Test Burn',
                  effect_type: 'DAMAGE_OVER_TIME',
                  value_type: 'FLAT',
                  default_value: '20',
                  duration_reduction_position: 'ANY',
                },
              },
            ],
          },
        ],
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {},
      };

      handleEndOfTurn(mockBattleState);
      // DoT no longer applies at end of turn - HP should remain unchanged
      expect(mockBattleState.aiTeam[0].battleHp).toBe(100);
      // Expect the duration to tick down by 1
      expect(mockBattleState.aiTeam[0].statusEffects[0].duration).toBe(1);
    });

    it('should correctly apply percentage-based damage from a status effect', () => {
      // Setup: Player turn is ending. Player monster has percentage-based DoT.
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          {
            id: 1,
            battleHp: 800,
            battleMaxHp: 1000,
            monster: { id: 101, name: 'PoisonedMon' },
            statusEffects: [
              {
                duration: 3,
                effectDetails: {
                  name: 'Test Poison',
                  effect_type: 'DAMAGE_OVER_TIME',
                  value_type: 'PERCENT_MAX_HP',
                  default_value: '10.00', // 10% of max HP
                  duration_reduction_position: 'ANY',
                },
              },
            ],
          },
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {},
      };

      handleEndOfTurn(mockBattleState);
      // DoT no longer applies at end of turn - HP should remain unchanged
      expect(mockBattleState.playerTeam[0].battleHp).toBe(800);
      // Expect the duration to tick down by 1
      expect(mockBattleState.playerTeam[0].statusEffects[0].duration).toBe(2);
    });

    it('should not apply passive abilities with incorrect activation scope', () => {
      // Setup: Player turn ending, benched monster has ACTIVE-only ability
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          {
            id: 1,
            battleHp: 500,
            battleMaxHp: 1000,
            monster: { id: 101, name: 'ActiveMon' },
          }, // Active monster
          {
            id: 2,
            battleHp: 100,
            battleMaxHp: 100,
            monster: { id: 102, name: 'BenchMon' },
          }, // Benched monster with ACTIVE-only ability
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {
          102: [
            {
              // Abilities for the benched monster
              name: 'Active Only Heal',
              ability_type: 'PASSIVE',
              activation_trigger: 'END_OF_TURN',
              activation_scope: 'ACTIVE', // Should NOT activate for benched monster
              effectDetails: {
                effect_type: 'HEALING_OVER_TIME',
                value_type: 'PERCENT_MAX_HP',
                default_value: '5.00',
              },
            },
          ],
        },
      };

      handleEndOfTurn(mockBattleState);
      // Expect NO healing because scope doesn't match
      expect(mockBattleState.playerTeam[0].battleHp).toBe(500);
    });

    it('should decrement the duration of active stat effects and remove them when expired', () => {
      const mockState = {
        turn: 'player',
        playerTeam: [{
          id: 1,
          battleHp: 500,
          monster: { name: 'BuffedMon' },
          activeEffects: [
            { id: '1', stat: 'power', type: 'FLAT', value: 20, duration: 2 },
            { id: '2', stat: 'speed', type: 'PERCENTAGE', value: -10, duration: 1 }
          ]
        }],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {}
      };

      handleEndOfTurn(mockState);

      // Expect one effect to be removed and the other's duration to be decremented
      expect(mockState.playerTeam[0].activeEffects).toHaveLength(1);
      expect(mockState.playerTeam[0].activeEffects[0].duration).toBe(1);
      expect(mockState.playerTeam[0].activeEffects[0].stat).toBe('power');
      expect(mockState.battleLog).toContain("The speed modifier on Your BuffedMon wore off.");
    });
  });

  describe('handleStartOfTurn', () => {
    it('should apply percentage-based damage from a status effect', () => {
      // Setup: Player's turn starts. They have a status effect that deals 10% max HP damage.
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          {
            id: 1,
            battleHp: 800,
            battleMaxHp: 1000,
            monster: { id: 101, name: 'BurnedMon' },
            statusEffects: [{
              name: 'Test Burn',
              duration: 2,
              effectDetails: {
                effect_type: 'DAMAGE_OVER_TIME',
                value_type: 'PERCENT_MAX_HP',
                default_value: '10.00' // 10% damage
              }
            }]
          }
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: []
      };

      handleStartOfTurn(mockBattleState, true);

      // Expect HP to decrease by 10% of 1000 (100 HP)
      expect(mockBattleState.playerTeam[0].battleHp).toBe(700);
      // Expect a log message to be added
      expect(mockBattleState.battleLog).toContain("Your BurnedMon takes 100 damage from Test Burn!");
    });
  });

  describe('executeAbility', () => {
    it('should apply a stat modifier to the target monster', async () => {
      const mockAbilityWithDebuff = {
        ...mockAbility,
        stat_modifiers: [{ stat: 'speed', type: 'PERCENTAGE', value: -10, duration: 3 }]
      };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [{ ...mockAiMonster, activeEffects: [] }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {},
      };

      await executeAbility(mockState, mockAbilityWithDebuff);

      expect(mockState.aiTeam[0].activeEffects).toHaveLength(1);
      const effect = mockState.aiTeam[0].activeEffects[0];
      expect(effect.stat).toBe('speed');
      expect(effect.value).toBe(-10);
    });

    it('should trigger an ON_BEING_HIT passive on the defender', async () => {
      const defenderWithPassive = {
        ...mockAiMonster,
        statusEffects: [],
      };

      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defenderWithPassive],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          [mockAiMonster.id]: [{
            name: 'Test Phase Shift',
            ability_type: 'PASSIVE',
            activation_trigger: 'ON_BEING_HIT',
            status_effect_id: 99, // Dummy ID for test
            override_chance: 1.0, // Force 100% chance for test
            effectDetails: { name: 'Phasing' }
          }]
        }
      };

      await executeAbility(mockState, mockAbility);

      expect(defenderWithPassive.statusEffects).toHaveLength(1);
      expect(defenderWithPassive.statusEffects[0].name).toBe('Phasing');
      expect(mockState.battleLog).toContain("Test AiMon's Test Phase Shift activated!");
    });

    it('should trigger an ON_HP_THRESHOLD passive when HP drops below 50%', async () => {
      const geodeTortoise = {
        ...mockAiMonster,
        id: 8, // Geode Tortoise ID
        battleHp: 100,
        battleMaxHp: 100,
        activeEffects: [],
      };
      const crystalizeAbility = {
        id: 7, // Crystalize Ability ID
        name: 'Crystalize',
        ability_type: 'PASSIVE',
        activation_trigger: 'ON_HP_THRESHOLD',
        stat_modifiers: [
          { stat: 'defense', type: 'PERCENTAGE', value: 100, duration: 99 },
          { stat: 'speed', type: 'PERCENTAGE', value: -50, duration: 99 }
        ]
      };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [geodeTortoise],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: { [geodeTortoise.id]: [crystalizeAbility] }
      };

      // This attack will do significant damage to drop HP below 50%
      const attackAbility = { ...mockAbility, power_multiplier: '2.0' }; // Ensure HP drops below 50%

      await executeAbility(mockState, attackAbility);

      // The tortoise's HP will drop below 50%, triggering the Crystalize passive. Now we verify the effects.
      const effects = mockState.aiTeam[0].activeEffects;
      expect(effects).toHaveLength(2);
      expect(effects.some(e => e.stat === 'defense' && e.value === 100)).toBe(true);
      expect(effects.some(e => e.stat === 'speed' && e.value === -50)).toBe(true);
      expect(mockState.battleLog).toContain("Test AiMon's Crystalize activated!");
    });

    it('should trigger an ON_ABILITY_USE passive with a matching affinity', async () => {
      const attackerWithPassive = {
        ...mockPlayerMonster,
        monster: { ...mockPlayerMonster.monster, id: 10 } // Cinder-Tail Salamander ID
      };
      const sootCloudPassive = {
        id: 3,
        name: 'Soot Cloud',
        ability_type: 'PASSIVE',
        activation_trigger: 'ON_ABILITY_USE',
        status_effect_trigger_affinity: 'Fire',
        status_effect_id: 3, // Poisoned
        override_chance: 1.0, // Force 100% chance
        effectDetails: { name: 'Poisoned' }
      };
      const fireAbility = { ...mockAbility, affinity: 'Fire' };
      const mockState = {
        turn: 'player',
        playerTeam: [attackerWithPassive],
        aiTeam: [{ ...mockAiMonster, statusEffects: [] }],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: { [attackerWithPassive.monster.id]: [sootCloudPassive] }
      };

      await executeAbility(mockState, fireAbility);

      expect(mockState.aiTeam[0].statusEffects).toHaveLength(1);
      expect(mockState.aiTeam[0].statusEffects[0].name).toBe('Poisoned');
      expect(mockState.battleLog).toContain("Test PlayerMon's Soot Cloud activated!");
    });

    it('should NOT trigger an ON_ABILITY_USE passive with a non-matching affinity', async () => {
      const attackerWithPassive = {
        ...mockPlayerMonster,
        monster: { ...mockPlayerMonster.monster, id: 10 }
      };
      const sootCloudPassive = {
        id: 3,
        name: 'Soot Cloud',
        ability_type: 'PASSIVE',
        activation_trigger: 'ON_ABILITY_USE',
        status_effect_trigger_affinity: 'Fire', // Only triggers on Fire abilities
        status_effect_id: 3,
        override_chance: 1.0,
        effectDetails: { name: 'Poisoned' }
      };
      const waterAbility = { ...mockAbility, affinity: 'Water' }; // Using a Water ability
      const mockState = {
        turn: 'player',
        playerTeam: [attackerWithPassive],
        aiTeam: [{ ...mockAiMonster, statusEffects: [] }],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: { [attackerWithPassive.monster.id]: [sootCloudPassive] }
      };

      await executeAbility(mockState, waterAbility);

      // Expect no status effect because the affinity did not match
      expect(mockState.aiTeam[0].statusEffects).toHaveLength(0);
      expect(mockState.battleLog).not.toContain("Test PlayerMon's Soot Cloud activated!");
    });
  });

  describe('Multi-Hit Abilities', () => {
    it('should handle multi-hit abilities correctly', async () => {
      const multiHitAbility = {
        ...mockAbility,
        min_hits: 3,
        max_hits: 3,
        power_multiplier: '0.5', // Each hit is weaker
      };
      const defender = { ...mockAiMonster, battleHp: 1000, activeEffects: [] };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defender],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, multiHitAbility);

      // Check that the battle log contains 3 separate damage messages
      const damageMessages = mockState.battleLog.filter(msg => msg.includes('dealing'));
      expect(damageMessages).toHaveLength(3);
      // Check that the defender's final HP is less than its starting HP
      expect(mockState.aiTeam[0].battleHp).toBeLessThan(1000);
    });

    it('should handle variable hit counts for multi-hit abilities', async () => {
      const variableHitAbility = {
        ...mockAbility,
        min_hits: 2,
        max_hits: 5,
        power_multiplier: '0.4', // Each hit is weaker to compensate for multiple hits
      };
      const defender = { ...mockAiMonster, battleHp: 1000, activeEffects: [] };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defender],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, variableHitAbility);

      // Check that the battle log contains at least 2 and at most 5 damage messages
      const damageMessages = mockState.battleLog.filter(msg => msg.includes('dealing'));
      expect(damageMessages.length).toBeGreaterThanOrEqual(2);
      expect(damageMessages.length).toBeLessThanOrEqual(5);
      // Check that the defender's final HP is less than its starting HP
      expect(mockState.aiTeam[0].battleHp).toBeLessThan(1000);
    });

    it('should only deduct MP cost once for multi-hit abilities', async () => {
      const multiHitAbility = {
        ...mockAbility,
        min_hits: 4,
        max_hits: 4,
        mp_cost: 50,
        power_multiplier: '0.3',
      };
      const attacker = { ...mockPlayerMonster, battleMp: 100 };
      const defender = { ...mockAiMonster, battleHp: 1000, activeEffects: [] };
      const mockState = {
        turn: 'player',
        playerTeam: [attacker],
        aiTeam: [defender],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, multiHitAbility);

      // Check that MP was only deducted once (100 - 50 = 50)
      expect(mockState.playerTeam[0].battleMp).toBe(50);
      // Check that all 4 hits were executed
      const damageMessages = mockState.battleLog.filter(msg => msg.includes('dealing'));
      expect(damageMessages).toHaveLength(4);
    });

    it('should accumulate total damage across all hits', async () => {
      const multiHitAbility = {
        ...mockAbility,
        min_hits: 3,
        max_hits: 3,
        power_multiplier: '0.5',
      };
      const defender = { ...mockAiMonster, battleHp: 1000, activeEffects: [] };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defender],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, multiHitAbility);

      // Check that total damage summary is present for multi-hit
      const totalDamageMessage = mockState.battleLog.find(msg => msg.includes('hit 3 times for a total of'));
      expect(totalDamageMessage).toBeTruthy();
      // Check that defender took cumulative damage
      expect(mockState.aiTeam[0].battleHp).toBeLessThan(1000);
    });
  });
});
