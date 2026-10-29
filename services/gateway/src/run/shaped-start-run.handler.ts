import { firstFrameOf, motionAppId } from "@rosesfield/catalog/motion"
import { runInputs } from "@rosesfield/contract"
import {
  type AppCatalog,
  imageSizeOf,
  type RunAssets,
  StartRunHandler,
  type StartRunInput,
  type StartRunOutput,
} from "@rosesfield/generation"
import { AspectRatio, assetIdFormat } from "@rosesfield/kernel"

type ShapedStartRunHandlerOptions = ConstructorParameters<
  typeof StartRunHandler
>[0] & {
  apps: AppCatalog
  assets: RunAssets
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export class ShapedStartRunHandler extends StartRunHandler {
  private readonly shapeApps: AppCatalog
  private readonly shapeAssets: RunAssets

  constructor(options: ShapedStartRunHandlerOptions) {
    super(options)
    this.shapeApps = options.apps
    this.shapeAssets = options.assets
  }

  override async execute(input: StartRunInput): Promise<StartRunOutput> {
    const shape = await this.shapeOf(input)
    return super.execute(
      shape === null
        ? input
        : { ...input, body: { ...this.bodyOf(input), aspectRatio: shape } }
    )
  }

  private bodyOf(input: StartRunInput): Record<string, unknown> {
    return isRecord(input.body) ? input.body : {}
  }

  private async shapeOf(input: StartRunInput): Promise<string | null> {
    const app = this.shapeApps.find(input.appId)
    const body = this.bodyOf(input)
    const takesInputShape =
      app?.output.kind === "video" && app.output.aspectRatios === null
    if (!takesInputShape || app.id !== motionAppId || isGiven(body)) {
      return null
    }
    const inputs = runInputs.safeParse(body.inputs)
    const frame = inputs.success ? firstFrameOf(inputs.data) : null
    if (frame === null) {
      return null
    }
    return frame.from === "shape"
      ? frame.aspectRatio
      : await this.assetShapeOf(frame.assetId)
  }

  private async assetShapeOf(assetId: string): Promise<string | null> {
    if (!assetIdFormat.is(assetId)) {
      return null
    }
    const file = await this.shapeAssets.read(assetId).catch(() => null)
    const size = file === null ? null : imageSizeOf(file.bytes)
    return size === null
      ? null
      : (AspectRatio.ofSize(size.width, size.height)?.toString() ?? null)
  }
}

function isGiven(body: Record<string, unknown>): boolean {
  return typeof body.aspectRatio === "string"
}
