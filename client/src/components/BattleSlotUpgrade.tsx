import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/game';

interface BattleSlotUpgradeProps {
  currentSlots: number;
  cost: number;
}

const BattleSlotUpgrade: React.FC<BattleSlotUpgradeProps> = ({ currentSlots, cost }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => {
      return apiRequest('/api/user/upgrade-slots', { method: 'POST' });
    },
    onSuccess: async (res) => {
      const data: { user: User } = await res.json();
      toast({
        title: 'Upgrade Successful!',
        description: `You now have ${data.user.battleSlots} battle slots`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/battle-slots'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upgrade Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? 'Upgrading...' : `Buy Slot (+1) for ${cost}g`}
    </Button>
  );
};

export default BattleSlotUpgrade;