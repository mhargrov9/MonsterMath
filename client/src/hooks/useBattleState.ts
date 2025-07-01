import { useQuery, useMutation } from "@tanstack/react-query";
import { BattleState, TurnResult } from "../types/game";

export function useBattleState(battleId: string) {
  const { data: battle, refetch } = useQuery<BattleState>({
    queryKey: ["battle", battleId],
    queryFn: async () => {
      const res = await fetch(`/api/battle/${battleId}`);
      return res.json();
    },
  });

  const turnMutation = useMutation({
    mutationFn: async (action: { userId: string; abilityId: string; targetIds: string[] }) => {
      const res = await fetch(`/api/battle/${battleId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      return res.json() as Promise<TurnResult>;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return { battle, takeTurn: turnMutation.mutateAsync, isLoading: !battle };
}
