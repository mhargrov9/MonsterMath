import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ArenaSubscriptionGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const subMutation = useMutation({
    mutationFn: (intent: 'monthly' | 'yearly') => {
      return apiRequest('/api/interest/subscription', {
        method: 'POST',
        data: { intent, source: 'arena' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Thanks for your interest!' });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (email: string) => {
      return apiRequest('/api/interest/email', { method: 'POST', data: { email } });
    },
    onSuccess: () => {
      toast({ title: 'We will notify you!' });
    },
  });

  return (
    <div>
        <h2 className="text-xl font-bold">Arena Subscription Gate</h2>
        <Button onClick={() => subMutation.mutate('monthly')}>I'm Interested!</Button>
    </div>
  );
}