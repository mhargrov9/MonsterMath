import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/types/game";

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    // --- THIS IS THE FIX ---
    // Added the queryFn to tell react-query how to fetch the user data.
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/auth/user', { method: 'GET' });
        return await response.json();
      } catch (error) {
        // If the request fails (e.g., 401 Unauthorized), return null.
        // react-query will treat this as empty data, not an error.
        return null;
      }
    },
    retry: false,
    staleTime: Infinity, // User data is considered fresh until manually invalidated.
  });

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
  };
}