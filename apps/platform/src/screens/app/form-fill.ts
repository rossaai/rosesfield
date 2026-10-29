import { isHostedModelId } from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type Asset,
  type AssetKind,
  isChainFilled,
  type Run,
} from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { assetQuery, characterQuery, runQuery } from "@/api/queries"
import { uploadAsset } from "@/api/upload-asset"
import {
  characterPhotoInputOf,
  isAssetInput,
  promptInputOf,
} from "@/catalog/app-facts"
import type { Draft } from "@/router-context"
import {
  type FieldValue,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import { shareQuery } from "@/screens/explore/share-api"

type Placement = { kind: AssetKind | "character"; id: string; input?: string }

function withPlaced(
  app: AppListing,
  values: FormValues,
  placement: Placement
): FormValues {
  const inputs: Record<string, FieldValue> = { ...values.inputs }
  const target = app.inputs.find((input) => {
    if (placement.input !== undefined && input.name !== placement.input) {
      return false
    }
    const current = inputs[input.name]
    const list = Array.isArray(current) ? current : []
    const takes =
      placement.kind === "character"
        ? input.type === "character"
        : isAssetInput(input) &&
          input.type === placement.kind &&
          !isChainFilled(input)
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
  const input = promptInputOf(app)
  if (input === null || prompt === "") {
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

/** Places a character in an app with no character input as its first photo, in the input that takes it, such as Motion's photo. */
async function placedForApp(
  client: QueryClient,
  app: AppListing,
  placement: Placement | null
): Promise<Placement | null> {
  const photo = characterPhotoInputOf(app)
  const takesCharacter = app.inputs.some((input) => input.type === "character")
  if (placement?.kind !== "character" || photo === null || takesCharacter) {
    return placement
  }
  const found = await client
    .fetchQuery(characterQuery(placement.id))
    .catch(() => null)
  const [first] = found?.character.references ?? []
  return first === undefined
    ? null
    : { kind: "image", id: first, input: photo.name }
}

export async function placeAll(
  client: QueryClient,
  app: AppListing,
  values: FormValues,
  ids: readonly string[]
): Promise<FormValues> {
  const placements = await Promise.all(
    ids.map(async (id) =>
      placedForApp(client, app, await placementOf(client, id))
    )
  )
  return placements.reduce(
    (current, placement) =>
      placement === null ? current : withPlaced(app, current, placement),
    values
  )
}

const modelInput = "model"

export function withInputs(
  app: AppListing,
  values: FormValues,
  given: Run["inputs"],
  aspectRatio: string | null = null
): FormValues {
  const model = given[modelInput]
  const isHosted = typeof model === "string" && isHostedModelId(model)
  const names = new Set(app.inputs.map((input) => input.name))
  const inputs: Record<string, FieldValue> = { ...values.inputs }
  for (const [name, value] of Object.entries(given)) {
    if (isHosted || names.has(name)) {
      inputs[name] = Array.isArray(value) ? [...value] : value
    }
  }
  return {
    ...values,
    inputs,
    aspectRatio: aspectRatio ?? values.aspectRatio,
  }
}

export type UploadFile = (file: Blob) => Promise<Asset>

const uploadQuietly: UploadFile = (file) =>
  uploadAsset({ file, onProgress: () => undefined })

type ExampleInput = NonNullable<Draft["input"]>

export async function withExampleInput(
  client: QueryClient,
  app: AppListing,
  values: FormValues,
  input: ExampleInput,
  upload: UploadFile = uploadQuietly
): Promise<FormValues> {
  const target = app.inputs.find((one) => one.name === input.name)
  if (target === undefined || !isAssetInput(target)) {
    return values
  }
  try {
    const response = await fetch(input.src)
    if (!response.ok) {
      return values
    }
    const asset = await upload(await response.blob())
    client.setQueryData(assetQuery(asset.id).queryKey, { asset })
    return { ...values, inputs: { ...values.inputs, [input.name]: [asset.id] } }
  } catch {
    return values
  }
}

export async function fillFromDraft(
  client: QueryClient,
  app: AppListing,
  values: FormValues,
  draft: Draft,
  upload: UploadFile = uploadQuietly
): Promise<FormValues> {
  const given =
    draft.inputs === undefined
      ? values
      : withInputs(app, values, draft.inputs, draft.aspectRatio ?? null)
  const prompted = withPrompt(app, given, draft.prompt)
  const exampled =
    draft.input === undefined
      ? prompted
      : await withExampleInput(client, app, prompted, draft.input, upload)
  const placed = await placeAll(client, app, exampled, draft.assetIds)
  return draft.characterIds.reduce(
    (current, id) => withPlaced(app, current, { kind: "character", id }),
    placed
  )
}

export async function fillFromShare(
  client: QueryClient,
  app: AppListing,
  shareId: string
): Promise<FormValues | null> {
  try {
    const share = await client.fetchQuery(shareQuery(shareId))
    return share.run.appId === app.id ? valuesFromRun(app, share.run) : null
  } catch {
    return null
  }
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
