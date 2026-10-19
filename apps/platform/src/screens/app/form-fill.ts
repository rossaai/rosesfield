import type { AppListing, AssetKind } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { assetQuery, characterQuery, runQuery } from "@/api/queries"
import { isAssetInput } from "@/catalog/app-facts"
import type { Draft } from "@/router-context"
import {
  type FieldValue,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"

type Placement = { kind: AssetKind | "character"; id: string }

function withPlaced(
  app: AppListing,
  values: FormValues,
  placement: Placement
): FormValues {
  const inputs: Record<string, FieldValue> = { ...values.inputs }
  const target = app.inputs.find((input) => {
    const current = inputs[input.name]
    const list = Array.isArray(current) ? current : []
    const takes =
      placement.kind === "character"
        ? input.type === "character"
        : isAssetInput(input) && input.type === placement.kind
    return (
      takes &&
      "max" in input &&
      list.length < input.max &&
      !list.includes(placement.id)
    )
  })
  if (target === undefined) {
    return values
  }
  const current = inputs[target.name]
  inputs[target.name] = [
    ...(Array.isArray(current) ? current : []),
    placement.id,
  ]
  return { ...values, inputs }
}

export function withPrompt(
  app: AppListing,
  values: FormValues,
  prompt: string
): FormValues {
  const input = app.inputs.find((one) => one.type === "prompt")
  if (input === undefined || prompt === "") {
    return values
  }
  return { ...values, inputs: { ...values.inputs, [input.name]: prompt } }
}

async function placementOf(
  client: QueryClient,
  id: string
): Promise<Placement | null> {
  try {
    const found = await client.fetchQuery(assetQuery(id))
    return { kind: found.asset.kind, id }
  } catch {
    try {
      await client.fetchQuery(characterQuery(id))
      return { kind: "character", id }
    } catch {
      return null
    }
  }
}

export async function placeAll(
  client: QueryClient,
  app: AppListing,
  values: FormValues,
  ids: readonly string[]
): Promise<FormValues> {
  const placements = await Promise.all(ids.map((id) => placementOf(client, id)))
  return placements.reduce(
    (current, placement) =>
      placement === null ? current : withPlaced(app, current, placement),
    values
  )
}

export async function fillFromDraft(
  client: QueryClient,
  app: AppListing,
  values: FormValues,
  draft: Draft
): Promise<FormValues> {
  const prompted = withPrompt(app, values, draft.prompt)
  const placed = await placeAll(client, app, prompted, draft.assetIds)
  return draft.characterIds.reduce(
    (current, id) => withPlaced(app, current, { kind: "character", id }),
    placed
  )
}

export async function fillFromRun(
  client: QueryClient,
  app: AppListing,
  runId: string
): Promise<FormValues | null> {
  try {
    const found = await client.fetchQuery(runQuery(runId))
    return found.run.appId === app.id ? valuesFromRun(app, found.run) : null
  } catch {
    return null
  }
}
