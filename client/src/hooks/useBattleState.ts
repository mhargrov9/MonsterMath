import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

// --- Self-Contained, Correct Type Definitions ---
// These types are now defined locally to ensure correctness and avoid dependency issues.

interface Ability {
  id: number;
  name: string;
  description: string;
  ability_type: 'ACTIVE' | 'PASSIVE';
  mp_cost: number | null;
  affinity?: string | null;
}

interface BaseMonster {
  id: number | string;
  name: string;
  basePower?: number | null;
  baseDefense?: number | null;
  baseSpeed?: number | null;
}

interface BaseUserMonster {
  id: number;
  monsterId: number;
  level: number;
  power: number;
  speed: number;
  defense: number;
  hp: number | null;
  maxHp: number | null;
  mp: number | null;
  maxMp: number | null;
}

type PlayerCombatMonster = BaseUserMonster & { monster: BaseMonster };
type AiCombatMonster = BaseMonster & { abilities: Ability[]; hp: number; mp: number; };

type BattleState = {
    playerTeam: PlayerCombatMonster[];
    aiTeam: AiCombatMonster[];
    activePlayerIndex: number;
    activeAiIndex: number;
};

// This type defines the shape of the data we expect back from the server.
type BattleActionResponse = {
    nextState: BattleState;
    log: string[];
}

export const useBattleState = (initialPlayerTeam: PlayerCombatMonster[], initialAiTeam: AiCombatMonster[]) => {
    const [playerTeam, setPlayerTeam] = useState<PlayerCombatMonster[]>(initialPlayerTeam);
    const [aiTeam, setAiTeam] = useState<AiCombatMonster[]>(initialAiTeam);
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

        const battleState: BattleState = { playerTeam, aiTeam, activePlayerIndex, activeAiIndex };

        try {
            const response: BattleActionResponse = await apiRequest('/api/battle/action', {
                method: 'POST',
                data: { battleState, action }
            });

            const { nextState, log } = response;

            setPlayerTeam(nextState.playerTeam);
            setAiTeam(nextState.aiTeam);
            setActivePlayerIndex(nextState.activePlayerIndex);
            setActiveAiIndex(nextState.activeAiIndex);
            setBattleLog(prev => [...prev, ...log]);

            if (nextState.aiTeam.every((m: AiCombatMonster) => (m.hp ?? 0) <= 0)) {
                setBattleEnded(true);
                setWinner('player');
                setBattleLog(prev => [...prev, '--- YOU ARE VICTORIOUS! ---']);
            } else if (nextState.playerTeam.every((m: PlayerCombatMonster) => (m.hp ?? 0) <= 0)) {
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
        if ((attacker.hp ?? 0) <= 0 || (attacker.mp ?? 0) < (ability.mp_cost || 0)) {
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
        actions: { handlePlayerAbility, handleSwapMonster }
    };
};