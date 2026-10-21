import type { AppDefinition, InputValue, RunInputs } from "@rosesfield/contract"
import {
  type AssetId,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { appOnlyNamesOf } from "#domain/app-only-inputs"
import type { EngineRequest } from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunAssets } from "#domain/run-assets.port"
import { resolveBinding } from "#domain/select-binding"
import { chosenModelOf, isHostedModelId } from "#domain/task-binding"

export async function runRequestOf(
  run: Run,
  app: AppDefinition,
  assets: RunAssets
): Promise<EngineRequest> {
  const record = run.toRecord()
  const sent = sentInputsOf(app, record.inputs)
  const inputs: Record<string, InputValue> = { ...sent }
  const assetIds: AssetId[] = []
  for (const [name, value] of Object.entries(sent)) {
    if (!Array.isArray(value)) {
      continue
    }
    const definition = app.inputs.find((one) => one.name === name)
    if (definition?.type === "character") {
      const references = await referencesOf(value, assets)
      inputs[name] = references
      assetIds.push(...references)
    } else {
      assetIds.push(...value.map((id) => assetIdFormat.parse(id)))
    }
  }
  const unique = [...new Set(assetIds)]
  return {
    idempotencyKey: run.id,
    binding: resolveBinding(app.engine, inputs),
    inputs,
    files: await Promise.all(unique.map((id) => assets.read(id))),
    count: record.count,
    aspectRatio: record.aspectRatio,
    seed: record.seed,
    outputKind: app.output.kind,
    timeoutSeconds: app.limits.timeoutSeconds,
  }
}

async function referencesOf(
  ids: readonly string[],
  assets: RunAssets
): Promise<AssetId[]> {
  const lists = await Promise.all(
    ids.map((id) => assets.referencesOf(characterIdFormat.parse(id)))
  )
  return lists.flat()
}

function sentInputsOf(app: AppDefinition, inputs: RunInputs): RunInputs {
  const model = chosenModelOf(app.engine, inputs)
  if (model === null || !isHostedModelId(model)) {
    return inputs
  }
  const names = appOnlyNamesOf(app)
  return Object.fromEntries(
    Object.entries(inputs).filter(([name]) => !names.has(name))
  )
}
