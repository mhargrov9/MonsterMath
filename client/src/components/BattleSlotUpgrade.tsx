import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Gem, Users, ArrowUp, Crown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BattleSlotUpgradeProps {
  currentSlots: number;
  diamonds: number;
  onUpgrade?: () => void;
}

export default function BattleSlotUpgrade({ currentSlots, diamonds, onUpgrade }: BattleSlotUpgradeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const slotCosts = [0, 0, 50, 150, 400]; // Index matches slot number
  const nextSlot = currentSlots + 1;
  const cost = slotCosts[nextSlot] || 0;
  const canUpgrade = nextSlot <= 5 && diamonds >= cost;
  const maxSlots = currentSlots >= 5;

  const purchaseSlotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/battle/purchase-slot', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Battle Slot Purchased!",
        description: `You now have ${data.user.battleSlots} battle slots`,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onUpgrade?.();
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getSlotDescription = (slots: number) => {
    switch (slots) {
      case 2: return "Current: Basic dual monster battles";
      case 3: return "Upgrade to: Triple threat formations";
      case 4: return "Upgrade to: Quad squad dominance";
      case 5: return "Upgrade to: Elite five-monster army";
      default: return "Maximum battle capacity reached";
    }
  };

  const getRankTitle = (slots: number) => {
    switch (slots) {
      case 2: return "Novice Trainer";
      case 3: return "Skilled Tactician";
      case 4: return "Battle Commander";
      case 5: return "Monster Master";
      default: return "Legendary Champion";
    }
  };

  if (maxSlots) {
    return (
      <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-900">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
            {getRankTitle(currentSlots)}
          </CardTitle>
          <p className="text-yellow-700 dark:text-yellow-300">
            Maximum battle slots achieved!
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            {currentSlots} Battle Slots
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-purple-100 dark:from-blue-950 dark:to-purple-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Battle Slot Upgrade
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-sm">
            {getRankTitle(currentSlots)}
          </Badge>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-bold">{currentSlots} Slots</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {getSlotDescription(currentSlots)}
          </p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ArrowUp className="w-4 h-4 text-green-600" />
            <span>Next: {getRankTitle(nextSlot)}</span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={!canUpgrade || purchaseSlotMutation.isPending}
              className="w-full"
              size="lg"
            >
              {purchaseSlotMutation.isPending ? (
                "Purchasing..."
              ) : !canUpgrade ? (
                diamonds < cost ? `Need ${cost - diamonds} More Diamonds` : "Max Slots Reached"
              ) : (
                <>
                  <Gem className="w-4 h-4 mr-2" />
                  Upgrade to {nextSlot} Slots ({cost} Diamonds)
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Purchase Battle Slot</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Upgrade from <strong>{currentSlots} slots</strong> to <strong>{nextSlot} slots</strong>
                </p>
                <p>
                  Cost: <strong>{cost} Diamonds</strong>
                </p>
                <p>
                  Your Balance: <strong>{diamonds} Diamonds</strong>
                </p>
                <p className="text-sm text-gray-600">
                  More battle slots allow you to bring additional monsters into battle for strategic advantage.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => purchaseSlotMutation.mutate()}>
                Purchase Upgrade
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}