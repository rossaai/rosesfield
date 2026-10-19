import type { AssetId, CharacterId, RunId } from "@rosesfield/kernel"
import type { EngineFile, EngineOutput } from "#domain/generation-engine.port"

export type RunOutput = EngineOutput & { runId: RunId }

export abstract class RunAssets {
  /** Reads an asset a run takes as an input, with its bytes. */
  abstract read(assetId: AssetId): Promise<EngineFile>

  /** Lists the reference assets of a character a run takes. */
  abstract referencesOf(characterId: CharacterId): Promise<readonly AssetId[]>

  /** Keeps one output of a run as an asset and returns its id. */
  abstract keep(output: RunOutput): Promise<AssetId>
}
