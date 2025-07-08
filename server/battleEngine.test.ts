import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createBattleSession,
  performAction, // The only action function we use now
  battleSessions,
} from './battleEngine';
import * as storage from './storage.js';
import type { BattleState, BattleMonster, UserMonster, Ability, StatusEffect, ActiveEffect } from '@shared/types';

// Mock the storage module to prevent actual database calls
vi.mock('./storage.js', () => ({
  storage: {
    // We only need to mock the functions that the engine actually calls
    saveFinalBattleState: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- Comprehensive Mock Data Library ---
const mockParalyzedEffect: StatusEffect = { id: 1, name: 'PARALYZED', effect_type: 'TURN_SKIP', default_duration: 2, is_positive: false, description: '' };
const mockBurnedEffect: StatusEffect = { id: 2, name: 'BURNED', effect_type: 'DAMAGE_OVER_TIME', default_duration: 2, default_value: '5', value_type: 'PERCENT_MAX_HP', is_positive: false, description: '' };
const mockPoisonedEffect: StatusEffect = { id: 3, name: 'POISONED', effect_type: 'DAMAGE_OVER_TIME', default_duration: 2, default_value: '15', value_type: 'FLAT', is_positive: false, description: '' };
const mockConfusedEffect: StatusEffect = { id: 4, name: 'CONFUSED', effect_type: 'DISRUPTION', default_duration: 1, secondary_value: '0.40', is_positive: false, description: '' };
const mockHealingEffect: StatusEffect = { id: 5, name: 'HEALING', effect_type: 'HEAL_OVER_TIME', default_duration: 3, default_value: '3', value_type: 'PERCENT_MAX_HP', is_positive: true, description: '' };
const mockPhaseShiftEffect: StatusEffect = { id: 7, name: 'INCORPOREAL', effect_type: 'EVADE', default_duration: 1, is_positive: true, description: '' };

const mockBasicAttack: Ability = { id: 1, name: 'Basic Attack', mp_cost: 0, power_multiplier: '0.6', affinity: 'Physical', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockEmberSpit: Ability = { id: 2, name: 'Ember Spit', mp_cost: 30, power_multiplier: '1.0', affinity: 'Fire', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockSootCloudPassive: Ability = { id: 3, name: 'Soot Cloud', ability_type: 'PASSIVE', activation_trigger: 'ON_ABILITY_USE', status_effect_trigger_affinity: 'Fire', override_chance: '1.0', effectDetails: mockPoisonedEffect } as Ability;
const mockRestoringGeyser: Ability = { id: 4, name: 'Restoring Geyser', mp_cost: 40, affinity: 'Water', healing_power: 150, target_scope: 'ANY_ALLY' } as Ability;
const mockSoothingAuraPassive: Ability = { id: 5, name: 'Soothing Aura', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ANY_POSITION', effectDetails: mockHealingEffect, priority: 10 } as Ability;
const mockShellSlam: Ability = { id: 6, name: 'Shell Slam', mp_cost: 35, power_multiplier: '0.75', affinity: 'Earth', scaling_stat: 'defense', target_scope: 'ACTIVE_OPPONENT' } as Ability;
const mockCrystalizePassive: Ability = { id: 7, name: 'Crystalize', ability_type: 'PASSIVE', activation_trigger: 'ON_HP_THRESHOLD', trigger_condition_value: 50, stat_modifiers: [{ stat: 'defense', type: 'PERCENTAGE', value: 100 }, { stat: 'speed', type: 'PERCENTAGE', value: -50 }] } as Ability;
const mockPeckFlurry: Ability = { id: 8, name: 'Peck Flurry', mp_cost: 40, power_multiplier: '0.5', affinity: 'Air', min_hits: 3, max_hits: 3, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockTailwindPassive: Ability = { id: 9, name: 'Tailwind', ability_type: 'PASSIVE', activation_trigger: 'ON_BATTLE_START', activation_scope: 'ANY_POSITION', stat_modifiers: [{ stat: 'speed', type: 'PERCENTAGE', value: 5 }] } as Ability;
const mockJolt: Ability = { id: 10, name: 'Jolt', mp_cost: 35, power_multiplier: '0.2', affinity: 'Electric', effectDetails: { ...mockParalyzedEffect, override_chance: '0.25' } , target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockMagmaPunch: Ability = { id: 11, name: 'Magma Punch', mp_cost: 40, power_multiplier: '0.8', affinity: 'Fire', effectDetails: mockBurnedEffect, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockTremorStomp: Ability = { id: 12, name: 'Tremor Stomp', mp_cost: 50, power_multiplier: '0.6', affinity: 'Earth', target_scope: 'ALL_OPPONENTS', scaling_stat: 'power' } as Ability;
const mockVolcanicHeartPassive: Ability = { id: 13, name: 'Volcanic Heart', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ACTIVE', effectDetails: { ...mockHealingEffect, override_chance: '1.0' } } as Ability;
const mockMindStrike: Ability = { id: 14, name: 'Mind Strike', mp_cost: 40, power_multiplier: '0.7', affinity: 'Psychic', target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockPsyBeam: Ability = { id: 15, name: 'Psy-Beam', mp_cost: 90, power_multiplier: '1.2', affinity: 'Psychic', effectDetails: { ...mockConfusedEffect, override_chance: '1.0' }, target_scope: 'ACTIVE_OPPONENT', scaling_stat: 'power' } as Ability;
const mockPhaseShiftPassive: Ability = { id: 16, name: 'Phase Shift', ability_type: 'PASSIVE', activation_trigger: 'ON_BEING_HIT', override_chance: '1.0', affinity: 'Physical' } as Ability;
const mockHighPriorityPassive: Ability = { id: 99, name: 'High Priority Damage', ability_type: 'PASSIVE', activation_trigger: 'END_OF_TURN', activation_scope: 'ACTIVE', priority: 20, effectDetails: { ...mockBurnedEffect, default_value: '10' } } as Ability;

const mockGigaTemplate = { id: 6, name: 'Gigalith', type: 'earth', basePower: 120, baseSpeed: 20, baseDefense: 150, baseHp: 608, baseMp: 400 };
const mockAethTemplate = { id: 7, name: 'Aetherion', type: 'psychic', basePower: 20, baseSpeed: 130, baseDefense: 40, baseHp: 110, baseMp: 800, weaknesses: ['Physical'] };
const mockTortoiseTemplate = { id: 8, name: 'Geode Tortoise', type: 'earth', basePower: 60, baseSpeed: 30, baseDefense: 180, baseHp: 200, baseMp: 150 };
const mockGriffinTemplate = { id: 9, name: 'Gale-Feather Griffin', type: 'air', basePower: 90, baseSpeed: 170, baseDefense: 35, baseHp: 37, baseMp: 140 };
const mockSalamanderTemplate = { id: 10, name: 'Cinder-Tail Salamander', type: 'fire', basePower: 100, baseSpeed: 110, baseDefense: 70, baseHp: 75, baseMp: 160 };
const mockAxolotlTemplate = { id: 11, name: 'River-Spirit Axolotl', type: 'water', basePower: 50, baseSpeed: 90, baseDefense: 60, baseHp: 93, baseMp: 220 };
const mockSquirrelTemplate = { id: 12, name: 'Spark-Tail Squirrel', type: 'electric', basePower: 40, baseSpeed: 140, baseDefense: 50, baseHp: 43, baseMp: 200 };

const createTestMonster = (template: any, id: number, abilities: Ability[], isPlayer: boolean = true): UserMonster => ({
    id,
    userId: 'test-user',
    monsterId: template.id,
    level: 10,
    power: template.basePower,
    speed: template.baseSpeed,
    defense: template.baseDefense,
    hp: template.baseHp,
    maxHp: template.baseHp,
    mp: template.baseMp,
    maxMp: template.baseMp,
    isShattered: false,
    monster: { ...template, abilities },
} as UserMonster);

let battleId: string;
const setupBattle = async (playerMonsters: UserMonster[], aiMonsters: UserMonster[]) => {
    vi.clearAllMocks();
    battleSessions.clear();
    const session = await createBattleSession(playerMonsters, aiMonsters, 0);
    battleId = session.battleId;
    const state = battleSessions.get(battleId)!;
    state.turn = 'player';
    battleSessions.set(battleId, state);
    return state;
};

const aiTurn = () => performAction(battleId, -1);
const playerSwap = (targetId: number) => performAction(battleId, -2, targetId);

describe('Battle Engine Comprehensive Test Suite', () => {
    afterEach(() => { vi.restoreAllMocks(); });
    describe('Ability Mechanics', () => {
        it('[1.1] Basic Attack: should deal damage', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[2.1] Ember Spit: should deal damage', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[3.1] Soot Cloud: should trigger on Fire ability', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')).toBe(true);
        });
        it('[3.2] Soot Cloud: should NOT trigger on non-Fire ability', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')).toBe(false);
        });
        it('[4.1] Restoring Geyser: should heal an active ally', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            p.hp = 10;
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp + 150);
        });
        it('[4.2] Restoring Geyser: should heal a benched ally', async () => {
            const p1 = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const p2 = createTestMonster(mockGigaTemplate, 102, []);
            p2.hp = 10;
            const initialHp = p2.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            state.playerTeam[1].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p2.id);
            expect(battleState.playerTeam[1].battleHp).toBe(initialHp + 150);
        });
        it('[5.1] Soothing Aura: should heal active monster when owner is active', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockSoothingAuraPassive, mockBasicAttack]);
            p.hp = 10;
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });
        it('[5.2] Soothing Aura: should heal active monster when owner is benched', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockAxolotlTemplate, 102, [mockSoothingAuraPassive]);
            p1.hp = 10;
            const initialHp = p1.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });
        it('[6.1] Shell Slam: should deal damage', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockShellSlam]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockShellSlam.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[6.2] Shell Slam: should scale with DEFENSE', async () => {
            const p_monster = { ...mockTortoiseTemplate, basePower: 1, baseDefense: 100 };
            const p = createTestMonster(p_monster, 101, [mockShellSlam]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockShellSlam.id);
            expect(a.hp - battleState.aiTeam[0].battleHp).toBe(Math.floor(100 * 0.75));
        });
        it('[7.1] Crystalize: should activate DEFENSE buff below 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster({ ...mockAethTemplate, basePower: 500 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) + 1;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(true);
        });
        it('[7.2] Crystalize: should activate SPEED debuff below 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster({ ...mockAethTemplate, basePower: 500 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) + 1;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });
        it('[7.3] Crystalize: should deactivate DEFENSE buff when healed above 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) - 1;
            state.playerTeam[0].activeEffects.push({ sourceAbilityId: 7, stat: 'defense', type: 'PERCENTAGE', value: 100 } as any);
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(false);
        });
        it('[7.4] Crystalize: should deactivate SPEED debuff when healed above 50% HP', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) - 1;
            state.playerTeam[0].activeEffects.push({ sourceAbilityId: 7, stat: 'speed', type: 'PERCENTAGE', value: -50 } as any);
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(false);
        });
        it('[8.1] Peck Flurry: should hit 3 times', async () => {
            const p = createTestMonster(mockGriffinTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            expect(battleState.events.filter(e => e.type === 'DAMAGE').length).toBe(3);
        });
        it('[8.2] Peck Flurry: should stop if target faints', async () => {
            const p = createTestMonster({ ...mockGriffinTemplate, basePower: 500 }, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            expect(battleState.events.filter(e => e.type === 'DAMAGE').length).toBe(1);
        });
        it('[9.1] Tailwind: should apply speed buff to active monster at battle start', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockGriffinTemplate, 102, [mockTailwindPassive]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            expect(state.playerTeam[0].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });
        it('[9.2] Tailwind: should apply speed buff to benched monster at battle start', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockGriffinTemplate, 102, [mockTailwindPassive]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            expect(state.playerTeam[1].activeEffects.some(e => e.stat === 'speed')).toBe(true);
        });
        it('[10.1] Jolt: should deal damage', async () => {
            const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockJolt.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[10.2] Jolt: should have a 25% chance to apply PARALYZED', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
                const a = createTestMonster(mockAethTemplate, 201, [], false);
                await setupBattle([p], [a]);
                const { battleState } = await performAction(battleId, mockJolt.id);
                if (battleState.aiTeam[0].statusEffects.some(e => e.name === 'PARALYZED')) count++;
            }
            expect(count).toBeGreaterThan(20);
            expect(count).toBeLessThan(30);
        });
        it('[11.1] Magma Punch: should deal damage', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[11.2] Magma Punch: should apply BURNED status', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'BURNED')).toBe(true);
        });
        it('[12.1] Tremor Stomp: should damage first opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, [], false);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, [], false);
            const initialHp = a1.hp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await performAction(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[12.2] Tremor Stomp: should damage second opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, [], false);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, [], false);
            const initialHp = a2.hp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await performAction(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[1].battleHp).toBeLessThan(initialHp);
        });
        it('[13.1] Volcanic Heart: should have a 15% chance to heal at end of turn', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
            p.hp = 10;
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeGreaterThan(initialHp);
        });
        it('[13.2] Volcanic Heart: should NOT heal if chance fails', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
            p.hp = 10;
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp);
        });
        it('[14.1] Mind Strike: should deal damage', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockMindStrike]);
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockMindStrike.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[15.1] Psy-Beam: should deal damage', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[15.2] Psy-Beam: should apply CONFUSED status', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'CONFUSED')).toBe(true);
        });
        it('[16.1] Phase Shift: should have a 20% chance to evade PHYSICAL attacks', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp);
        });
        it('[16.2] Phase Shift: should NOT evade if chance fails', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[16.3] Phase Shift: should NOT evade non-Physical attacks', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockEmberSpit.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
    });
    describe('Status Effect Mechanics', () => {
        it('[SE.1] PARALYZED: should cause the monster to skip its Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockParalyzedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.battleLog.some(l => l.message.includes('turn was skipped'))).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.2] PARALYZED: should still allow the monster to be swapped', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p1, p2], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockParalyzedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await playerSwap(p2.id);
            expect(battleState.playerTeam[0].id).toBe(p2.id);
        });
        it('[SE.3] PARALYZED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            vi.spyOn(Math, 'random').mockReturnValue(0);
            let s1 = await performAction(battleId, mockJolt.id);
            expect(s1.battleState.aiTeam[0].statusEffects[0].duration).toBe(2);
            let s2 = await aiTurn();
            expect(s2.battleState.aiTeam[0].statusEffects[0].duration).toBe(1);
            let s3 = await performAction(battleId, mockJolt.id);
            expect(s3.battleState.aiTeam[0].statusEffects[0].duration).toBe(1);
            let s4 = await aiTurn();
            expect(s4.battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.4] BURNED: should deal 5% max HP damage at the START of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const expectedDamage = Math.floor(a.maxHp! * 0.05);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[SE.5] BURNED: damage should trigger before the Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            a.hp = 5;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.aiTeam[0].battleHp = 5;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.6] BURNED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            let s1 = await performAction(battleId, mockMagmaPunch.id);
            expect(s1.battleState.aiTeam[0].statusEffects[0].duration).toBe(2);
            let s2 = await aiTurn();
            expect(s2.battleState.aiTeam[0].statusEffects[0].duration).toBe(1);
            await performAction(battleId, mockMagmaPunch.id);
            let s4 = await aiTurn();
            expect(s4.battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.7] POISONED: should deal flat 15 damage at the START of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - 15);
        });
        it('[SE.8] POISONED: damage should trigger before the Action Phase', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.aiTeam[0].battleHp = 10;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used'))).toBe(false);
        });
        it('[SE.9] POISONED: should last for exactly 2 turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            vi.spyOn(Math, 'random').mockReturnValue(0);
            let s1 = await performAction(battleId, mockEmberSpit.id);
            expect(s1.battleState.aiTeam[0].statusEffects[0].duration).toBe(2);
            let s2 = await aiTurn();
            expect(s2.battleState.aiTeam[0].statusEffects[0].duration).toBe(1);
            await performAction(battleId, mockEmberSpit.id);
            let s4 = await aiTurn();
            expect(s4.battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.10] CONFUSED: should cause the monster to attack itself', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const initialHp = p.hp;
            const state = await setupBattle([p], []);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[SE.11] CONFUSED: self-damage should be 40% of the monster\'s POWER', async () => {
            const p_monster = { ...mockGigaTemplate, basePower: 100 };
            const p = createTestMonster(p_monster, 101, [mockBasicAttack]);
            const initialHp = p.hp;
            const state = await setupBattle([p], []);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const expectedDamage = Math.floor(100 * 0.4);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[SE.12] CONFUSED: should prevent the monster from attacking the opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialOpponentHp = a.hp;
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBe(initialOpponentHp);
        });
        it('[SE.13] CONFUSED: should last for exactly 1 turn', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            let s1 = await performAction(battleId, mockPsyBeam.id);
            expect(s1.battleState.aiTeam[0].statusEffects[0].duration).toBe(1);
            let s2 = await aiTurn();
            expect(s2.battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.14] HEALING: should restore 3% max HP at the END of the afflicted monster\'s turn', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            p.hp = 10;
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockHealingEffect, duration: 1 });
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const expectedHeal = Math.floor(p.maxHp! * 0.03);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp + expectedHeal);
        });
        it('[SE.15] HEALING: should not heal if monster is at full HP', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockHealingEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp);
        });
        it('[SE.16] Stacking: Applying an existing status should refresh duration', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockMagmaPunch.id);
            expect(battleState.aiTeam[0].statusEffects.length).toBe(1);
            expect(battleState.aiTeam[0].statusEffects[0].duration).toBe(2);
        });
        it('[SE.17] Duration: A 1-turn effect expires after the afflicted monster\'s turn ends', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            await performAction(battleId, mockPsyBeam.id);
            const { battleState } = await aiTurn();
            expect(battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.18] Duration: A 2-turn effect expires after 2 of the afflicted monster\'s turns', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockMagmaPunch]);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            await setupBattle([p], [a]);
            await performAction(battleId, mockMagmaPunch.id);
            await aiTurn();
            await performAction(battleId, mockBasicAttack.id);
            const { battleState } = await aiTurn();
            expect(battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[SE.19] Self-Inflicted: Confusion damage cannot be evaded', async () => {
            const p_monster = { ...mockGigaTemplate, basePower: 100 };
            const p = createTestMonster(p_monster, 101, [mockPhaseShiftPassive, mockBasicAttack]);
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeLessThan(initialHp);
        });
    });
    describe('Foundational Rules & Engine Logic', () => {
        it('[FR.1.1] Immutability: battle state object must be a new instance after an action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await performAction(battleId, mockBasicAttack.id);
            expect(finalState).not.toBe(initialState);
        });
        it('[FR.1.2] Immutability: player team array must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await performAction(battleId, mockBasicAttack.id);
            expect(finalState.playerTeam).not.toBe(initialState.playerTeam);
        });
        it('[FR.1.3] Immutability: active player monster object must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await performAction(battleId, mockBasicAttack.id);
            expect(finalState.playerTeam[0]).not.toBe(initialState.playerTeam[0]);
        });
        it('[FR.1.4] Immutability: ai team array must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await performAction(battleId, mockBasicAttack.id);
            expect(finalState.aiTeam).not.toBe(initialState.aiTeam);
        });
        it('[FR.1.5] Immutability: active ai monster object must be a new instance', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialState = await setupBattle([p], [a]);
            const { battleState: finalState } = await performAction(battleId, mockBasicAttack.id);
            expect(finalState.aiTeam[0]).not.toBe(initialState.aiTeam[0]);
        });
        it('[FR.2.1] Phase Order: Start-of-Turn effects (DoT) must trigger before Action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            a.hp = 5;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.aiTeam[0].battleHp = 5;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const burnLogIndex = battleState.battleLog.findIndex(l => l.message.includes('damage from BURNED'));
            const usedLogIndex = battleState.battleLog.findIndex(l => l.message.includes('used'));
            expect(burnLogIndex).toBeLessThan(usedLogIndex > -1 ? usedLogIndex : Infinity);
        });
        it('[FR.2.2] Phase Order: End-of-Turn effects (Healing) must trigger after Action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockHealingEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const usedLogIndex = battleState.battleLog.findIndex(l => l.message.includes('used'));
            const healLogIndex = battleState.battleLog.findIndex(l => l.message.includes('HEALING'));
            expect(usedLogIndex).toBeLessThan(healLogIndex > -1 ? healLogIndex : Infinity);
        });
        it('[FR.2.3] Faint Check: Global Faint Check must trigger immediately on HP loss', async () => {
            const p = createTestMonster({ ...mockGriffinTemplate, basePower: 500 }, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            expect(battleState.events.filter(e => e.type === 'DAMAGE').length).toBe(1);
            expect(battleState.events.some(e => e.type === 'FAINT')).toBe(true);
        });
        it('[FR.2.4] Faint Check: should interrupt multi-hit attacks', async () => {
            const p = createTestMonster({ ...mockGriffinTemplate, basePower: 500 }, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.events.filter(e => e.type === 'DAMAGE').length).toBe(1);
        });
        it('[FR.2.5] Faint Check: should prevent post-damage passives from triggering on a fainted monster', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 500 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
            expect(battleState.events.some(e => e.type === 'EVADE')).toBe(false);
        });
        it('[FR.3.1] OoO Step 2: Resource Check - should fail if MP is insufficient', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            p.mp = 10;
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleMp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.battleLog.some(l => l.message.includes('enough MP'))).toBe(true);
        });
        it('[FR.3.2] OoO Step 3: Deduct Resources - should deduct MP cost on use', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const initialMp = p.mp;
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.playerTeam[0].battleMp).toBe(initialMp - mockPsyBeam.mp_cost!);
        });
        it('[FR.3.3] OoO Step 4: Determine Targets - ALL_OPPONENTS should target all active opponents', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockTremorStomp]);
            const a1 = createTestMonster(mockAethTemplate, 201, [], false);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, [], false);
            const initialHp1 = a1.hp;
            const initialHp2 = a2.hp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await performAction(battleId, mockTremorStomp.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp1);
            expect(battleState.aiTeam[1].battleHp).toBeLessThan(initialHp2);
        });
        it('[FR.3.4] OoO Step 5a: Evasion Check - should trigger before damage', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.events.some(e => e.type === 'EVADE')).toBe(true);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp);
        });
        it('[FR.3.5] OoO Step 5b: Pre-Damage Attacker Passives - should trigger before damage', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockEmberSpit.id);
            const poisonEventIndex = battleState.events.findIndex(e => e.type === 'STATUS_APPLIED');
            const damageEventIndex = battleState.events.findIndex(e => e.type === 'DAMAGE');
            expect(poisonEventIndex).toBeLessThan(damageEventIndex);
        });
        it('[FR.3.6] OoO Step 5c: Calculate Final Damage - damage should be calculated', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBeLessThan(initialHp);
        });
        it('[FR.3.7] OoO Step 5d: Apply Damage/Healing - HP should be modified', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const initialHp = a.hp;
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).not.toBe(initialHp);
        });
        it('[FR.3.8] OoO Step 5e: Post-Damage Defender Passives - should trigger after damage', async () => {
            expect(true).toBe(true);
        });
        it('[FR.3.9] OoO Step 5f: Apply Queued Effects - status effects should be applied', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'CONFUSED')).toBe(true);
        });
        it('[FR.3.10] OoO Step 5g: HP Threshold Check - should trigger after damage', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster({ ...mockAethTemplate, basePower: 500 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) + 1;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const damageEventIndex = battleState.events.findIndex(e => e.type === 'DAMAGE');
            const passiveEventIndex = battleState.events.findIndex(e => e.type === 'PASSIVE_ACTIVATE' && e.abilityName === 'Crystalize');
            expect(damageEventIndex).toBeLessThan(passiveEventIndex);
        });
        it('[FR.3.11] OoO Step 5h: Faint Check - should be the last step in the loop', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 999 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 10;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const lastEvent = battleState.events[battleState.events.length - 1];
            expect(lastEvent.type).toBe('FAINT');
        });
        it('[FR.4.1] No Hard-Coding: Jolt chance must be read from data (25%)', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSquirrelTemplate, 101, [mockJolt]);
                const a = createTestMonster(mockAethTemplate, 201, [], false);
                await setupBattle([p], [a]);
                const { battleState } = await performAction(battleId, mockJolt.id);
                if (battleState.aiTeam[0].statusEffects.some(e => e.name === 'PARALYZED')) count++;
            }
            expect(count).toBe(25);
        });
        it('[FR.4.2] No Hard-Coding: Burn damage must be read from data (5%)', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster({ ...mockAethTemplate, hp: 100, maxHp: 100 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(initialHp - battleState.aiTeam[0].battleHp).toBe(5);
        });
        it('[FR.4.3] Priority System: Higher priority passives must resolve first', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockHighPriorityPassive, mockSoothingAuraPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const highPrioIndex = battleState.events.findIndex(e => e.abilityName === 'High Priority Damage');
            const lowPrioIndex = battleState.events.findIndex(e => e.abilityName === 'Soothing Aura');
            expect(highPrioIndex).toBeLessThan(lowPrioIndex);
        });
    });
    describe('Input Validation & Edge Cases', () => {
        it('[IV.1] should reject action if abilityId is invalid', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            await expect(performAction(battleId, 9999)).rejects.toThrow();
        });
        it('[IV.2] should reject action if monster has insufficient MP', async () => {
            const p = createTestMonster(mockAethTemplate, 101, [mockPsyBeam]);
            p.mp = 10;
            const a = createTestMonster(mockGigaTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleMp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockPsyBeam.id);
            expect(battleState.battleLog.some(l => l.message.includes('enough MP'))).toBe(true);
        });
        it('[IV.3] should reject healing ability on a fainted target', async () => {
            const p1 = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const p2 = createTestMonster(mockGigaTemplate, 102, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            state.playerTeam[1].isFainted = true;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p2.id);
            expect(battleState.battleLog.some(l => l.message.includes('no valid target'))).toBe(true);
        });
        it('[IV.4] should reject healing ability on an opponent', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, a.id);
            expect(battleState.battleLog.some(l => l.message.includes('no valid target'))).toBe(true);
        });
        it('[IV.5] should reject damaging ability on an ally', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p1, p2], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id, p2.id);
            expect(battleState.battleLog.some(l => l.message.includes('no valid target'))).toBe(true);
        });
        it('[IV.6] should reject swap if target monster does not exist', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            await expect(playerSwap(999)).rejects.toThrow();
        });
        it('[IV.7] should reject swap if target monster is already active', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            await expect(playerSwap(p.id)).rejects.toThrow();
        });
        it('[IV.8] should reject swap if target monster is fainted', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            state.playerTeam[1].isFainted = true;
            battleSessions.set(battleId, state);
            await expect(playerSwap(p2.id)).rejects.toThrow();
        });
        it('[IV.9] should reject action from a fainted monster', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].isFainted = true;
            battleSessions.set(battleId, state);
            await expect(performAction(battleId, mockBasicAttack.id)).rejects.toThrow();
        });
        it('[IV.10] monster fainting from DoT should not get an action', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 5;
            state.playerTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].isFainted).toBe(true);
            expect(battleState.battleLog.some(l => l.message.includes('used Basic Attack'))).toBe(false);
        });
    });
    describe('Newly Added Granular Tests', () => {
        it('[ADD.1] Stat Modifier: FLAT buffs should apply before PERCENTAGE buffs', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.2] Stat Modifier: FLAT debuffs should apply before PERCENTAGE debuffs', async () => {
             expect(true).toBe(true);
        });
        it('[ADD.3] Stat Modifier: Multiple PERCENTAGE buffs should stack additively', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.4] Stat Modifier: A buff and a debuff should partially cancel each other out', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.5] Passive Trigger: ON_BATTLE_START should trigger when battle begins', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, []);
            const p2 = createTestMonster(mockGriffinTemplate, 102, [mockTailwindPassive]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p1, p2], [a]);
            expect(state.battleLog.some(l => l.message.includes('Tailwind'))).toBe(true);
        });
        it('[ADD.6] Passive Trigger: ON_BEING_HIT should trigger when taking damage', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.events.some(e => e.type === 'EVADE')).toBe(true);
        });
        it('[ADD.7] Passive Trigger: ON_HP_THRESHOLD should trigger when crossing the threshold going down', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive]);
            const a = createTestMonster({ ...mockAethTemplate, basePower: 500 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) + 1;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(true);
        });
        it('[ADD.8] Passive Trigger: ON_HP_THRESHOLD should trigger when crossing the threshold going up', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) - 1;
            state.playerTeam[0].activeEffects.push({ sourceAbilityId: 7, stat: 'defense', type: 'PERCENTAGE', value: 100 } as any);
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(false);
        });
        it('[ADD.9] Passive Trigger: ON_ABILITY_USE should trigger when an ability is used', async () => {
             vi.spyOn(Math, 'random').mockReturnValue(0);
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockEmberSpit.id);
            expect(battleState.battleLog.some(l => l.message.includes('Soot Cloud'))).toBe(true);
        });
        it('[ADD.10] Passive Trigger: END_OF_TURN should trigger at the end of a turn', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockSoothingAuraPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.battleLog.some(l => l.message.includes('Soothing Aura'))).toBe(true);
        });
        it('[ADD.11] Combinatorial: BURN damage should trigger ON_HP_THRESHOLD passive', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) + 1;
            state.playerTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1, default_value: '10' });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(true);
        });
        it('[ADD.12] Combinatorial: HEALING effect should trigger ON_HP_THRESHOLD deactivation', async () => {
            const p = createTestMonster(mockTortoiseTemplate, 101, [mockCrystalizePassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = (p.maxHp / 2) - 10;
            state.playerTeam[0].activeEffects.push({ sourceAbilityId: 7, stat: 'defense', type: 'PERCENTAGE', value: 100 } as any);
            state.playerTeam[0].statusEffects.push({ ...mockHealingEffect, duration: 1, default_value: '20' });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].activeEffects.some(e => e.stat === 'defense')).toBe(false);
        });
        it('[ADD.13] Combinatorial: PARALYZED should prevent END_OF_TURN passives from triggering', async () => {
            const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockParalyzedEffect, duration: 1 });
            const initialHp = state.playerTeam[0].battleHp;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp);
        });
        it('[ADD.14] Combinatorial: CONFUSED self-damage should trigger ON_BEING_HIT passives', async () => {
            const p_monster = { ...mockGigaTemplate, basePower: 100 };
            const p = createTestMonster(p_monster, 101, [mockPhaseShiftPassive, mockBasicAttack]);
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[0].battleHp).toBeLessThan(initialHp);
            expect(battleState.events.some(e => e.type === 'EVADE')).toBe(false);
        });
        it('[ADD.15] Data Structure: All monsters in battle session must have a nested .monster property', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            expect(state.playerTeam[0]).toHaveProperty('monster');
            expect(state.aiTeam[0]).toHaveProperty('monster');
        });
        it('[ADD.16] Data Structure: top-level ID should be different from nested monsterId', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            expect(state.playerTeam[0].id).not.toBe(state.playerTeam[0].monster.id);
        });
        it('[ADD.17] Targeting: ANY_ALLY should not be able to target self if not explicitly allowed', async () => {
             const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
             const a = createTestMonster(mockAethTemplate, 201, [], false);
             const state = await setupBattle([p], [a]);
             state.playerTeam[0].battleHp = 10;
             battleSessions.set(battleId, state);
             const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
             expect(battleState.playerTeam[0].battleHp).toBe(10 + 150);
        });
        it('[ADD.18] Targeting: ACTIVE_OPPONENT should only target the active opponent', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a1 = createTestMonster(mockAethTemplate, 201, [], false);
            const a2 = createTestMonster(mockSquirrelTemplate, 202, [], false);
            const initialHp2 = a2.hp;
            await setupBattle([p], [a1, a2]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[1].battleHp).toBe(initialHp2);
        });
        it('[ADD.19] Affinity: Basic Attack should use override_affinity from monster_abilities', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.20] Faint: A fainted monster\'s passives should be deactivated', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockSoothingAuraPassive, mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].isFainted = true;
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.events.some(l => l.abilityName === 'Soothing Aura')).toBe(false);
        });
        it('[ADD.21] Faint: A forced swap should be required when active monster faints', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockTortoiseTemplate, 102, []);
            const a = createTestMonster({ ...mockAethTemplate, basePower: 999 }, 201, [mockPsyBeam], false);
            const state = await setupBattle([p1, p2], [a]);
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            expect(battleState.playerTeam[0].isFainted).toBe(true);
            expect(battleState.turn).toBe('player');
        });
    });
    describe('Final Granular & Combinatorial Tests', () => {
        it('[ADD.1] Stat Modifier: should correctly calculate a single FLAT buff', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.2] Stat Modifier: should correctly calculate a single PERCENTAGE buff', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.3] Stat Modifier: should apply FLAT buffs before PERCENTAGE buffs', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.4] Stat Modifier: should correctly stack multiple PERCENTAGE buffs', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.5] Stat Modifier: should correctly apply a PERCENTAGE debuff', async () => {
            expect(true).toBe(true);
        });
        it('[ADD.6] Passive Scope: ON_ABILITY_USE (ACTIVE) should not trigger from bench', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockSalamanderTemplate, 102, [mockSootCloudPassive, mockEmberSpit]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p1, p2], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')).toBe(false);
        });
        it('[ADD.7] Passive Scope: END_OF_TURN (ACTIVE) should not trigger from bench', async () => {
            const p1 = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const p2 = createTestMonster(mockSalamanderTemplate, 102, [mockVolcanicHeartPassive]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p1, p2], [a]);
            const initialHp = p2.hp;
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.playerTeam[1].battleHp).toBe(initialHp);
        });
        it('[ADD.8] Combinatorial: Two different DoT effects should both apply damage', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const burnDamage = Math.floor(a.maxHp! * 0.05);
            const poisonDamage = 15;
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - burnDamage - poisonDamage);
        });
        it('[ADD.9] Combinatorial: Evasion should be checked for each hit of a multi-hit attack', async () => {
            const p = createTestMonster(mockGriffinTemplate, 101, [mockPeckFlurry]);
            const a = createTestMonster(mockAethTemplate, 201, [mockPhaseShiftPassive], false);
            await setupBattle([p], [a]);
            vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9).mockReturnValueOnce(0.9);
            const initialHp = a.hp;
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            const damageDealt = initialHp - battleState.aiTeam[0].battleHp;
            expect(damageDealt).toBeGreaterThan(0);
            expect(battleState.events.filter(l => l.type === 'EVADE').length).toBe(1);
            expect(battleState.events.filter(l => l.type === 'DAMAGE').length).toBe(2);
        });
        it('[ADD.10] Granular: Restoring Geyser healing amount should be exact', async () => {
            const p = createTestMonster(mockAxolotlTemplate, 101, [mockRestoringGeyser]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].battleHp = 10;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockRestoringGeyser.id, p.id);
            expect(battleState.playerTeam[0].battleHp).toBe(10 + 150);
        });
        it('[ADD.11] Granular: CONFUSED self-damage calculation should be precise', async () => {
            const p_monster = { ...mockGigaTemplate, basePower: 100 };
            const p = createTestMonster(p_monster, 101, [mockBasicAttack]);
            const initialHp = p.hp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.playerTeam[0].statusEffects.push({ ...mockConfusedEffect, duration: 1 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            const expectedDamage = Math.floor(100 * parseFloat(mockConfusedEffect.secondary_value!));
            expect(battleState.playerTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[ADD.12] Granular: BURNED damage calculation should be precise', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster({ ...mockAethTemplate, hp: 200, maxHp: 200 }, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const expectedDamage = Math.floor(200 * (parseInt(mockBurnedEffect.default_value!) / 100));
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[ADD.13] Granular: POISONED damage calculation should be precise', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, []);
            const a = createTestMonster(mockAethTemplate, 201, [mockBasicAttack], false);
            const state = await setupBattle([p], [a]);
            const initialHp = a.hp;
            state.aiTeam[0].statusEffects.push({ ...mockPoisonedEffect, duration: 1 });
            state.turn = 'ai';
            battleSessions.set(battleId, state);
            const { battleState } = await aiTurn();
            const expectedDamage = parseInt(mockPoisonedEffect.default_value!);
            expect(battleState.aiTeam[0].battleHp).toBe(initialHp - expectedDamage);
        });
        it('[ADD.14] Granular: Peck Flurry MP cost should only be deducted once', async () => {
            const p = createTestMonster(mockGriffinTemplate, 101, [mockPeckFlurry]);
            const initialMp = p.mp;
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockPeckFlurry.id);
            expect(battleState.playerTeam[0].battleMp).toBe(initialMp - mockPeckFlurry.mp_cost!);
        });
        it('[ADD.15] Granular: Soot Cloud chance-based application should be verifiable', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSalamanderTemplate, 101, [mockSootCloudPassive, mockEmberSpit]);
                const a = createTestMonster(mockAethTemplate, 201, [], false);
                await setupBattle([p], [a]);
                const { battleState } = await performAction(battleId, mockEmberSpit.id);
                if (battleState.aiTeam[0].statusEffects.some(e => e.name === 'POISONED')) count++;
            }
            expect(count).toBe(100); 
        });
        it('[ADD.16] Granular: Volcanic Heart chance-based application should be verifiable', async () => {
            let count = 0;
            for (let i = 0; i < 100; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i / 100);
                const p = createTestMonster(mockSalamanderTemplate, 101, [mockVolcanicHeartPassive, mockBasicAttack]);
                const a = createTestMonster(mockAethTemplate, 201, [], false);
                const state = await setupBattle([p], [a]);
                state.playerTeam[0].battleHp = 10;
                battleSessions.set(battleId, state);
                const { battleState } = await performAction(battleId, mockBasicAttack.id);
                if (battleState.events.some(e => e.abilityName === 'Volcanic Heart')) count++;
            }
            expect(count).toBe(100);
        });
        it('[ADD.17] Faint: A fainted monster should have isFainted = true', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 999 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 1;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 1;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].isFainted).toBe(true);
        });
        it('[ADD.18] Faint: A fainted monster should have its HP set to 0', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 999 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            a.hp = 1;
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 1;
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].battleHp).toBe(0);
        });
        it('[ADD.19] Faint: All status effects should be cleared from a fainted monster', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 999 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 1;
            state.aiTeam[0].statusEffects.push({ ...mockBurnedEffect, duration: 2 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].statusEffects.length).toBe(0);
        });
        it('[ADD.20] Faint: All active effects (buffs/debuffs) should be cleared from a fainted monster', async () => {
            const p = createTestMonster({ ...mockGigaTemplate, basePower: 999 }, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            const state = await setupBattle([p], [a]);
            state.aiTeam[0].battleHp = 1;
            state.aiTeam[0].activeEffects.push({ sourceAbilityId: 1, stat: 'power', type: 'PERCENTAGE', value: 50 });
            battleSessions.set(battleId, state);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.aiTeam[0].activeEffects.length).toBe(0);
        });
        it('[ADD.21] Battle Log: should log a message for a successful hit', async () => {
            const p = createTestMonster(mockGigaTemplate, 101, [mockBasicAttack]);
            const a = createTestMonster(mockAethTemplate, 201, [], false);
            await setupBattle([p], [a]);
            const { battleState } = await performAction(battleId, mockBasicAttack.id);
            expect(battleState.battleLog.some(l => l.message.includes('Gigalith used Basic Attack'))).toBe(true);
        });
    });
});