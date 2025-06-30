import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Ability, PlayerCombatMonster, AiCombatMonster } from '@/types/game';

export interface BattleState {
  id: string;
  playerTeam: PlayerCombatMonster[];
  aiTeam: AiCombatMonster[];
  activePlayerIndex: number;
  activeAiIndex: number;
  turnCount: number;
  currentTurn: 'player' | 'ai';
  status: 'active' | 'victory' | 'defeat' | 'abandoned';
  log: string[];
}

export interface BattleSession {
  battleId: string;
  state: BattleState;
  isLoading: boolean;
  error: string | null;
}

/**
 * Professional battle state management hook
 * Handles all communication with the session-based battle API
 */
export const useBattleState = (
  initialPlayerTeam: PlayerCombatMonster[],
  initialAiTeam: AiCombatMonster[],
  battleId: string
) => {
  const [battleState, setBattleState] = useState<BattleState>({
    id: battleId,
    playerTeam: initialPlayerTeam,
    aiTeam: initialAiTeam,
    activePlayerIndex: 0,
    activeAiIndex: 0,
    turnCount: 1,
    currentTurn: 'player',
    status: 'active',
    log: ['Battle Started!']
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetingInfo, setTargetingInfo] = useState<{ ability: Ability } | null>(null);

  // Fetch latest battle state
  const refreshBattleState = useCallback(async () => {
    try {
      const response = await apiRequest(`/api/v1/battles/${battleId}`, { method: 'GET' });
      const data = await response.json();

      if (data.success) {
        setBattleState(data.data);
      } else {
        setError(data.error.message);
      }
    } catch (err) {
      console.error('Failed to refresh battle state:', err);
      setError('Failed to sync battle state');
    }
  }, [battleId]);

  // Process a turn (player or AI)
  const processTurn = useCallback(async (action: any, isPlayerTurn: boolean) => {
    if (isProcessing || battleState.status !== 'active') return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiRequest(`/api/v1/battles/${battleId}/turn`, {
        method: 'POST',
        data: {
          action,
          isPlayerTurn
        }
      });

      const data = await response.json();

      if (data.success) {
        // Update local state with new battle state
        setBattleState(data.data.state);

        // Handle battle end
        if (data.data.state.status !== 'active' && data.data.rewards) {
          console.log('Battle ended, rewards:', data.data.rewards);
        }

        return true;
      } else {
        setError(data.error.message);
        return false;
      }
    } catch (err) {
      console.error('Error processing turn:', err);
      setError('Failed to process turn');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [battleId, battleState.status, isProcessing]);

  // Handle AI turn automatically
  useEffect(() => {
    const processAiTurn = async () => {
      if (battleState.currentTurn === 'ai' && 
          battleState.status === 'active' && 
          !isProcessing) {

        // Add a delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));

        // AI action is generated server-side, we just need to trigger the turn
        await processTurn(null, false);
      }
    };

    processAiTurn();
  }, [battleState.currentTurn, battleState.status, isProcessing, processTurn]);

  // Player action handlers
  const handlePlayerAbility = useCallback((ability: Ability) => {
    const activeMonster = battleState.playerTeam[battleState.activePlayerIndex];

    // Validate ability can be used
    if (!activeMonster || 
        activeMonster.hp <= 0 || 
        (activeMonster.mp || 0) < (ability.mp_cost || 0)) {
      return;
    }

    // Handle targeting for abilities that need it
    if (ability.target_scope === 'ANY_ALLY') {
      setTargetingInfo({ ability });
      return;
    }

    // Default to targeting active opponent
    const action = {
      type: 'USE_ABILITY',
      payload: {
        abilityId: ability.id,
        targetId: battleState.aiTeam[battleState.activeAiIndex].id
      }
    };

    processTurn(action, true);
  }, [battleState, processTurn]);

  const handleTargetSelect = useCallback((targetId: number) => {
    if (!targetingInfo) return;

    const action = {
      type: 'USE_ABILITY',
      payload: {
        abilityId: targetingInfo.ability.id,
        targetId: targetId
      }
    };

    processTurn(action, true);
    setTargetingInfo(null);
  }, [targetingInfo, processTurn]);

  const handleSwapMonster = useCallback((monsterId: number) => {
    const action = {
      type: 'SWAP_MONSTER',
      payload: { monsterId }
    };

    processTurn(action, true);
    setTargetingInfo(null);
  }, [processTurn]);

  const handleForfeit = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await apiRequest(`/api/v1/battles/${battleId}/end`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setBattleState(prev => ({ ...prev, status: 'defeat' }));
      }
    } catch (err) {
      console.error('Failed to forfeit:', err);
      setError('Failed to forfeit battle');
    } finally {
      setIsProcessing(false);
    }
  }, [battleId, isProcessing]);

  return {
    battleState,
    isPlayerTurn: battleState.currentTurn === 'player' && !isProcessing,
    targetingMode: targetingInfo,
    battleEnded: battleState.status !== 'active',
    winner: battleState.status === 'victory' ? 'player' : 
            battleState.status === 'defeat' ? 'ai' : null,
    isProcessing,
    error,
    actions: {
      handlePlayerAbility,
      handleSwapMonster,
      handleTargetSelect,
      handleForfeit,
      refreshBattleState
    }
  };
};