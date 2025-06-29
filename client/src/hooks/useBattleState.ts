import { useState, useEffect } from 'react';
import { UserMonster, Monster, Ability } from '@/types/game';
import { apiRequest } from '@/lib/queryClient';

export const useBattleState = (initialPlayerTeam: UserMonster[], initialAiTeam: Monster[]) => {
    const [playerTeam, setPlayerTeam] = useState<UserMonster[]>(initialPlayerTeam);
    const [aiTeam, setAiTeam] = useState<Monster[]>(initialAiTeam);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [activeAiIndex, setActiveAiIndex] = useState(0);
    const [turn, setTurn] = useState<'player' | 'ai' | 'pre-battle'>('player');
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [battleEnded, setBattleEnded] = useState(false);
    const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const postAction = async (action: any) => {
        if (isProcessing || battleEnded) return;
        setIsProcessing(true);

        const battleState = { playerTeam, aiTeam, activePlayerIndex, activeAiIndex };

        try {
            const response = await apiRequest('/api/battle/action', {
                method: 'POST',
                data: { battleState, action }
            });

            const { nextState, log } = response;

            // Update state based on the server's response
            setPlayerTeam(nextState.playerTeam);
            setAiTeam(nextState.aiTeam);
            setActivePlayerIndex(nextState.activePlayerIndex);
            setActiveAiIndex(nextState.activeAiIndex);
            setBattleLog(prev => [...prev, ...log]);

            // Check for win/loss conditions
            if (nextState.aiTeam.every((m: Monster) => m.hp <= 0)) {
                setBattleEnded(true);
                setWinner('player');
                setBattleLog(prev => [...prev, '--- YOU ARE VICTORIOUS! ---']);
            } else if (nextState.playerTeam.every((m: UserMonster) => m.hp <= 0)) {
                setBattleEnded(true);
                setWinner('ai');
                setBattleLog(prev => [...prev, '--- YOU HAVE BEEN DEFEATED ---']);
            }

        } catch (error) {
            console.error("Error processing action:", error);
            setBattleLog(prev => [...prev, "An error occurred."]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlayerAbility = (ability: Ability) => {
        const attacker = playerTeam[activePlayerIndex];
        if (attacker.hp <= 0 || attacker.mp < (ability.mp_cost || 0)) {
            return;
        }

        const action = {
            type: 'USE_ABILITY',
            payload: {
                abilityId: ability.id,
                casterId: attacker.id,
                targetId: aiTeam[activeAiIndex].id
            }
        };
        postAction(action);
    };

    const handleSwapMonster = (monsterId: number) => {
        const action = {
            type: 'SWAP_MONSTER',
            payload: { monsterId }
        };
        postAction(action);
    };

    return {
        state: { playerTeam, aiTeam, activePlayerIndex, activeAiIndex, turn, battleLog, battleEnded, winner, isProcessing },
        actions: { handlePlayerAbility, handleSwapMonster, setBattleLog, setPlayerTeam, setAiTeam, setActivePlayerIndex, setActiveAiIndex, setTurn }
    };
};