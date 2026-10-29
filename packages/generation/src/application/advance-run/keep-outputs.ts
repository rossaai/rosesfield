import type { AppDefinition, HeldOutput } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { isBlankOutput } from "#application/advance-run/blank-output"
import { RunOutputBlankError } from "#domain/error/run-output-blank.error"
import type { EngineOutput } from "#domain/generation-engine.port"
import type { Run } from "#domain/run"
import type { RunAssets } from "#domain/run-assets.port"

export type KeptOutputs = {
  outputs: AssetId[]
  held: HeldOutput[]
  dropped: number
  whenEmpty?: RunOutputBlankError
}

type Named = EngineOutput & { nodeId: string }

type Split = {
  results: EngineOutput[]
  held: Named[]
}

function isHeld(
  output: EngineOutput,
  results: readonly string[] | null
): boolean {
  if (results === null) {
    return false
  }
  return results.length === 0
    ? true
    : output.nodeId !== undefined && !results.includes(output.nodeId)
}

function splitOf(
  outputs: readonly EngineOutput[],
  results: readonly string[] | null
): Split {
  return {
    results: outputs.filter((output) => !isHeld(output, results)),
    held: outputs.flatMap((output, at) =>
      isHeld(output, results)
        ? [{ ...output, nodeId: output.nodeId ?? String(at) }]
        : []
    ),
  }
}

async function unblank<Output extends EngineOutput>(
  outputs: readonly Output[]
): Promise<Output[]> {
  const blank = await Promise.all(outputs.map(isBlankOutput))
  return outputs.filter((_, index) => blank[index] !== true)
}

/** Keeps a run's result outputs in the library, and holds every other output out of it: each output of a node the binding does not name as a result, and every output when the results name no node. An output with no node is held under its position. */
export async function keepOutputs(
  run: Run,
  app: AppDefinition,
  outputs: readonly EngineOutput[],
  assets: RunAssets,
  results: readonly string[] | null = null
): Promise<KeptOutputs | null> {
  const split = splitOf(outputs, results)
  const ofKind = split.results.filter(
    (output) => output.kind === app.output.kind
  )
  if (ofKind.length === 0 && split.held.length === 0) {
    return null
  }
  const [good, held] = await Promise.all([unblank(ofKind), unblank(split.held)])
  const dropped = ofKind.length - good.length
  const keep = (
    { stills: _stills, nodeId: _nodeId, ...output }: EngineOutput,
    place: "library" | "held"
  ): Promise<AssetId> => assets.keep({ ...output, runId: run.id, place })
  const [kept, keptHeld] = await Promise.all([
    Promise.all(good.map((output) => keep(output, "library"))),
    Promise.all(
      held.map(
        async (output): Promise<HeldOutput> => ({
          nodeId: output.nodeId,
          assetId: await keep(output, "held"),
          kind: output.kind,
        })
      )
    ),
  ])
  const expectsResult = results === null || results.length > 0
  return {
    outputs: kept,
    held: keptHeld,
    dropped,
    ...(expectsResult
      ? { whenEmpty: new RunOutputBlankError({ dropped }) }
      : {}),
  }
}
