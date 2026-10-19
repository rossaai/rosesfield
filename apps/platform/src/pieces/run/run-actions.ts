import { type Run, routes } from "@rosesfield/contract"
import {
  type QueryClient,
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { callRoute } from "@/api/call-route"

export function storeRun(client: QueryClient, run: Run): void {
  client.setQueryData(["run", run.id], { run })
  void client.invalidateQueries({ queryKey: ["runs"] })
}

export function useCancelRun(): UseMutationResult<Run, Error, string> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const answer = await callRoute(routes.cancelRun, { params: { runId } })
      return answer.run
    },
    onSuccess: (run) => storeRun(client, run),
  })
}

export function useRepeatRun(): UseMutationResult<Run, Error, string> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const answer = await callRoute(routes.repeatRun, { params: { runId } })
      return answer.run
    },
    onSuccess: (run) => storeRun(client, run),
  })
}
