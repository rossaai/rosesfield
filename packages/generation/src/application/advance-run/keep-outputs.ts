import type { AppDefinition } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { isBlankOutput } from "#application/advance-run/blank-output"
import { RunOutputBlankError } from "#domain/error/run-output-blank.error"
import type { EngineOutput } from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunAssets } from "#domain/run-assets.port"

export type KeptOutputs = {
  outputs: AssetId[]
  dropped: number
  whenEmpty: RunOutputBlankError
}

export async function keepOutputs(
  run: Run,
  app: AppDefinition,
  outputs: readonly EngineOutput[],
  assets: RunAssets
): Promise<KeptOutputs | null> {
  const ofKind = outputs.filter((output) => output.kind === app.output.kind)
  if (ofKind.length === 0) {
    return null
  }
  const blank = await Promise.all(ofKind.map(isBlankOutput))
  const good = ofKind.filter((_, index) => blank[index] !== true)
  const dropped = ofKind.length - good.length
  return {
    outputs: await Promise.all(
      good.map(({ stills: _stills, ...output }) =>
        assets.keep({ ...output, runId: run.id })
      )
    ),
    dropped,
    whenEmpty: new RunOutputBlankError({ dropped }),
  }
}
