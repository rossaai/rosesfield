import { isHostedModelId } from "@rosesfield/catalog/comfy"
import type { Run } from "@rosesfield/contract"
import { queryOptions } from "@tanstack/react-query"

export type ExploreSourceKind =
  | "own-open-weights"
  | "own-minimax-api"
  | "own-hosted-read"

export type ExplorePeople = "none" | "operator" | "consented" | "other"

export type ExploreAdmission = {
  runId: string
  source: ExploreSourceKind
  yes: `${number}-${number}-${number}`
  people: ExplorePeople
  brand: boolean
}

export const exploreList: readonly ExploreAdmission[] = []

export const exploreListQuery = queryOptions({
  queryKey: ["explore", "list"],
  queryFn: (): readonly ExploreAdmission[] => exploreList,
  initialData: exploreList,
  staleTime: Number.POSITIVE_INFINITY,
})

const admittedSources: readonly ExploreSourceKind[] = [
  "own-open-weights",
  "own-minimax-api",
  "own-hosted-read",
]

const admittedPeople: readonly ExplorePeople[] = [
  "none",
  "operator",
  "consented",
]

const heldOutWeights: readonly RegExp[] = [
  /minimax/i,
  /(^|[^a-z0-9])h3([^a-z0-9]|$)/i,
  /(^|[^a-z0-9])wan[-_ .]?\d/i,
]

const weightsFile = /\.(safetensors|sft|gguf|ckpt|pt|pth|bin)$/i

const yesFormat = /^\d{4}-\d{2}-\d{2}$/

function isWeights(model: string): boolean {
  return weightsFile.test(model) || !isHostedModelId(model)
}

export function usesHeldOutWeights(run: Run): boolean {
  return run.engine.models.some(
    (model) =>
      isWeights(model) && heldOutWeights.some((pattern) => pattern.test(model))
  )
}

export function isAdmitted(
  admission: ExploreAdmission | undefined,
  run: Run
): boolean {
  return (
    admission !== undefined &&
    admission.runId === run.id &&
    admittedSources.includes(admission.source) &&
    yesFormat.test(admission.yes) &&
    admittedPeople.includes(admission.people) &&
    !admission.brand &&
    run.origin === "live" &&
    !usesHeldOutWeights(run)
  )
}

export function admissionsByRun(
  list: readonly ExploreAdmission[]
): ReadonlyMap<string, ExploreAdmission> {
  return new Map(list.map((admission) => [admission.runId, admission]))
}
