import {
  type AssetId,
  assetIdFormat,
  type CharacterId,
} from "@rosesfield/kernel"
import type { EngineFile } from "#domain/generation-engine.port"
import { RunAssets, type RunOutput } from "#domain/run-assets.port"

export class FakeRunAssets extends RunAssets {
  readonly files = new Map<AssetId, EngineFile>()
  readonly characters = new Map<CharacterId, AssetId[]>()
  readonly kept: RunOutput[] = []

  addFile(file: EngineFile): void {
    this.files.set(file.assetId, file)
  }

  override async read(assetId: AssetId): Promise<EngineFile> {
    const file = this.files.get(assetId)
    if (file === undefined) {
      throw new Error(`No asset ${assetId}`)
    }
    return file
  }

  override async referencesOf(
    characterId: CharacterId
  ): Promise<readonly AssetId[]> {
    return this.characters.get(characterId) ?? []
  }

  override async keep(output: RunOutput): Promise<AssetId> {
    this.kept.push(output)
    return assetIdFormat.parse(crypto.randomUUID())
  }
}
