import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PlayerCombatMonster, AiCombatMonster } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

interface CreateBattleResponse {
  battleId: string;
  aiTeam: AiCombatMonster[];
}

/**
 * Hook for creating and managing battle sessions
 */
export const useBattleSession = () => {
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createBattle = async (playerTeam: PlayerCombatMonster[]): Promise<CreateBattleResponse | null> => {
    setIsCreatingBattle(true);

    try {
      // First, spend the battle token and create the battle
      const response = await apiRequest('/api/v1/battles', {
        method: 'POST',
        data: { playerTeam }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error.message);
      }

      // Invalidate user query to update battle tokens
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/user'] });

      return data.data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create battle';

      if (errorMessage.includes('already have an active battle')) {
        toast({
          title: 'Active Battle',
          description: 'You already have a battle in progress. Please finish it first.',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('No battle tokens')) {
        toast({
          title: 'No Battle Tokens',
          description: 'You need battle tokens to start a new battle.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }

      return null;
    } finally {
      setIsCreatingBattle(false);
    }
  };

  const checkActiveBattle = async (): Promise<{ battleId: string; state: any } | null> => {
    try {
      const response = await apiRequest('/api/v1/battles/active', { method: 'GET' });
      const data = await response.json();

      if (data.success) {
        return data.data;
      }

      return null;
    } catch (error) {
      // No active battle
      return null;
    }
  };

  return {
    createBattle,
    checkActiveBattle,
    isCreatingBattle
  };
};