import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { 
    Ability, 
    PlayerCombatMonster, 
    AiCombatMonster,
    BattleActionResponse
} from '@/types/game';

type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
    activeEffects: any[]; // Simplified for now
    log: string[];
};

export const useBattleState = (initialPlayerTeam: PlayerCombatMonster[], initialAiTeam: AiCombatMonster[]) => {
    const [battleState, setBattleState] = useState<BattleState>({
        playerTeam: initialPlayerTeam,
        aiTeam: initialAiTeam,
        activePlayerIndex: 0,
        activeAiIndex: 0,
        activeEffects: [],
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

            const nextState = {
                ...response.nextState,
                log: [...battleState.log, ...response.log]
            };
            setBattleState(nextState);

            if (nextState.aiTeam.every(m => (m.hp ?? 0) <= 0) || nextState.playerTeam.every(m => (m.hp ?? 0) <= 0)) {
                setTurn('game-over');
                const winner = nextState.aiTeam.every(m => (m.hp ?? 0) <= 0) ? 'player' : 'ai';
                setBattleState(s => ({...s, log: [...s.log, `--- BATTLE OVER! ${winner.toUpperCase()} WINS! ---`]}))
            } else {
                if (turn === 'player') setTurn('ai');
            }
        } catch (error) {
            console.error("Error processing action:", error);
            setBattleState(s => ({...s, log: [...s.log, "An error occurred."]}));
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

    const winner = turn === 'game-over' ? (battleState.aiTeam.every(m => (m.hp ?? 0) <= 0) ? 'player' : 'ai') : null;

    return {
        state: { 
            ...battleState,
            isPlayerTurn: turn === 'player' && !isProcessing,
            battleEnded: turn === 'game-over',
            winner,
            isProcessing
        },
        actions: { handlePlayerAbility, handleSwapMonster }
    };
};