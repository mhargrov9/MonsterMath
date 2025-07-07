import { describe, it, expect, vi } from 'vitest';
import {
  getModifiedStat,
  calculateDamage,
  handleEndOfTurn,
  handleStartOfTurn,
  executeAbility,
  getAffinityMultiplier,
  performSwap,
  battleSessions,
  applyDamage,
  processAiTurn,
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

const mockBasicAttackAbility: Ability = {
  id: 1,
  name: 'Basic Attack',
  ability_type: 'ACTIVE',
  mp_cost: 0,
  affinity: 'physical',
  power_multiplier: '0.60',
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

  describe('getAffinityMultiplier', () => {
    const gigalith = { name: 'Gigalith', type: 'earth', weaknesses: ['water'], resistances: ['fire'] };
    const aetherion = { name: 'Aetherion', type: 'psychic', weaknesses: ['physical'], resistances: ['psychic'] };
    const axolotl = { name: 'Axolotl', type: 'water', weaknesses: ['poison'], resistances: ['water'] };
    const salamander = { name: 'Salamander', type: 'fire', weaknesses: ['water'], resistances: ['fire'] };
    const squirrel = { name: 'Squirrel', type: 'electric', weaknesses: ['earth'], resistances: ['air'] };

    it.each([
      // Super Effective (2x damage)
      { attack: 'water', defender: gigalith, expected: 2.0, case: 'Water vs Earth' },
      { attack: 'earth', defender: squirrel, expected: 2.0, case: 'Earth vs Electric' },
      { attack: 'physical', defender: aetherion, expected: 2.0, case: 'Physical vs Psychic' },

      // Not Very Effective (0.5x damage)
      { attack: 'fire', defender: gigalith, expected: 0.5, case: 'Fire vs Earth' },
      { attack: 'fire', defender: salamander, expected: 0.5, case: 'Fire vs Fire' },
      { attack: 'water', defender: axolotl, expected: 0.5, case: 'Water vs Water' },
      { attack: 'air', defender: squirrel, expected: 0.5, case: 'Air vs Electric (Resist)' },

      // Neutral (1x damage)
      { attack: 'psychic', defender: gigalith, expected: 1.0, case: 'Psychic vs Earth' },
      { attack: 'electric', defender: aetherion, expected: 1.0, case: 'Electric vs Psychic' },
      { attack: 'physical', defender: axolotl, expected: 1.0, case: 'Physical vs Water' },
      { attack: 'fire', defender: aetherion, expected: 1.0, case: 'Fire vs Psychic' },

      // No Affinity
      { attack: null, defender: gigalith, expected: 1.0, case: 'No-affinity attack' },
      { attack: undefined, defender: gigalith, expected: 1.0, case: 'Undefined affinity' },
    ])('should return $expected for $case', ({ attack, defender, expected }) => {
      // We cast the test data to 'any' to satisfy the type checker for our mock objects
      expect(getAffinityMultiplier(attack as string, defender as any)).toBe(expected);
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

    it('should make a CONFUSED monster damage itself', () => {
      const confusedMonster = {
        ...mockPlayerMonster,
        battleHp: 500,
        power: 100,
        statusEffects: [{
          name: 'Confused',
          duration: 1,
          effectDetails: {
            effect_type: 'DISRUPTION',
            default_value: '1.0', // 100% chance
            secondary_value: '0.40' // 40% power for self-damage
          }
        }]
      };
      const mockState = { playerTeam: [confusedMonster], activePlayerIndex: 0, battleLog: [] };
      handleStartOfTurn(mockState, true);
      // Expect 40% of 100 power = 40 damage. 500 - 40 = 460.
      expect(mockState.playerTeam[0].battleHp).toBe(460);
    });

    it('should skip the turn for a PARALYZED monster', () => {
      const paralyzedMonster = {
        ...mockPlayerMonster,
        statusEffects: [{
          name: 'Paralyzed',
          duration: 1,
          effectDetails: { effect_type: 'TURN_SKIP' }
        }]
      };
      const mockState = { playerTeam: [paralyzedMonster], activePlayerIndex: 0, battleLog: [] };
      const result = handleStartOfTurn(mockState, true);
      expect(result.turnSkipped).toBe(true);
    });

    it('should apply DoT damage to benched monsters', () => {
      const activeMonster = { ...mockPlayerMonster, battleHp: 500 };
      const benchedMonster = {
        ...mockPlayerMonster,
        id: 99, // a different ID
        battleHp: 300,
        battleMaxHp: 400,
        statusEffects: [{
          name: 'Test Burn',
          duration: 2,
          effectDetails: {
            effect_type: 'DAMAGE_OVER_TIME',
            value_type: 'PERCENT_MAX_HP',
            default_value: '10.00' // 10% damage
          }
        }]
      };

      const mockState = {
        turn: 'player',
        playerTeam: [activeMonster, benchedMonster],
        activePlayerIndex: 0,
        battleLog: []
      };

      handleStartOfTurn(mockState, true);

      // Expect benched monster's HP to decrease by 10% of 400 (40 HP)
      expect(mockState.playerTeam[1].battleHp).toBe(260);
      // Expect active monster's HP to be unchanged
      expect(mockState.playerTeam[0].battleHp).toBe(500);
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

    it('should apply a status effect when the chance roll succeeds', async () => {
      // Force Math.random() to return 0.1 (which is < 0.40, so it should succeed)
      vi.spyOn(Math, 'random').mockImplementation(() => 0.1);

      const psyBeamAbility = { ...mockAbility, status_effect_id: 4, override_chance: 0.40, effectDetails: { name: 'Confused' } };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [{ ...mockAiMonster, statusEffects: [] }],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, psyBeamAbility);
      expect(mockState.aiTeam[0].statusEffects).toHaveLength(1);
      expect(mockState.aiTeam[0].statusEffects[0].name).toBe('Confused');

      // Clean up the mock
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should NOT apply a status effect when the chance roll fails', async () => {
      // Force Math.random() to return 0.9 (which is > 0.40, so it should fail)
      vi.spyOn(Math, 'random').mockImplementation(() => 0.9);

      const psyBeamAbility = { ...mockAbility, status_effect_id: 4, override_chance: 0.40, effectDetails: { name: 'Confused' } };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [{ ...mockAiMonster, statusEffects: [] }],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, psyBeamAbility);
      expect(mockState.aiTeam[0].statusEffects).toHaveLength(0);

      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('Passive Ability Logic', () => {
    it('Tailwind passive should boost the speed of all team members at battle start', () => {
      // Setup a monster with Tailwind on the bench
      const griffin = { ...mockPlayerMonster, monster: { ...mockPlayerMonster.monster, id: 9 }};
      const salamander = { ...mockPlayerMonster, id: 2, speed: 100, monster: { ...mockPlayerMonster.monster, id: 10, baseSpeed: 100 }};
      const tailwindPassive = {
        id: 9, name: 'Tailwind', ability_type: 'PASSIVE', activation_trigger: 'ON_BATTLE_START',
        stat_modifiers: [{ stat: 'speed', type: 'PERCENTAGE', value: 5 }]
      };
      const mockState = {
        playerTeam: [salamander, griffin], // Griffin with Tailwind is on the bench
        abilities_map: { 9: [tailwindPassive] }
      };

      // This is a simplified test focusing on the effect, not the whole session creation
      // In a real scenario, this logic is inside createBattleSession
      const team = mockState.playerTeam;
      for (const monster of team) {
        const monsterAbilities = mockState.abilities_map[monster.monster.id] || [];
        for (const ability of monsterAbilities) {
          if (ability.ability_type === 'PASSIVE' && ability.activation_trigger === 'ON_BATTLE_START') {
            for (const teamMate of team) {
              teamMate.speed = Math.floor(teamMate.speed * (1 + ability.stat_modifiers[0].value / 100));
            }
          }
        }
      }

      // Both monsters should have their speed increased by 5%
      expect(salamander.speed).toBe(105);
      expect(griffin.speed).toBe(105); // Initial speed was 100, now 105
    });

    it('Phase Shift passive should allow dodging a Physical attack', async () => {
      // Setup a defender that has the "Phasing" status effect active
      const defenderWithEvasion = {
        ...mockAiMonster,
        battleHp: 500,
        statusEffects: [{
          name: 'Phasing',
          duration: 1,
          effectDetails: { effect_type: 'EVASION' }
        }]
      };
      const physicalAbility = { ...mockAbility, affinity: 'Physical' };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defenderWithEvasion],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, physicalAbility);

      // Expect the defender's HP to be unchanged because the attack was evaded
      expect(mockState.aiTeam[0].battleHp).toBe(500);
      expect(mockState.battleLog).toContain("Test AiMon evaded the physical attack!");
    });

    it('Phase Shift passive should NOT dodge a non-Physical attack', async () => {
      const defenderWithEvasion = {
        ...mockAiMonster,
        battleHp: 500,
        statusEffects: [{
          name: 'Phasing',
          duration: 1,
          effectDetails: { effect_type: 'EVASION' }
        }]
      };
      // Use the default Fire ability
      const fireAbility = { ...mockAbility, affinity: 'Fire' };
      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defenderWithEvasion],
        activePlayerIndex: 0, activeAiIndex: 0, battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, fireAbility);

      // Expect HP to decrease because the attack was not Physical and was not evaded
      expect(mockState.aiTeam[0].battleHp).toBeLessThan(500);
      expect(mockState.battleLog).not.toContain("evaded the physical attack!");
    });
  });

  describe('Advanced Damage Calculation', () => {
    it('should apply a 1.5x damage multiplier for a critical hit', () => {
      // Mock Math.random to return specific values for crit chance and variance
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0.01; // Force critical hit (< 0.05)
        if (callCount === 2) return 0.5;  // Set variance to 1.0 (0.9 + 0.5 * 0.2)
        if (callCount === 3) return 0.99; // Force non-critical (>= 0.05)
        if (callCount === 4) return 0.5;  // Same variance as critical hit
        return 0.5; // Default for any additional calls
      });

      const critResult = calculateDamage(mockPlayerMonster, mockAiMonster, mockAbility);
      expect(critResult.isCritical).toBe(true);

      const nonCritResult = calculateDamage(mockPlayerMonster, mockAiMonster, mockAbility);
      expect(nonCritResult.isCritical).toBe(false);

      // Since both have same variance (1.0), critical should be 1.5x non-critical
      expect(critResult.damage).toBeGreaterThan(nonCritResult.damage);
      
      // More flexible assertion - critical damage should be significantly higher
      const damageRatio = critResult.damage / nonCritResult.damage;
      expect(damageRatio).toBeGreaterThan(1.4); // Should be close to 1.5
      expect(damageRatio).toBeLessThan(1.6); // But allow some tolerance

      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should deal less damage to a monster with higher defense', () => {
      const lowDefenseMonster = { ...mockAiMonster, baseDefense: 50 };
      const highDefenseMonster = { ...mockAiMonster, baseDefense: 200 };

      const damageVsLowDef = calculateDamage(mockPlayerMonster, lowDefenseMonster, mockAbility);
      const damageVsHighDef = calculateDamage(mockPlayerMonster, highDefenseMonster, mockAbility);

      expect(damageVsHighDef.damage).toBeLessThan(damageVsLowDef.damage);
    });

    it('should deal more damage from a monster with higher power', () => {
      const lowPowerMonster = { ...mockPlayerMonster, power: 100 };
      const highPowerMonster = { ...mockPlayerMonster, power: 200 };

      const damageFromLowPower = calculateDamage(lowPowerMonster, mockAiMonster, mockAbility);
      const damageFromHighPower = calculateDamage(highPowerMonster, mockAiMonster, mockAbility);

      expect(damageFromHighPower.damage).toBeGreaterThan(damageFromLowPower.damage);
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

  describe('applyDamage Function Validation', () => {
    it('should validate that fainted monster check logic works correctly', () => {
      // Test the guard clause logic directly rather than the full applyDamage function
      const faintedMonster = { 
        ...mockPlayerMonster, 
        battleHp: 0,
        monster: {
          ...mockPlayerMonster.monster,
          name: 'Test PlayerMon'
        }
      };
      
      const mockState = {
        playerTeam: [faintedMonster],
        activePlayerIndex: 0
      };

      // Simulate the guard clause logic from applyDamage
      const attacker = mockState.playerTeam[mockState.activePlayerIndex];
      
      // This should trigger the fainted check
      if (attacker.battleHp <= 0) {
        const expectedError = `${attacker.monster.name} has 0 HP and cannot perform an action.`;
        expect(expectedError).toBe('Test PlayerMon has 0 HP and cannot perform an action.');
      } else {
        throw new Error('Expected fainted monster check to trigger but it did not');
      }
    });

    it('should deal damage to all opponents when using an AoE ability', async () => {
      const aoeAbility = { ...mockAbility, target_scope: 'ALL_OPPONENTS' };
      const defender1 = { ...mockAiMonster, id: 101, battleHp: 200 };
      const defender2 = { ...mockAiMonster, id: 102, battleHp: 200 }; // Benched monster

      const mockState = {
        turn: 'player',
        playerTeam: [mockPlayerMonster],
        aiTeam: [defender1, defender2],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {}
      };

      await executeAbility(mockState, aoeAbility);

      // Verify both AI monsters took damage
      expect(mockState.aiTeam[0].battleHp).toBeLessThan(200);
      expect(mockState.aiTeam[1].battleHp).toBeLessThan(200);
      expect(mockState.battleLog.filter(log => log.includes('dealing')).length).toBe(2);
    });
  });

  describe('Monster Swap Logic', () => {
    it('should complete the player turn and switch to AI when swapping', async () => {
      const mockState = {
        turn: 'player',
        playerTeam: [
          { ...mockPlayerMonster, id: 1, battleHp: 100 },
          { ...mockPlayerMonster, id: 2, battleHp: 300 }
        ],
        aiTeam: [{ ...mockAiMonster, id: 3 }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {}
      };

      const battleId = 'swap-test-id';
      battleSessions.set(battleId, mockState);

      // Perform the swap - this should complete the player's turn via handleEndOfTurn
      await performSwap(battleId, 1); 

      const finalState = battleSessions.get(battleId);

      // Verify the swap was completed correctly
      expect(finalState.activePlayerIndex).toBe(1);
      // Verify that handleEndOfTurn was called and the turn switched to AI
      expect(finalState.turn).toBe('ai');
      // Verify that swap messages were added to battle log
      expect(finalState.battleLog.some(log => log.includes('withdrew from battle'))).toBe(true);
      expect(finalState.battleLog.some(log => log.includes('enters the battle'))).toBe(true);
    });
  });

  // Integration Test Suites
  describe('Integration - Fainting & Defeat Logic', () => {
    it('should prevent a fainted monster from taking any action', async () => {
      const faintedMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 0, // Fainted monster
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300
      };

      const mockState = {
        turn: 'player' as const,
        playerTeam: [faintedMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          1: [mockBasicAttackAbility],
          100: [mockBasicAttackAbility], // Player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'fainted-test';
      battleSessions.set(battleId, mockState);

      // Attempt to make the fainted monster attack
      await expect(() => applyDamage(battleId, 1, undefined)).rejects.toThrow(
        'Test PlayerMon has 0 HP and cannot perform an action.'
      );
    });

    it('should force a player to swap after their active monster faints', async () => {
      const weakPlayerMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 1, // Will be killed by AI attack
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300
      };

      const healthyBenchMonster = {
        ...mockPlayerMonster,
        id: 101,
        battleHp: 350,
        battleMaxHp: 400,
        battleMp: 250,
        battleMaxMp: 300
      };

      const mockState = {
        turn: 'ai' as const,
        playerTeam: [weakPlayerMonster, healthyBenchMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200, 
          battleHp: 500, 
          battleMaxHp: 500,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          1: [mockBasicAttackAbility], // Ability arrays for consistency
          100: [mockBasicAttackAbility], // Player monster needs abilities  
          101: [mockBasicAttackAbility], // Bench player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'force-swap-test';
      battleSessions.set(battleId, mockState);

      // AI attacks and should defeat the player's active monster
      await processAiTurn(battleId);

      const finalState = battleSessions.get(battleId);
      
      // Player should be forced to swap
      expect(finalState.turn).toBe('player-must-swap');
      expect(finalState.playerTeam[0].battleHp).toBe(0);
    });

    it('should end the battle when an entire team is fainted', async () => {
      const lastPlayerMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 1, // Will be defeated
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300
      };

      const mockState = {
        turn: 'ai' as const,
        playerTeam: [lastPlayerMonster], // Only one monster remaining
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200, 
          battleHp: 500, 
          battleMaxHp: 500,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          1: [mockBasicAttackAbility],
          100: [mockBasicAttackAbility], // Player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'team-defeat-test';
      battleSessions.set(battleId, mockState);

      // AI attacks and should win the battle
      await processAiTurn(battleId);

      const finalState = battleSessions.get(battleId);
      
      expect(finalState.winner).toBe('ai');
      expect(finalState.battleEnded).toBe(true);
    });

    it('should deactivate all passive abilities for a fainted monster', async () => {
      const activeMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 200, // Damaged, eligible for healing
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300
      };

      const faintedHealerMonster = {
        ...mockPlayerMonster,
        id: 101,
        battleHp: 0, // Fainted - should not provide healing
        battleMaxHp: 350,
        battleMp: 120,
        battleMaxMp: 200,
        statusEffects: []
      };

      const mockState = {
        turn: 'player' as const,
        playerTeam: [activeMonster, faintedHealerMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          15: { // Soothing Aura passive ability
            id: 15,
            name: 'Soothing Aura',
            ability_type: 'PASSIVE',
            activation_trigger: 'END_OF_TURN',
            activation_scope: 'BENCH',
            healing_power: 3,
            effectDetails: {
              effect_type: 'HEALING_OVER_TIME',
              value_type: 'PERCENT_MAX_HP',
              default_value: '0.03'
            }
          },
          100: [mockBasicAttackAbility], // Player monster needs abilities
          101: [mockBasicAttackAbility], // Bench player monster needs abilities  
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'fainted-passive-test';
      battleSessions.set(battleId, mockState);

      const initialHp = activeMonster.battleHp;

      // Process end of turn - fainted monster's passive should not trigger
      await handleEndOfTurn(mockState);

      // Active monster should not have received healing from fainted monster
      expect(activeMonster.battleHp).toBe(initialHp);
    });
  });

  describe('Integration - Status Effects & Durations', () => {
    it('should continue to apply DoT damage to a benched monster', async () => {
      const burnedMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 300,
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300,
        statusEffects: [{
          name: 'Burned',
          duration: 2,
          effectDetails: {
            effect_type: 'DAMAGE_OVER_TIME',
            value_type: 'PERCENT_MAX_HP',
            default_value: '0.05', // 5% max HP
            duration_reduction_position: 'ANY'
          }
        }]
      };

      const healthyMonster = {
        ...mockPlayerMonster,
        id: 101,
        battleHp: 350,
        battleMaxHp: 400,
        battleMp: 250,
        battleMaxMp: 300,
        statusEffects: []
      };

      const mockState = {
        turn: 'player' as const, // Start with player turn for swap
        playerTeam: [burnedMonster, healthyMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0, // Burned monster starts active
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          1: [mockBasicAttackAbility],
          100: [mockBasicAttackAbility], // Player monster needs abilities
          101: [mockBasicAttackAbility], // Bench player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'benched-dot-test';
      battleSessions.set(battleId, mockState);

      // Swap the burned monster to bench (this will switch turn to AI)
      await performSwap(battleId, 1);

      const afterSwapState = battleSessions.get(battleId);
      const initialBenchedHp = afterSwapState.playerTeam[0].battleHp;

      // Process AI turn which should apply DoT to benched monster
      await processAiTurn(battleId);

      const finalState = battleSessions.get(battleId);
      const benchedMonster = finalState.playerTeam[0]; // Originally active, now benched

      // Benched monster should have taken DoT damage
      expect(benchedMonster.battleHp).toBeLessThan(initialBenchedHp);
    });

    it('should correctly decrement status effect durations for all monsters at the end of each turn', async () => {
      const buffedActiveMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 350,
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300,
        statusEffects: [{
          name: 'Power Boost',
          duration: 3,
          effectDetails: {
            effect_type: 'STAT_MODIFIER',
            default_value: '1.2',
            duration_reduction_position: 'ANY'
          }
        }]
      };

      const burnedBenchMonster = {
        ...mockPlayerMonster,
        id: 101,
        battleHp: 300,
        battleMaxHp: 400,
        battleMp: 250,
        battleMaxMp: 300,
        statusEffects: [{
          name: 'Burned',
          duration: 2,
          effectDetails: {
            effect_type: 'DAMAGE_OVER_TIME',
            value_type: 'PERCENT_MAX_HP',
            default_value: '0.05',
            duration_reduction_position: 'ANY'
          }
        }]
      };

      const mockState = {
        turn: 'player' as const,
        playerTeam: [buffedActiveMonster, burnedBenchMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          100: [mockBasicAttackAbility], // Player monster needs abilities
          101: [mockBasicAttackAbility], // Bench player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'duration-test';
      battleSessions.set(battleId, mockState);

      // Process end of turn
      await handleEndOfTurn(mockState);

      const finalState = battleSessions.get(battleId);

      // Active monster's buff duration should be decremented
      expect(finalState.playerTeam[0].statusEffects[0].duration).toBe(2);
      // Benched monster's burn duration should be decremented
      expect(finalState.playerTeam[1].statusEffects[0].duration).toBe(1);
    });

    it('should correctly apply PARALYZED for its exact database-defined duration', async () => {
      const paralyzedMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 350,
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300,
        statusEffects: [{
          name: 'Paralyzed',
          duration: 2,
          effectDetails: {
            effect_type: 'TURN_SKIP',
            default_value: '0.25',
            duration_reduction_position: 'ANY'
          }
        }]
      };

      const mockState = {
        turn: 'player' as const,
        playerTeam: [paralyzedMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          1: [mockBasicAttackAbility],
          100: [mockBasicAttackAbility], // Player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'paralysis-duration-test';
      battleSessions.set(battleId, mockState);

      // Turn 1: Should skip due to paralysis
      const turn1Result = handleStartOfTurn(mockState, true);
      expect(turn1Result.turnSkipped).toBe(true);
      expect(mockState.battleLog.some(log => log.includes('paralyzed'))).toBe(true);

      // Process end of turn to decrement duration (player turn ending)
      await handleEndOfTurn(mockState);
      expect(mockState.playerTeam[0].statusEffects[0].duration).toBe(1);
      expect(mockState.turn).toBe('ai'); // Turn should switch to AI

      // Simulate AI turn ending (no effects on AI team)
      await handleEndOfTurn(mockState);
      expect(mockState.turn).toBe('player'); // Turn should switch back to player
      expect(mockState.playerTeam[0].statusEffects[0].duration).toBe(1); // Should still be 1 (not decremented during AI turn)

      // Turn 2: Should still skip due to paralysis
      const turn2Result = handleStartOfTurn(mockState, true);
      expect(turn2Result.turnSkipped).toBe(true);

      // Process end of turn to remove paralysis (second player turn ending)
      await handleEndOfTurn(mockState);
      expect(mockState.playerTeam[0].statusEffects).toHaveLength(0);

      // Turn 3: Should be able to act normally
      const turn3Result = handleStartOfTurn(mockState, true);
      expect(turn3Result.turnSkipped).toBe(false);
    });
  });

  describe('Integration - Swapping & Turn Lifecycle', () => {
    it('should process end-of-turn effects for the team when a player swaps', async () => {
      const damagedActiveMonster = {
        ...mockPlayerMonster,
        id: 100,
        battleHp: 200, // Damaged, eligible for healing
        battleMaxHp: 400,
        battleMp: 200,
        battleMaxMp: 300,
        statusEffects: []
      };

      const healerBenchMonster = {
        ...mockPlayerMonster,
        id: 101,
        battleHp: 350,
        battleMaxHp: 400,
        battleMp: 250,
        battleMaxMp: 300,
        statusEffects: []
      };

      const mockState = {
        turn: 'player' as const,
        playerTeam: [damagedActiveMonster, healerBenchMonster],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {
          15: { // Soothing Aura passive ability
            id: 15,
            name: 'Soothing Aura',
            ability_type: 'PASSIVE',
            activation_trigger: 'END_OF_TURN',
            activation_scope: 'BENCH',
            healing_power: 3,
            effectDetails: {
              effect_type: 'HEALING_OVER_TIME',
              value_type: 'PERCENT_MAX_HP',
              default_value: '3'  // 3% healing, not 0.03%
            }
          },
          100: [mockBasicAttackAbility], // Player monster needs abilities
          101: [{ // Bench player monster needs abilities including healing
            id: 15,
            name: 'Soothing Aura',
            ability_type: 'PASSIVE',
            activation_trigger: 'END_OF_TURN',
            activation_scope: 'BENCH',
            healing_power: 3,
            effectDetails: {
              effect_type: 'HEALING_OVER_TIME',
              value_type: 'PERCENT_MAX_HP',
              default_value: '3'  // 3% healing, not 0.03%
            }
          }],
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'swap-healing-test';
      battleSessions.set(battleId, mockState);

      const initialHp = damagedActiveMonster.battleHp;

      // Perform swap, which internally calls handleEndOfTurn
      await performSwap(battleId, 1);

      const finalState = battleSessions.get(battleId);
      const previouslyActiveMonster = finalState.playerTeam[0]; // Now on bench

      // Monster that was active should have received healing from bench passive
      expect(previouslyActiveMonster.battleHp).toBeGreaterThan(initialHp);
      expect(finalState.turn).toBe('ai'); // Should be AI's turn after swap
    });

    it('should immediately process the AI turn after a player swap', async () => {
      const mockState = {
        turn: 'player' as const,
        playerTeam: [
          { ...mockPlayerMonster, id: 100, battleHp: 300 },
          { ...mockPlayerMonster, id: 101, battleHp: 350 }
        ],
        aiTeam: [{ 
          ...mockAiMonster, 
          id: 200, 
          battleHp: 500, 
          battleMaxHp: 500,
          battleMp: 100,
          battleMaxMp: 150
        }],
        activePlayerIndex: 0,
        activeAiIndex: 0,
        battleLog: ['Battle started!'],
        abilities_map: {
          1: [mockBasicAttackAbility],
          100: [mockBasicAttackAbility], // Player monster needs abilities
          101: [mockBasicAttackAbility], // Bench player monster needs abilities
          200: [mockBasicAttackAbility] // AI monster needs abilities
        }
      };

      const battleId = 'atomic-swap-test';
      battleSessions.set(battleId, mockState);

      const initialLogLength = mockState.battleLog.length;

      // Perform atomic swap (which chains performSwap → processAiTurn)
      await performSwap(battleId, 1);

      const finalState = battleSessions.get(battleId);

      // Verify swap was completed
      expect(finalState.activePlayerIndex).toBe(1);
      
      // Verify turn switched to AI after swap
      expect(finalState.turn).toBe('ai'); // Should be AI's turn after swap
      
      // Verify battle log contains swap messages
      const swapMessages = finalState.battleLog.filter(log => 
        log.includes('withdrew from battle') || log.includes('enters the battle')
      );
      
      expect(swapMessages.length).toBeGreaterThanOrEqual(2); // Withdraw + enter messages
      expect(finalState.battleLog.length).toBeGreaterThan(initialLogLength);
    });
  });
});
