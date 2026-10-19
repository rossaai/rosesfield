import type { AppDefinition } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import type { EngineOutput } from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunAssets } from "#domain/run-assets.port"

export async function keepOutputs(
  run: Run,
  app: AppDefinition,
  outputs: readonly EngineOutput[],
  assets: RunAssets
): Promise<AssetId[] | null> {
  const kept = outputs.filter((output) => output.kind === app.output.kind)
  if (kept.length === 0) {
    return null
  }
  return Promise.all(
    kept.map((output) => assets.keep({ ...output, runId: run.id }))
  )
}
