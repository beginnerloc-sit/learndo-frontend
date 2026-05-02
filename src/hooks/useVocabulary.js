import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { advanceWordStage, fetchVocabulary, plantWord } from "../api/vocabulary";
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
    },
  });
}
