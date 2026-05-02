import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser, fetchUserById } from "../api/users";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserById(userId) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
