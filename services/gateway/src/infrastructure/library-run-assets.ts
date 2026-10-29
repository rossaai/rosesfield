import {
  type EngineFile,
  RunAssets,
  type RunOutput,
} from "@rosesfield/generation"
import {
  type AssetId,
  assetIdFormat,
  type CharacterId,
} from "@rosesfield/kernel"
import type {
  GetCharacterHandler,
  PutAssetPreviewHandler,
  ReadAssetContentHandler,
  UploadAssetHandler,
} from "@rosesfield/library"

type LibraryRunAssetsOptions = {
  readContent: ReadAssetContentHandler
  getCharacter: GetCharacterHandler
  upload: UploadAssetHandler
  putPreview: PutAssetPreviewHandler
}

export class LibraryRunAssets extends RunAssets {
  private readonly readContent: ReadAssetContentHandler
  private readonly getCharacter: GetCharacterHandler
  private readonly upload: UploadAssetHandler
  private readonly putPreview: PutAssetPreviewHandler

  constructor(options: LibraryRunAssetsOptions) {
    super()
    this.readContent = options.readContent
    this.getCharacter = options.getCharacter
    this.upload = options.upload
    this.putPreview = options.putPreview
  }

  override async read(assetId: AssetId): Promise<EngineFile> {
    const { asset, bytes } = await this.readContent.execute({ assetId })
    return { assetId, kind: asset.kind, mime: asset.mime, bytes }
  }

  override async referencesOf(
    characterId: CharacterId
  ): Promise<readonly AssetId[]> {
    const { character } = await this.getCharacter.execute({ characterId })
    return character.references.map((id) => assetIdFormat.parse(id))
  }

  override async keep(output: RunOutput): Promise<AssetId> {
    const { asset } = await this.upload.execute({
      bytes: output.bytes,
      mime: output.mime,
      sourceRunId: output.runId,
      width: output.width,
      height: output.height,
      durationSeconds: output.durationSeconds,
      place: output.place,
    })
    const { preview } = output
    if (preview !== undefined) {
      await this.putPreview
        .execute({ assetId: asset.id, ...preview })
        .catch(() => undefined)
    }
    return assetIdFormat.parse(asset.id)
  }
}
