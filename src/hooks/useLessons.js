import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLessonQueue, submitAnswer } from "../api/lessons";

export function useLessonQueue(count = 5) {
  return useQuery({
    queryKey: ["lesson", "queue"],
    queryFn: () => fetchLessonQueue(count),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitAnswer,
    onSuccess: (data) => {
      if (data.correct) {
        queryClient.invalidateQueries({ queryKey: ["user", "me"] });
        queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      }
    },
  });
}
