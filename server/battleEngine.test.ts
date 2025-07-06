import { describe, it, expect } from 'vitest';
import { getModifiedStat, calculateDamage, handleEndOfTurn } from './battleEngine';
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
        levelUpgrades: {} 
    }
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
    levelUpgrades: {}
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
    target_scope: 'ACTIVE_OPPONENT'
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
  });

  describe('calculateDamage', () => {
    it('should calculate damage correctly and respect type weakness', () => {
        // This test checks a Fire attack against a Water monster (not very effective = 0.5x)
        const result = calculateDamage(mockPlayerMonster, mockAiMonster, { ...mockAbility, affinity: 'fire' });

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
  });

  describe('handleEndOfTurn', () => {
    it('should correctly apply percentage-based healing from a passive ability', () => {
      // Setup: Player turn is ending. A benched monster has Soothing Aura.
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          { id: 1, battleHp: 500, battleMaxHp: 1000, monster: { id: 101, name: 'ActiveMon' } }, // Active monster
          { id: 2, battleHp: 100, battleMaxHp: 100, monster: { id: 102, name: 'BenchMon' } }  // Benched monster with the passive
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {
          102: [{ // Abilities for the benched monster
            name: 'Soothing Aura',
            ability_type: 'PASSIVE',
            activation_trigger: 'END_OF_TURN',
            activation_scope: 'ANY_POSITION',
            effectDetails: {
              effect_type: 'HEALING_OVER_TIME',
              value_type: 'PERCENT_MAX_HP',
              default_value: '5.00' // Heal for 5%
            }
          }]
        }
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
            statusEffects: [{
              duration: 2,
              effectDetails: {
                name: 'Test Burn',
                effect_type: 'DAMAGE_OVER_TIME',
                value_type: 'FLAT',
                default_value: '20',
                duration_reduction_position: 'ANY'
              }
            }] 
          }
        ],
        activeAiIndex: 0,
        battleLog: [],
        abilities_map: {}
      };

      handleEndOfTurn(mockBattleState);
      // Expect HP to decrease by 20
      expect(mockBattleState.aiTeam[0].battleHp).toBe(80);
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
            statusEffects: [{
              duration: 3,
              effectDetails: {
                name: 'Test Poison',
                effect_type: 'DAMAGE_OVER_TIME',
                value_type: 'PERCENT_MAX_HP',
                default_value: '10.00', // 10% of max HP
                duration_reduction_position: 'ANY'
              }
            }] 
          }
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {}
      };

      handleEndOfTurn(mockBattleState);
      // Expect HP to decrease by 10% of 1000 (100 HP)
      expect(mockBattleState.playerTeam[0].battleHp).toBe(700);
      // Expect the duration to tick down by 1
      expect(mockBattleState.playerTeam[0].statusEffects[0].duration).toBe(2);
    });

    it('should not apply passive abilities with incorrect activation scope', () => {
      // Setup: Player turn ending, benched monster has ACTIVE-only ability
      const mockBattleState = {
        turn: 'player',
        playerTeam: [
          { id: 1, battleHp: 500, battleMaxHp: 1000, monster: { id: 101, name: 'ActiveMon' } }, // Active monster
          { id: 2, battleHp: 100, battleMaxHp: 100, monster: { id: 102, name: 'BenchMon' } }  // Benched monster with ACTIVE-only ability
        ],
        aiTeam: [],
        activePlayerIndex: 0,
        battleLog: [],
        abilities_map: {
          102: [{ // Abilities for the benched monster
            name: 'Active Only Heal',
            ability_type: 'PASSIVE',
            activation_trigger: 'END_OF_TURN',
            activation_scope: 'ACTIVE', // Should NOT activate for benched monster
            effectDetails: {
              effect_type: 'HEALING_OVER_TIME',
              value_type: 'PERCENT_MAX_HP',
              default_value: '5.00'
            }
          }]
        }
      };

      handleEndOfTurn(mockBattleState);
      // Expect NO healing because scope doesn't match
      expect(mockBattleState.playerTeam[0].battleHp).toBe(500);
    });
  });
});