import {
  effectsAppId,
  type PresetGuide,
  presetOf,
} from "@rosesfield/catalog/effects"
import {
  StartRunHandler,
  type StartRunInput,
  type StartRunOutput,
} from "@rosesfield/generation"
import type {
  ListAssetsHandler,
  ReadAssetContentHandler,
  UploadAssetHandler,
} from "@rosesfield/library"
import type { GuideFiles } from "#effect-guides/guide-files"
import { GuideUnreadableError } from "#effect-guides/guide-unreadable.error"

export type GuideLibrary = {
  listAssets: ListAssetsHandler
  readAssetContent: ReadAssetContentHandler
  uploadAsset: UploadAssetHandler
}

type GuidedStartRunOptions = ConstructorParameters<
  typeof StartRunHandler
>[0] & {
  guides: GuideFiles
  library: GuideLibrary
}

type Body = Record<string, unknown>

const guideMime = "video/mp4"

function isBody(value: unknown): value is Body {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function sha256Of(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes))
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

export class GuidedStartRunHandler extends StartRunHandler {
  private readonly guides: GuideFiles
  private readonly library: GuideLibrary

  constructor(options: GuidedStartRunOptions) {
    const { guides, library, ...start } = options
    super(start)
    this.guides = guides
    this.library = library
  }

  override async execute(input: StartRunInput): Promise<StartRunOutput> {
    return super.execute(await this.withGuide(input))
  }

  private async withGuide(input: StartRunInput): Promise<StartRunInput> {
    if (input.appId !== effectsAppId || !isBody(input.body)) {
      return input
    }
    const inputs = isBody(input.body.inputs) ? input.body.inputs : {}
    const preset =
      typeof inputs.effect === "string" ? presetOf(inputs.effect) : null
    if (preset === null || preset.kind !== "photo") {
      return input
    }
    const guide = await this.guideAssetOf(preset.guide)
    return {
      ...input,
      body: { ...input.body, inputs: { ...inputs, guide: [guide] } },
    }
  }

  private async guideAssetOf(guide: PresetGuide): Promise<string> {
    const kept = await this.keptGuideOf(guide)
    if (kept !== null) {
      return kept
    }
    const bytes = await this.guides.read(guide.file)
    if (bytes === null) {
      throw new GuideUnreadableError({
        file: guide.file,
        reason: "is not served",
      })
    }
    if ((await sha256Of(bytes)) !== guide.sha256) {
      throw new GuideUnreadableError({
        file: guide.file,
        reason: "does not match its recorded sha256",
      })
    }
    const { asset } = await this.library.uploadAsset.execute({
      bytes,
      mime: guideMime,
      sourceRunId: null,
      width: guide.width,
      height: guide.height,
      durationSeconds: guide.frames / guide.fps,
    })
    return asset.id
  }

  private async keptGuideOf(guide: PresetGuide): Promise<string | null> {
    const { assets } = await this.library.listAssets.execute({
      kind: "video",
      cursor: null,
    })
    const candidates = assets.filter(
      (asset) =>
        asset.bytes === guide.bytes &&
        asset.mime === guideMime &&
        asset.sourceRunId === null
    )
    for (const asset of candidates) {
      const { bytes } = await this.library.readAssetContent.execute({
        assetId: asset.id,
      })
      if ((await sha256Of(bytes)) === guide.sha256) {
        return asset.id
      }
    }
    return null
  }
}
