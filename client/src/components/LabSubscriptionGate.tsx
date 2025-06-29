import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function InterestTest({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const subMutation = useMutation({
    mutationFn: async (intent: 'monthly' | 'yearly') => {
      return await apiRequest('/api/interest/subscription', { method: 'POST', data: { intent } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Thanks for your interest!' });
      onComplete();
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest('/api/interest/email', { method: 'POST', data: { email } });
    },
    onSuccess: () => {
      toast({ title: 'We will notify you!' });
      onComplete();
    },
  });

  return (
    <div>
        {/* Simplified for brevity */}
        <h2 className="text-xl font-bold">Interest Test</h2>
    </div>
  )
}