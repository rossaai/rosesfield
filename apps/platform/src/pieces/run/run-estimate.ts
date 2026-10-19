import type { Run } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { settingsQuery } from "@/api/queries"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

export function useRunEstimate(run: Run): number | null {
  const settings = useQuery(settingsQuery)
  const isUnmeasured =
    run.origin === "live" && run.status === "done" && run.cost === null
  const query = useQuery({
    ...priceQuery(
      run.appId,
      { inputs: run.inputs, count: run.count, aspectRatio: run.aspectRatio },
      settings.data?.engine.key ?? "unknown"
    ),
    enabled: isUnmeasured,
  })
  const price = query.data?.price
  return !isUnmeasured || price === undefined || price.source === "unknown"
    ? null
    : price.credits
}
