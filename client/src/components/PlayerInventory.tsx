import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface InventoryItem {
    id: number;
    itemName: string;
    quantity: number;
}

const PlayerInventory: React.FC<{ trigger: React.ReactNode }> = ({ trigger }) => {
    const queryClient = useQueryClient();

    const { data: inventory } = useQuery<InventoryItem[]>({
        queryKey: ['/api/inventory'],
        queryFn: () => apiRequest('/api/inventory').then(res => res.json())
    });

    const deleteMutation = useMutation({
        mutationFn: (itemName: string) => {
            return apiRequest(`/api/inventory/${encodeURIComponent(itemName)}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        }
    });

    const useMutation = useMutation({
        mutationFn: ({ itemName, quantity }: { itemName: string, quantity: number }) => {
            return apiRequest(`/api/inventory/${encodeURIComponent(itemName)}`, {
                method: 'PUT',
                data: { quantityDelta: quantity }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        }
    });

    return (
        <div>
            {/* Simplified for brevity */}
            {trigger}
        </div>
    );
};

export default PlayerInventory;