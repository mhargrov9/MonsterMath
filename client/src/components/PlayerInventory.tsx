import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InventoryItem } from "@shared/schema";

interface PlayerInventoryProps {
  trigger?: React.ReactNode;
}

export default function PlayerInventory({ trigger }: PlayerInventoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: isOpen,
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemName: string) => {
      await apiRequest("DELETE", `/api/inventory/${encodeURIComponent(itemName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Removed",
        description: "Item has been removed from your backpack.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
    },
  });

  const useItemMutation = useMutation({
    mutationFn: async ({ itemName, quantity }: { itemName: string; quantity: number }) => {
      await apiRequest("PUT", `/api/inventory/${encodeURIComponent(itemName)}`, { quantityDelta: -quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item Used",
        description: "Item has been used successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to use item.",
        variant: "destructive",
      });
    },
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'consumable': return 'fas fa-flask';
      case 'tool': return 'fas fa-wrench';
      case 'quest': return 'fas fa-scroll';
      case 'material': return 'fas fa-gem';
      default: return 'fas fa-box';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="relative">
            <i className="fas fa-backpack text-lg"></i>
            {inventory.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {inventory.length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-backpack text-vibrant-purple"></i>
            Player Backpack
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-backpack text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-500 mb-2">Your backpack is empty</h3>
            <p className="text-gray-400">Items you find on your adventures will appear here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {inventory.length} item{inventory.length !== 1 ? 's' : ''} in your backpack
              </p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventory.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-electric-blue/20 to-vibrant-purple/20 flex items-center justify-center">
                          <i className={`${item.iconClass || getTypeIcon(item.itemType)} text-electric-blue`}></i>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.itemName}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getRarityColor(item.rarity || 'common')}>
                              {item.rarity || 'common'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.itemType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-gold-yellow/20 text-gold-yellow px-2 py-1 rounded-md text-sm font-bold">
                          ×{item.quantity}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {item.itemDescription && (
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm">
                        {item.itemDescription}
                      </CardDescription>
                      
                      <div className="flex gap-2 mt-3">
                        {item.itemType === 'consumable' && (
                          <Button
                            size="sm"
                            onClick={() => useItemMutation.mutate({ itemName: item.itemName, quantity: 1 })}
                            disabled={useItemMutation.isPending}
                            className="bg-gradient-to-r from-lime-green to-electric-blue text-white"
                          >
                            <i className="fas fa-hand-sparkles mr-1"></i>
                            Use Item
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItemMutation.mutate(item.itemName)}
                          disabled={removeItemMutation.isPending}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}