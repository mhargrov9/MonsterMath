import { describe, it, expect } from 'vitest';
import { getModifiedStat, calculateDamage } from './battleEngine';
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
    resistances: [],
    weaknesses: ['fire'],
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

        // Base Damage: (150 * 1.2) * (100 / (100 + 110)) = 180 * 0.476 = ~85.7
        // Affinity Modifier: 0.5x because Fire is weak against Water
        // Expected Damage: 85.7 * 0.5 = ~42.8
        // We expect the final damage to be in the variance range of 42.8
        expect(result.damage).toBeGreaterThanOrEqual(Math.floor(42.8 * 0.9));
        expect(result.damage).toBeLessThanOrEqual(Math.ceil(42.8 * 1.1));
        expect(result.affinityMultiplier).toBe(0.5);
    });
  });
});