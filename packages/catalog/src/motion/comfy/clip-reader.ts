import type { EngineFile, GenerationEngine } from "@rosesfield/generation"
import type { AssetId } from "@rosesfield/kernel"
import { ClipPlanGenerationEngine } from "#motion/comfy/clip-plan-engine"

/** Reads the length of your own video on the server, for the agent and MCP, which hand it over by its id. */
export type ClipReader = {
  secondsOf(clip: AssetId): Promise<number>
}

/** The reader of the server whose plan engine opens a video, or null on a host with no such tool. */
export function clipReaderOf(
  engines: readonly GenerationEngine[],
  readFile: (clip: AssetId) => Promise<EngineFile>
): ClipReader | null {
  const plan = engines.find(
    (engine): engine is ClipPlanGenerationEngine =>
      engine instanceof ClipPlanGenerationEngine && engine.readsClips()
  )
  return plan === undefined
    ? null
    : { secondsOf: async (clip) => plan.clipSecondsOf(await readFile(clip)) }
}
