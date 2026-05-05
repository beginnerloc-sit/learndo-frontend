import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { advanceWordStage, fetchVocabulary, movePlant, plantWord } from "../api/vocabulary";
import { harvestPlant } from "../api/leaderboard";
import { getStoredAuth } from "../api/auth";

function currentUserId() {
  return getStoredAuth()?.user?.id ?? null;
}

export function useVocabulary(userId) {
  const uid = userId ?? currentUserId();
  return useQuery({
    queryKey: ["vocabulary", uid],
    queryFn: () => fetchVocabulary(uid),
    enabled: !!uid,
    staleTime: 60 * 1000,
    // Refetch every ~2.5 min so reactions/notes from friends appear without
    // a manual reload. Background refetches only — won't disturb a tab that
    // isn't focused.
    refetchInterval: 150 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function usePlantWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plantWord,
    onSuccess: () => {
      const uid = currentUserId();
      queryClient.invalidateQueries({ queryKey: ["vocabulary", uid] });
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}

export function useMovePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, x, y }) => movePlant(id, { x, y }),
    onSuccess: () => {
      const uid = currentUserId();
      queryClient.invalidateQueries({ queryKey: ["vocabulary", uid] });
    },
  });
}

export function useAdvanceWordStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: advanceWordStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });
}

export function useHarvestPlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: harvestPlant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      // Refresh the current user so plants_count drops in sync everywhere
      // that reads it (e.g. FriendsScreen self-rendering, future dashboards).
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}
