import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../api/leaderboard";

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 60 * 1000,
  });
}
