import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { 
    Ability, 
    PlayerCombatMonster, 
    AiCombatMonster,
    BattleActionResponse
} from '@/types/game';

export type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
    log: string[];
};

export const useBattleState = (initialPlayerTeam: PlayerCombatMonster[], initialAiTeam: AiCombatMonster[]) => {
    const [battleState, setBattleState] = useState<BattleState>({
        playerTeam: initialPlayerTeam,
        aiTeam: initialAiTeam,
        activePlayerIndex: 0,
        activeAiIndex: 0,
        log: ['Battle Started!'],
    });
    const [turn, setTurn] = useState<'player' | 'ai' | 'game-over'>('player');
    const [isProcessing, setIsProcessing] = useState(false);

    const processAction = async (action: any) => {
        if (isProcessing || turn === 'game-over') return;
        setIsProcessing(true);

        try {
            const res = await apiRequest('/api/battle/action', {
                method: 'POST',
                data: { battleState, action }
            });
            const response: BattleActionResponse = await res.json();

            setBattleState({
                ...response.nextState,
                log: [...battleState.log, ...response.log]
            });

            if (response.nextState.aiTeam.every(m => (m.hp ?? 0) <= 0) || response.nextState.playerTeam.every(m => (m.hp ?? 0) <= 0)) {
                setTurn('game-over');
            } else {
                if (turn === 'player') setTurn('ai');
            }
        } catch (error) {
            console.error("Error processing action:", error);
            setBattleState(s => ({...s, log: [...s.log, "An error occurred."]}))
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (turn === 'ai' && !isProcessing) {
            const aiTurnHandler = setTimeout(async () => {
                const res = await apiRequest('/api/battle/ai-action', {
                    method: 'POST',
                    data: { battleState }
                });
                const aiAction = await res.json();
                await processAction(aiAction);
                setTurn('player');
            }, 1500);

            return () => clearTimeout(aiTurnHandler);
        }
    }, [turn, isProcessing, battleState]);

    const handlePlayerAbility = (ability: Ability) => {
        const attacker = battleState.playerTeam[battleState.activePlayerIndex];
        if ((attacker.hp ?? 0) <= 0 || (attacker.mp ?? 0) < (ability.mp_cost || 0)) return;
        const action = { 
            type: 'USE_ABILITY', 
            payload: { 
                abilityId: ability.id,
                casterId: attacker.id,
                targetId: battleState.aiTeam[battleState.activeAiIndex].id
            } 
        };
        processAction(action);
    };

    const handleSwapMonster = (monsterId: number) => {
        const action = { type: 'SWAP_MONSTER', payload: { monsterId } };
        processAction(action);
    };

    const battleEnded = turn === 'game-over';
    const winner = battleEnded ? (battleState.aiTeam.every(m => (m.hp ?? 0) <= 0) ? 'player' : 'ai') : null;

    return {
        battleState,
        isPlayerTurn: turn === 'player' && !isProcessing,
        battleEnded,
        winner,
        isProcessing,
        actions: { handlePlayerAbility, handleSwapMonster }
    };
};