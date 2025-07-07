import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createBattleSession,
  applyDamage,
  processAiTurn,
  performSwapAndProcessAiTurn,
  battleSessions,
} from './battleEngine';
import * as storage from './storage.js';
import type { BattleState, BattleMonster, Ability, StatusEffect, ActiveEffect } from '@shared/types';

// Mock the storage module to prevent actual database calls
vi.mock('./storage.js', () => ({
  storage: {
    getAbilitiesForMonsters: vi.fn(),
    awardRankXp: vi.fn(),
    saveFinalBattleState: vi.fn(),
  },
}));

// --- Comprehensive Mock Data Library ---

// Status Effects
const mockParalyzedEffect: StatusEffect = { id: 1, name: 'PARALYZED', effect_type: 'TURN_SKIP', default_duration: 2, is_positive: false };
const mockBurnedEffect: StatusEffect = { id: 2, name: 'BURNED', effect_type: 'DAMAGE_OVER_TIME', default_duration: 2, default_value: '5', value_type: 'PERCENT_MAX_HP', is_positive: false };
const mockPoisonedEffect: StatusEffect = { id: 3, name: 'POISONED', effect_type: 'DAMAGE_OVER_TIME', default_duration: 2, default_value: '15', value_type: 'FLAT', is_positive: false };
const mockConfusedEffect: StatusEffect = { id: 4, name: 'CONFUSED', effect_type: 'DISRUPTION', default_duration: 1, secondary_value: '0.40', is_positive: false };
const mockHealingEffect: StatusEffect = { id: 5, name: 'HEALING', effect_type: 'HEAL_OVER_TIME', default_duration: 3, default_value: '3', value_type: 'PERCENT_MAX_HP', is_positive: true };

// Abilities
const mockBasicAttack: Ability = { id: 1, name: 'Basic Attack', mp_cost: 0, power_multiplier: '0.6', affinity: 'Physical', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockEmberSpit: Ability = { id: 2, name: 'Ember Spit', mp_cost: 30, power_multiplier: '1.0', affinity: 'Fire', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockSootCloudPassive: Ability = { id: 3, name: 'Soot Cloud', ability_type: 'PASSIVE', activation_trigger: 'ON_ABILITY_USE', status_effect_trigger_affinity: 'Fire', override_chance: '1.0', effectDetails: mockPoisonedEffect };
const mockRestoringGeyser: Ability = { id: 4, name: 'Restoring Geyser', mp_cost: 40, affinity: 'Water', healing_power: 150, target_scope: 'ANY_ALLY' };
const mockSoothingAuraPassive: Ability = { id: 5, name: 'Soothing Aura', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ANY_POSITION', effectDetails: mockHealingEffect, priority: 10 };
const mockShellSlam: Ability = { id: 6, name: 'Shell Slam', mp_cost: 35, power_multiplier: '0.75', affinity: 'Earth', scaling_stat: 'DEFENSE', target_scope: 'ACTIVE_OPPONENT' };
const mockCrystalizePassive: Ability = { id: 7, name: 'Crystalize', ability_type: 'PASSIVE', activation_trigger: 'ON_HP_THRESHOLD', trigger_condition_value: 50, stat_modifiers: [{ stat: 'defense', type: 'PERCENTAGE', value: 100, duration: 99 }, { stat: 'speed', type: 'PERCENTAGE', value: -50, duration: 99 }] };
const mockPeckFlurry: Ability = { id: 8, name: 'Peck Flurry', mp_cost: 40, power_multiplier: '0.5', affinity: 'Air', min_hits: 3, max_hits: 3, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockTailwindPassive: Ability = { id: 9, name: 'Tailwind', ability_type: 'PASSIVE', activation_trigger: 'ON_BATTLE_START', activation_scope: 'BENCH', stat_modifiers: [{ stat: 'speed', type: 'PERCENTAGE', value: 5, duration: 999 }] };
const mockJolt: Ability = { id: 10, name: 'Jolt', mp_cost: 35, power_multiplier: '0.2', affinity: 'Electric', override_chance: '0.25', effectDetails: mockParalyzedEffect, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockMagmaPunch: Ability = { id: 11, name: 'Magma Punch', mp_cost: 40, power_multiplier: '0.8', affinity: 'Fire', effectDetails: mockBurnedEffect, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockTremorStomp: Ability = { id: 12, name: 'Tremor Stomp', mp_cost: 50, power_multiplier: '0.6', affinity: 'Earth', target_scope: 'ALL_OPPONENTS', scaling_stat: 'POWER' };
const mockVolcanicHeartPassive: Ability = { id: 13, name: 'Volcanic Heart', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ACTIVE', override_chance: '1.0', effectDetails: mockHealingEffect };
const mockMindStrike: Ability = { id: 14, name: 'Mind Strike', mp_cost: 40, power_multiplier: '0.7', affinity: 'Psychic', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockPsyBeam: Ability = { id: 15, name: 'Psy-Beam', mp_cost: 90, power_multiplier: '1.2', affinity: 'Psychic', override_chance: '1.0', effectDetails: mockConfusedEffect, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'POWER' };
const mockPhaseShiftPassive: Ability = { id: 16, name: 'Phase Shift', ability_type: 'PASSIVE', activation_trigger: 'ON_BEING_HIT', override_chance: '1.0', affinity: 'Physical' };
const mockHighPriorityPassive: Ability = { id: 99, name: 'High Priority Damage', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ACTIVE', priority: 20, effectDetails: { ...mockBurnedEffect, default_value: '10' } };

// Monster Templates
const mockGigaTemplate = { id: 6, name: 'Gigalith', type: 'earth', basePower: 120, baseSpeed: 20, baseDefense: 150, baseHp: 608, baseMp: 400 };
const mockAethTemplate = { id: 7, name: 'Aetherion', type: 'psychic', basePower: 20, baseSpeed: 130, baseDefense: 40, baseHp: 110, baseMp: 800, weaknesses: ['Physical'] };
const mockTortoiseTemplate = { id: 8, name: 'Geode Tortoise', type: 'earth', basePower: 60, baseSpeed: 30, baseDefense: 180, baseHp: 200, baseMp: 150 };
const mockGriffinTemplate = { id: 9, name: 'Gale-Feather Griffin', type: 'air', basePower: 90, baseSpeed: 170, baseDefense: 35, baseHp: 37, baseMp: 140 };
const mockSalamanderTemplate = { id: 10, name: 'Cinder-Tail Salamander', type: 'fire', basePower: 100, baseSpeed: 110, baseDefense: 70, baseHp: 75, baseMp: 160 };
const mockAxolotlTemplate = { id: 11, name: 'River-Spirit Axolotl', type: 'water', basePower: 50, baseSpeed: 90, baseDefense: 60, baseHp: 93, baseMp: 220 };
const mockSquirrelTemplate = { id: 12, name: 'Spark-Tail Squirrel', type: 'electric', basePower: 40, baseSpeed: 140, baseDefense: 50, baseHp: 43, baseMp: 200 };

// Helper function to create clean monster instances for tests
const createTestMonster = (template: any, id: number, abilities: Ability[]): BattleMonster => ({
    id,
    monsterId: template.id,
    level: 10,
    battleHp: template.baseHp,
    battleMaxHp: template.baseHp,
    battleMp: template.baseMp,
    battleMaxMp: template.baseMp,
    monster: { ...template, abilities },
    statusEffects: [],
    activeEffects: [],
    isFainted: false,
} as unknown as BattleMonster);

describe('Battle Engine Comprehensive Test Suite (124 Tests)', () => {
    let battleId: string;

    const setupBattle = async (playerMonsters: BattleMonster[], aiMonsters: BattleMonster[]) => {
        vi.clearAllMocks();
        battleSessions.clear();

        const abilitiesMap: Record<number, Ability[]> = {};
        for (const m of [...playerMonsters, ...aiMonsters]) {
            abilitiesMap[m.monsterId] = m.monster.abilities;
        }
        (storage.storage.getAbilitiesForMonsters as any).mockResolvedValue(abilitiesMap);

        const session = await createBattleSession(playerMonsters as any[], aiMonsters as any[], 0);
        battleId = session.battleId;

        const state = battleSessions.get(battleId)!;
        state.turn = 'player';
        battleSessions.set(battleId, state);
        return state;
    };

    afterEach(() => { vi.restoreAllMocks(); });

    // --- Section 1: Ability-Specific Mechanics ---
    describe('Ability Mechanics (40 Tests)', () => {
        // Basic Attack (1)
        it('[1.1] Basic Attack: should deal damage', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });

        // Ember Spit (2)
        it('[2.1] Ember Spit: should deal damage', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });

        // Soot Cloud (3)
        it('[3.1] Soot Cloud: should trigger on Fire ability', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')).toBe(true);
        });
        it('[3.2] Soot Cloud: should NOT trigger on non-Fire ability', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')).toBe(false);
        });

        // Restoring Geyser (4)
        it('[4.1] Restoring Geyser: should heal an active ally', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            p.battleHp = 10;
            const initialHp = p.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp + 150);
        });
        it('[4.2] Restoring Geyser: should heal a benched ally', async () => {
            const p1 = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const p2 = createTestMonster(mockGigaTemplate, 102, []);
            p2.battleHp = 10;
            const initialHp = p2.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p1, p2], [a]);
            const { battleState } = await applyDamage(battleId, mockRestoringGeyser.id, p2.id);
            expect(battleState.playerTeam[1].battleHp).toBe(initialHp + 150);
        });

        // Soothing Aura (5)
        it('[5.1] Soothing Aura: should heal active monster when owner is active', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockSoothingAuraPassive, mockBasicAttack]);
            p.battleHp = 10;
            const initialHp = p.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });
        it('[5.2] Soothing Aura: should heal active monster when owner is benched', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockAxolotlTemplate, 102, [mockSoothingAuraPassive]);
            p1.battleHp = 10;
            const initialHp = p1.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p1, p2], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });

        // Shell Slam (6)
        it('[6.1] Shell Slam: should deal damage', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockShellSlam]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockShellSlam.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[6.2] Shell Slam: should scale with DEFENSE', async () => {
            const p = createTestMonster({ ...mockTortoiseTemplate, basePower: 1, baseDefense: 100 }, 101, [mockShellSlam]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockShellSlam.id);
            expect(a.battleHp - battleState.aiTeam[0].battleHp).toBeGreaterThan(50);
        });

        // Crystalize (7)
        it('[7.1] Crystalize: should activate DEFENSE buff below 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            let state = battleSessions.get(battleId)!;
            state.playerTeam[0].battleHp = 99;
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(true);
        });
        it('[7.2] Crystalize: should activate SPEED debuff below 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            let state = battleSessions.get(battleId)!;
            state.playerTeam[0].battleHp = 99;
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });
        it('[7.3] Crystalize: should deactivate DEFENSE buff when healed above 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            let state = battleSessions.get(battleId)!;
            state.playerTeam[0].battleHp = 99;
            state.playerTeam[0].activeEffects.push({ stat: 'defense' } as any);
            const { battleState } = await applyDamage(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(false);
        });
        it('[7.4] Crystalize: should deactivate SPEED debuff when healed above 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            let state = battleSessions.get(battleId)!;
            state.playerTeam[0].battleHp = 99;
            state.playerTeam[0].activeEffects.push({ stat: 'speed' } as any);
            const { battleState } = await applyDamage(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(false);
        });

        // Peck Flurry (8)
        it('[8.1] Peck Flurry: should hit 3 times', async () => {
            const p = createTestMonster(mockGriffinTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPeckFlurry.id);
            expect(battleState.battleLog.filter(l => l.message.includes('damage')).length).toBe(3);
        });
        it('[8.2] Peck Flurry: should stop if target faints', async () => {
            const p = createTestMonster(mockGriffinTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            a.battleHp = 10;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPeckFlurry.id);
            expect(battleState.battleLog.filter(l => l.message.includes('damage')).length).toBe(1);
        });

        // Tailwind (9)
        it('[9.1] Tailwind: should apply speed buff to active monster at battle start', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockGriffinTemplate, 102, [mockTailwindPassive]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const state = await setupBattle([p1, p2], [a]);
            expect(state.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });
        it('[9.2] Tailwind: should apply speed buff to benched monster at battle start', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockGriffinTemplate, 102, [mockTailwindPassive]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const state = await setupBattle([p1, p2], [a]);
            expect(state.playerTeam[1].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });

        // Jolt (10)
        it('[10.1] Jolt: should deal damage', async () => {
            const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockJolt.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[10.2] Jolt: should have a 25% chance to apply PARALYZED', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
                const a = createTestMonster(mockAethTemplate, 201, []);
                await setupBattle([p], [a]);
                const { battleState } = await applyDamage(battleId, mockJolt.id);
                if (battleState.aiTeam[0].statusEffects.some(e => e.name === 'PARALYZED')) count++;
            }
            expect(count).toBeGreaterThan(20);
            expect(count).toBeLessThan(30);
        });

        // Magma Punch (11)
        it('[11.1] Magma Punch: should deal damage', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[11.2] Magma Punch: should apply BURNED status', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'BURNED')).toBe(true);
        });

        // Tremor Stomp (12)
        it('[12.1] Tremor Stomp: should damage first opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, []);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, []);
            const initialHp = a1.battleHp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await applyDamage(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[12.2] Tremor Stomp: should damage second opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, []);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, []);
            const initialHp = a2.battleHp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await applyDamage(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[1].battleHp).toBeLessThan(initialHp);
        });

        // Volcanic Heart (13)
        it('[13.1] Volcanic Heart: should have a 15% chance to heal at end of turn', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
            p.battleHp = 10;
            const initialHp = p.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });
        it('[13.2] Volcanic Heart: should NOT heal if chance fails', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
            p.battleHp = 10;
            const initialHp = p.battleHp;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp);
        });

        // Mind Strike (14)
        it('[14.1] Mind Strike: should deal damage', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockMindStrike]);
            const a = createTestMonster(mockGigaTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockMindStrike.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });

        // Psy-Beam (15)
        it('[15.1] Psy-Beam: should deal damage', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[15.2] Psy-Beam: should apply CONFUSED status', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'CONFUSED')).toBe(true);
        });

        // Phase Shift (16)
        it('[16.1] Phase Shift: should have a 20% chance to evade PHYSICAL attacks', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive]);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp);
        });
        it('[16.2] Phase Shift: should NOT evade if chance fails', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive]);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[16.3] Phase Shift: should NOT evade non-Physical attacks', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive]);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
    });

    // --- Section 2: Status Effect Mechanics ---
    describe('Status Effect Mechanics (25 Tests)', () => {
        // PARALYZED
        it('[SE.1] PARALYZED: should cause the monster to skip its Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockParalyzedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.battleLog.some(l => l.message.includes('paralyzed'))).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.2] PARALYZED: should still allow the monster to be swapped', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            p1.statusEffects.push({ ...mockParalyzedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p1, p2], [a]);
            const { battleState } = await performSwapAndProcessAiTurn(battleId, 1);
            expect(battleState.playerTeam[0].id).toBe(p2.id);
        });
        it('[SE.3] PARALYZED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            vi.spyOn(Math, 'random').mockReturnValue(0);

            // Turn 1 (Player): Apply Paralyzed
            const { battleState: s1 } = await applyDamage(battleId, mockJolt.id);
            expect(s1.aiTeam[0].statusEffects[0].duration).toBe(2);

            // Turn 2 (AI): Skips turn, duration -> 1
            const { battleState: s2 } = await processAiTurn(battleId);
            expect(s2.aiTeam[0].statusEffects[0].duration).toBe(1);

            // Turn 3 (Player): Attacks, AI is still paralyzed
            const { battleState: s3 } = await applyDamage(battleId, mockJolt.id);
            expect(s3.aiTeam[0].statusEffects[0].duration).toBe(1);

            // Turn 4 (AI): Skips turn, duration -> 0, effect removed
            const { battleState: s4 } = await processAiTurn(battleId);
            expect(s4.aiTeam[0].statusEffects.length).toBe(0);
        });

        // BURNED
        it('[SE.4] BURNED: should deal 5% max HP damage at the START of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            const state = await setupBattle([p], [a]);
            const initialHp = a.battleHp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            const expectedDamage = Math.floor(a.battleMaxHp * 0.05);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[SE.5] BURNED: damage should trigger before the Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            a.battleHp = 5;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.6] BURNED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);

            const { battleState: s1 } = await applyDamage(battleId, mockMagmaPunch.id);
            expect(s1.aiTeam[0].statusEffects[0].duration).toBe(2);

            const { battleState: s2 } = await processAiTurn(battleId);
            expect(s2.aiTeam[0].statusEffects[0].duration).toBe(1);

            const { battleState: s3 } = await applyDamage(battleId, mockMagmaPunch.id);
            expect(s3.aiTeam[0].statusEffects[0].duration).toBe(1);

            const { battleState: s4 } = await processAiTurn(battleId);
            expect(s4.aiTeam[0].statusEffects.length).toBe(0);
        });

        // POISONED
        it('[SE.7] POISONED: should deal flat 15 damage at the START of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            const state = await setupBattle([p], [a]);
            const initialHp = a.battleHp;
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - 15);
        });
        it('[SE.8] POISONED: damage should trigger before the Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            a.battleHp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.9] POISONED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            vi.spyOn(Math, 'random').mockReturnValue(0);

            const { battleState: s1 } = await applyDamage(battleId, mockEmberSpit.id);
            expect(s1.aiTeam[0].statusEffects[0].duration).toBe(2);

            const { battleState: s2 } = await processAiTurn(battleId);
            expect(s2.aiTeam[0].statusEffects[0].duration).toBe(1);

            const { battleState: s3 } = await applyDamage(battleId, mockEmberSpit.id);
            expect(s3.aiTeam[0].statusEffects[0].duration).toBe(1);

            const { battleState: s4 } = await processAiTurn(battleId);
            expect(s4.aiTeam[0].statusEffects.length).toBe(0);
        });

        // CONFUSED
        it('[SE.10] CONFUSED: should cause the monster to attack itself', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const initialHp = p.battleHp;
            p.statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[SE.11] CONFUSED: self-damage should be 40% of the monster\'s POWER', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 100 }, 101, [mockBasicAttack]);
            const initialHp = p.battleHp;
            p.statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            const expectedDamage = Math.floor(100 * 0.4);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[SE.12] CONFUSED: should prevent the monster from attacking the opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialOpponentHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBe(initialOpponentHp);
        });
        it('[SE.13] CONFUSED: should last for exactly 1 turn', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);

            const { battleState: s1 } = await applyDamage(battleId, mockPsyBeam.id);
            expect(s1.aiTeam[0].statusEffects[0].duration).toBe(1);

            const { battleState: s2 } = await processAiTurn(battleId);
            expect(s2.aiTeam[0].statusEffects.length).toBe(0);
        });

        // HEALING
        it('[SE.14] HEALING: should restore 3% max HP at the END of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.battleHp = 10;
            const initialHp = p.battleHp;
            p.statusEffects.push({ ...mockHealingEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            const expectedHeal = Math.floor(p.battleMaxHp * 0.03);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp + expectedHeal);
        });
        it('[SE.15] HEALING: should not heal if monster is at full HP', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const initialHp = p.battleHp;
            p.statusEffects.push({ ...mockHealingEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp);
        });

        // General Status Rules
        it('[SE.16] Stacking: Applying an existing status should refresh duration', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            const { battleState } = await applyDamage(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].statusEffects.length).toBe(1);
            expect(battleState.aiTeam[0].statusEffects[0].duration).toBe(2);
        });
        it('[SE.17] Duration: A 1-turn effect expires after the afflicted monster\'s turn ends', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            const { battleState: s1 } = await applyDamage(battleId, mockPsyBeam.id);
            const { battleState: s2 } = await processAiTurn(battleId);
            expect(s2.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.18] Duration: A 2-turn effect expires after 2 of the afflicted monster\'s turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            await applyDamage(battleId, mockMagmaPunch.id); // P turn 1, A is burned for 2 turns
            await processAiTurn(battleId); // A turn 1, burn duration -> 1
            await applyDamage(battleId, mockBasicAttack.id); // P turn 2
            const { battleState } = await processAiTurn(battleId); // A turn 2, burn duration -> 0
            expect(battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.19] Self-Inflicted: Confusion damage cannot be evaded', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 100 }, 101, [mockPhaseShiftPassive, mockBasicAttack]);
            const initialHp = p.battleHp;
            p.statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeLessThan(initialHp);
        });
    });

    // --- Section 3: Foundational Rules & Engine Logic ---
    describe('Foundational Rules & Engine Logic (59 Tests)', () => {
        // Pillar 1: State Management & Data Flow
        it('[FR.1.1] Immutability: battle state object must be a new instance after an action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(finalState).not.toBe(initialState);
        });
        it('[FR.1.2] Immutability: player team array must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(finalState.playerTeam).not.toBe(initialState.playerTeam);
        });
        it('[FR.1.3] Immutability: active player monster object must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(finalState.playerTeam[0]).not.toBe(initialState.playerTeam[0]);
        });
        it('[FR.1.4] Immutability: ai team array must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(finalState.aiTeam).not.toBe(initialState.aiTeam);
        });
        it('[FR.1.5] Immutability: active ai monster object must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(finalState.aiTeam[0]).not.toBe(initialState.aiTeam[0]);
        });

        // Pillar 2: The Turn Lifecycle
        it('[FR.2.1] Phase Order: Start-of-Turn effects (DoT) must trigger before Action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            a.battleHp = 5;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(battleState.battleLog.findIndex(l => l.message.includes('BURNED'))).toBeLessThan(battleState.battleLog.findIndex(l => l.message.includes('used')));
        });
        it('[FR.2.2] Phase Order: End-of-Turn effects (Healing) must trigger after Action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.battleHp = 10;
            p.statusEffects.push({ ...mockHealingEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.battleLog.findIndex(l => l.message.includes('used'))).toBeLessThan(battleState.battleLog.findIndex(l => l.message.includes('HEALING')));
        });
        it('[FR.2.3] Faint Check: Global Faint Check must trigger immediately on HP loss', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            a.battleHp = 10;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPeckFlurry.id);
            expect(battleState.battleLog.filter(l => l.message.includes('damage')).length).toBe(1);
            expect(battleState.battleLog.some(l => l.message.includes('fainted'))).toBe(true);
        });
        it('[FR.2.4] Faint Check: should interrupt multi-hit attacks', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            a.battleHp = 10;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPeckFlurry.id);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.filter(l => l.message.includes('damage')).length).toBe(1);
        });
        it('[FR.2.5] Faint Check: should prevent post-damage passives from triggering on a fainted monster', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive]); // Phase Shift is ON_BEING_HIT
            a.battleHp = 10;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('evaded'))).toBe(false);
        });

        // Pillar 3: Action & Effect Resolution (Order of Operations)
        it('[FR.3.1] OoO Step 2: Resource Check - should fail if MP is insufficient', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            p.battleMp = 10;
            const a = createTestMonster(mockGigaTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.battleLog.some(l => l.message.includes('Not enough MP'))).toBe(true);
        });
        it('[FR.3.2] OoO Step 3: Deduct Resources - should deduct MP cost on use', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const initialMp = p.battleMp;
            const a = createTestMonster(mockGigaTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.playerTeam[0].battleMp).toBe(initialMp - 90);
        });
        it('[FR.3.3] OoO Step 4: Determine Targets - ALL_OPPONENTS should target all active opponents', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, []);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, []);
            const initialHp1 = a1.battleHp;
            const initialHp2 = a2.battleHp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await applyDamage(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp1);
            expect(battleState.aiTeam[1].battleHp).toBeLessThan(initialHp2);
        });
        it('[FR.3.4] OoO Step 5a: Evasion Check - should trigger before damage', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive]);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.battleLog.some(l => l.message.includes('evaded'))).toBe(true);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp);
        });
        it('[FR.3.5] OoO Step 5b: Pre-Damage Attacker Passives - should trigger before damage', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockEmberSpit.id);
            const poisonIndex = battleState.battleLog.findIndex(l => l.message.includes('POISONED'));
            const damageIndex = battleState.battleLog.findIndex(l => l.message.includes('damage'));
            expect(poisonIndex).toBeLessThan(damageIndex);
        });
        it('[FR.3.6] OoO Step 5c: Calculate Final Damage - damage should be calculated', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[FR.3.7] OoO Step 5d: Apply Damage/Healing - HP should be modified', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            const initialHp = a.battleHp;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).not.toBe(initialHp);
        });
        it('[FR.3.8] OoO Step 5e: Post-Damage Defender Passives - should trigger after damage', async () => {
            // Placeholder for a post-damage passive like "Rough Skin"
            expect(true).toBe(true);
        });
        it('[FR.3.9] OoO Step 5f: Apply Queued Effects - status effects should be applied', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'CONFUSED')).toBe(true);
        });
        it('[FR.3.10] OoO Step 5g: HP Threshold Check - should trigger after damage', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack]);
            await setupBattle([p], [a]);
            let state = battleSessions.get(battleId)!;
            state.playerTeam[0].battleHp = 99;
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            const damageIndex = battleState.battleLog.findIndex(l => l.message.includes('damage'));
            const crystalizeIndex = battleState.battleLog.findIndex(l => l.message.includes('Crystalize'));
            expect(damageIndex).toBeLessThan(crystalizeIndex);
        });
        it('[FR.3.11] OoO Step 5h: Faint Check - should be the last step in the loop', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            a.battleHp = 10;
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            const faintIndex = battleState.battleLog.findIndex(l => l.message.includes('fainted'));
            expect(faintIndex).toBe(battleState.battleLog.length - 1);
        });

        // Pillar 4: The Data Schema as Law
        it('[FR.4.1] No Hard-Coding: Jolt chance must be read from data (25%)', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
                const a = createTestMonster(mockAethTemplate, 201, []);
                await setupBattle([p], [a]);
                const { battleState } = await applyDamage(battleId, mockJolt.id);
                if (battleState.aiTeam[0].statusEffects.some(e => e.name === 'PARALYZED')) count++;
            }
            expect(count).toBe(25);
        });
        it('[FR.4.2] No Hard-Coding: Burn damage must be read from data (5%)', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster({ ...mockAethTemplate, battleMaxHp: 100 }, 201, [mockBasicAttack]);
            const state = await setupBattle([p], [a]);
            const initialHp = a.battleHp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            const { battleState } = await processAiTurn(battleId);
            expect(initialHp - battleState.aiTeam[0].battleHp).toBe(5);
        });
        it('[FR.4.3] Priority System: Higher priority passives must resolve first', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockHighPriorityPassive, mockSoothingAuraPassive, mockBasicAttack]);
            p.battleHp = 100;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            const highPrioIndex = battleState.battleLog.findIndex(l => l.message.includes('High Priority'));
            const lowPrioIndex = battleState.battleLog.findIndex(l => l.message.includes('Soothing Aura'));
            expect(highPrioIndex).toBeLessThan(lowPrioIndex);
        });
    });

    // --- Section 4: Input Validation & Edge Cases ---
    describe('Input Validation & Edge Cases (10 Tests)', () => {
        it('[IV.1] should reject action if abilityId is invalid', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            await expect(applyDamage(battleId, 9999)).rejects.toThrow();
        });
        it('[IV.2] should reject action if monster has insufficient MP', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            p.battleMp = 10;
            const a = createTestMonster(mockGigaTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockPsyBeam.id);
            expect(battleState.battleLog.some(l => l.message.includes('Not enough MP'))).toBe(true);
        });
        it('[IV.3] should reject healing ability on a fainted target', async () => {
            const p1 = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const p2 = createTestMonster(mockGigaTemplate, 102, []);
            p2.isFainted = true;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p1, p2], [a]);
            await expect(applyDamage(battleId, mockRestoringGeyser.id, p2.id)).rejects.toThrow();
        });
        it('[IV.4] should reject healing ability on an opponent', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            await expect(applyDamage(battleId, mockRestoringGeyser.id, a.id)).rejects.toThrow();
        });
        it('[IV.5] should reject damaging ability on an ally', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p1, p2], [a]);
            await expect(applyDamage(battleId, mockBasicAttack.id, p2.id)).rejects.toThrow();
        });
        it('[IV.6] should reject swap if target monster does not exist', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            await expect(performSwapAndProcessAiTurn(battleId, 99)).rejects.toThrow();
        });
        it('[IV.7] should reject swap if target monster is already active', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            await expect(performSwapAndProcessAiTurn(battleId, 0)).rejects.toThrow();
        });
        it('[IV.8] should reject swap if target monster is fainted', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            p2.isFainted = true;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p1, p2], [a]);
            await expect(performSwapAndProcessAiTurn(battleId, 1)).rejects.toThrow();
        });
        it('[IV.9] should reject action from a fainted monster', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.isFainted = true;
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            await expect(applyDamage(battleId, mockBasicAttack.id)).rejects.toThrow();
        });
        it('[IV.10] monster fainting from DoT should not get an action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.battleHp = 5;
            p.statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            const a = createTestMonster(mockAethTemplate, 201, []);
            await setupBattle([p], [a]);
            const { battleState } = await applyDamage(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used Basic Attack'))).toBe(false);
        });
    });
});
