import { useState, useEffect } from 'react';
import { UserMonster, Monster, Ability, ActiveEffect, FloatingText } from '@/types/game';
import { applyPassives } from '@/lib/passiveEngine';
import { calculateDamage, getModifiedStat } from '@/lib/battleCalculations';

export const useBattleState = (initialPlayerTeam: UserMonster[], initialAiTeam: Monster[]) => {
    const [playerTeam, setPlayerTeam] = useState<UserMonster[]>(initialPlayerTeam);
    const [aiTeam, setAiTeam] = useState<Monster[]>(initialAiTeam);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [activeAiIndex, setActiveAiIndex] = useState(0);
    const [turn, setTurn] = useState<'player' | 'ai'>('player');
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [battleEnded, setBattleEnded] = useState(false);
    const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
    const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const [targetingMode, setTargetingMode] = useState<{ ability: Ability; validTargets: (number | string)[] } | null>(null);

    const addLogEntry = (entry: string) => setBattleLog(prev => [...prev, entry]);

    const addFloatingText = (text: string, type: 'damage' | 'heal' | 'crit' | 'info', targetId: number | string, isPlayerTarget: boolean) => {
        const newText: FloatingText = { id: Date.now() + Math.random(), text, type, targetId, isPlayerTarget };
        setFloatingTexts(prev => [...prev, newText]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== newText.id)), 1500);
    };

    const handleBattleCompletion = (winnerVal: 'player' | 'ai') => {
        if (battleEnded) return;
        addLogEntry(`--- BATTLE OVER ---`);
        setBattleEnded(true);
        setWinner(winnerVal);
    };

    const handleAction = (isPlayerAction: boolean, actionFn: () => { pTeam: UserMonster[], aTeam: Monster[] }) => {
        if ((isPlayerAction && turn !== 'player') || (!isPlayerAction && turn !== 'ai') || battleEnded) return;
        const { pTeam, aTeam } = actionFn();
        setPlayerTeam(pTeam);
        setAiTeam(aTeam);
        setTurn(isPlayerAction ? 'ai' : 'player');
    };

    const handlePlayerAbility = (ability: Ability) => {
        if (targetingMode) return;
        const attacker = playerTeam[activePlayerIndex];
        if (attacker.mp < (ability.mp_cost || 0)) {
            addLogEntry("Not enough MP!"); return;
        }
        if (ability.healing_power && ability.healing_power > 0) {
            setTargetingMode({ ability, validTargets: playerTeam.map(p => p.id) });
            addLogEntry(`Select a target for ${ability.name}.`);
        } else {
            handleAction(() => {
                const defender = aiTeam[activeAiIndex];
                const damage = calculateDamage(attacker, defender, ability, activeEffects);
                addFloatingText(`-${damage}`, 'damage', defender.id, false);
                addLogEntry(`Your ${attacker.monster.name} used ${ability.name}, dealing ${damage} damage!`);
                const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m);
                const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
                return { pTeam: nextPlayerTeam, aTeam: nextAiTeam };
            }, true);
        }
    };

    const handleAiAbility = () => {
        handleAction(() => {
            const activeAi = aiTeam[activeAiIndex];
            const defender = playerTeam[activePlayerIndex];
            const ability = activeAi.abilities?.find(a => a.ability_type === 'ACTIVE' && !a.healing_power) || activeAi.abilities?.[0];
            if (!ability) return { pTeam: playerTeam, aTeam: aiTeam };
            const damage = calculateDamage(activeAi, defender, ability, activeEffects);
            addFloatingText(`-${damage}`, 'damage', defender.id, true);
            addLogEntry(`Opponent's ${activeAi.name} used ${ability.name}, dealing ${damage} damage!`);
            const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damage) } : m);
            const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
            return { pTeam: nextPlayerTeam, aTeam: nextAiTeam };
        }, false);
    };

    const handleSwapMonster = (monsterId: number) => {
        handleAction(() => {
            const newIndex = playerTeam.findIndex(p => p.id === monsterId);
            if (newIndex !== -1 && playerTeam[newIndex].hp > 0) {
                addLogEntry(`You send out ${playerTeam[newIndex].monster.name}!`);
                setActivePlayerIndex(newIndex);
            }
            return { pTeam: playerTeam, aTeam: aiTeam };
        }, true);
    };

    const handleTargetSelect = (targetId: number | string) => {
        if (!targetingMode) return;
        const { ability } = targetingMode;
        handleAction(() => {
            const attacker = playerTeam[activePlayerIndex];
            const target = playerTeam.find(p => p.id === targetId);
            if (!target) return { pTeam: playerTeam, aTeam: aiTeam };
            const healAmount = ability.healing_power || 0;
            addLogEntry(`Your ${attacker.monster.name} used ${ability.name}, healing ${target.monster.name} for ${healAmount} HP!`);
            addFloatingText(`+${healAmount}`, 'heal', targetId, true);
            const nextPlayerTeam = playerTeam.map(p => p.id === targetId ? {...p, hp: Math.min(p.maxHp, p.hp + healAmount)} : p)
                .map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m);
            setTargetingMode(null);
            return { pTeam: nextPlayerTeam, aTeam: aiTeam };
        }, true);
    };

    // Main Game Loop
    useEffect(() => {
        if (battleEnded || turn === 'pre-battle') return;
        if (playerTeam.every(m => m.hp <= 0)) { handleBattleCompletion('ai'); return; }
        if (aiTeam.every(m => m.hp <= 0)) { handleBattleCompletion('player'); return; }
        const activePlayer = playerTeam[activePlayerIndex];
        const activeAi = aiTeam[activeAiIndex];
        if (turn === 'player' && activePlayer?.hp <= 0) {
            addLogEntry(`Your ${activePlayer.monster.name} fainted! You must swap.`);
            return;
        }
        if (turn === 'ai') {
            if (activeAi?.hp <= 0) {
                const nextIndex = aiTeam.findIndex(m => m.hp > 0);
                if (nextIndex !== -1) {
                    addLogEntry(`Opponent's ${activeAi.name} fainted! Opponent sends out ${aiTeam[nextIndex].name}.`);
                    setActiveAiIndex(nextIndex);
                }
            } else {
                const timer = setTimeout(handleAiAbility, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [turn, battleEnded, playerTeam, aiTeam, activePlayerIndex, activeAiIndex]);

    return {
        state: { playerTeam, aiTeam, activePlayerIndex, activeAiIndex, turn, battleLog, battleEnded, winner, floatingTexts, targetingMode },
        actions: { handlePlayerAbility, handleSwapMonster, handleTargetSelect, setBattleLog, setAiTeam, setPlayerTeam, setTurn, setBattleEnded, setActivePlayerIndex, setActiveAiIndex }
    };
};