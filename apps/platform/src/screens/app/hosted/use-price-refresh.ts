import type { Run } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

export function usePriceRefresh(appId: string, runs: readonly Run[]): void {
  const client = useQueryClient()
  const done = runs.filter((run) => run.status === "done").length
  useEffect(() => {
    if (done > 0) {
      void client.invalidateQueries({ queryKey: ["price", appId] })
    }
  }, [client, appId, done])
}
