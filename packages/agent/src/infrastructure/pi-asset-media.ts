import type { ImageContent, TextContent } from "@earendil-works/pi-ai"
import type { ToolRegistration } from "@earendil-works/pi-durable"
import type {
  ImageLimits,
  ImageProcessor,
} from "@earendil-works/pi-durable/tools"
import { type Asset, routes } from "@rosesfield/contract"
import type { GetRunHandler } from "@rosesfield/generation"
import { NotFoundError } from "@rosesfield/kernel"
import type {
  GetAssetHandler,
  ReadAssetContentHandler,
  ReadAssetPreviewHandler,
} from "@rosesfield/library"
import { agentCopy } from "#copy.en"
import { toolParameters } from "#infrastructure/pi-tool-io"
import {
  base64LengthOf,
  base64Of,
  isInlineImage,
  mediaMarkOf,
  mediaPlanOf,
  planNoteOf,
  readFirstBytes,
  routerMedia,
  unseenNoteOf,
  withinTime,
} from "#infrastructure/router-chat-media"
import { routerChatModelOf } from "#infrastructure/router-chat-models"

export type AssetReadHandlers = {
  getAsset: GetAssetHandler
  getRun: GetRunHandler
  readAssetContent: ReadAssetContentHandler
  readAssetPreview: ReadAssetPreviewHandler
}

/** Opens the image processor that scales an image to the bound, on the runtimes that run one. */
export type ImagesOf = () => Promise<ImageProcessor>

type Seen = {
  note: string | null
  parts: (TextContent | ImageContent)[]
}

type ReadAssetToolOptions = {
  handlersOf: () => AssetReadHandlers
  images?: ImagesOf
}

const imageLimits: ImageLimits = {
  maxWidth: routerMedia.image.side,
  maxHeight: routerMedia.image.side,
  maxBytes: routerMedia.image.base64Bytes,
}

function noted(note: string): Seen {
  return { note, parts: [] }
}

function imageOf(data: string, mimeType: string): ImageContent {
  return { type: "image", data, mimeType }
}

function fitsAsIs(asset: Asset): boolean {
  const { side, base64Bytes } = routerMedia.image
  return (
    isInlineImage(asset.mime) &&
    asset.width !== null &&
    asset.height !== null &&
    asset.width <= side &&
    asset.height <= side &&
    base64LengthOf(asset.bytes) <= base64Bytes
  )
}

async function scaledOf(
  asset: Asset,
  handlers: AssetReadHandlers,
  images: ImagesOf | undefined
): Promise<ImageContent | null> {
  const { readBytes } = routerMedia.image
  if (fitsAsIs(asset)) {
    const bytes = await readFirstBytes(
      handlers.readAssetContent,
      asset.id,
      asset.bytes
    )
    return bytes === null ? null : imageOf(base64Of(bytes), asset.mime)
  }
  if (images === undefined || asset.bytes > readBytes) {
    return null
  }
  const bytes = await readFirstBytes(
    handlers.readAssetContent,
    asset.id,
    asset.bytes
  )
  if (bytes === null || bytes.length !== asset.bytes) {
    return null
  }
  const prepared = await withinTime(
    images().then((processor) =>
      processor.prepare(bytes, asset.mime, imageLimits)
    ),
    routerMedia.readTimeoutMs
  ).catch(() => null)
  return prepared === null || prepared === undefined
    ? null
    : imageOf(prepared.data, prepared.mimeType)
}

async function previewOf(
  asset: Asset,
  handlers: AssetReadHandlers
): Promise<ImageContent | null> {
  const read = handlers.readAssetPreview
    .execute({ assetId: asset.id })
    .catch(() => null)
  const preview = await withinTime(read, routerMedia.readTimeoutMs)
  return preview === null
    ? null
    : imageOf(base64Of(preview.bytes), preview.mime)
}

async function seenImageOf(
  asset: Asset,
  handlers: AssetReadHandlers,
  images: ImagesOf | undefined
): Promise<Seen> {
  const scaled = await scaledOf(asset, handlers, images)
  if (scaled !== null) {
    return { note: null, parts: [scaled] }
  }
  const preview = await previewOf(asset, handlers)
  return preview === null
    ? noted(agentCopy.media.imageUnfit)
    : { note: agentCopy.media.preview, parts: [preview] }
}

function markedOf(asset: Asset): Seen {
  const plan = mediaPlanOf(asset)
  const note = planNoteOf(asset, plan)
  return plan.send === "none"
    ? noted(note ?? agentCopy.media.unread)
    : {
        note,
        parts: [{ type: "text", text: mediaMarkOf(asset.id) }],
      }
}

async function seenOf(
  asset: Asset,
  inputs: ReadonlySet<string>,
  handlers: AssetReadHandlers,
  images: ImagesOf | undefined
): Promise<Seen> {
  if (asset.kind === "text") {
    return { note: null, parts: [] }
  }
  const input = asset.kind === "mesh" ? "image" : asset.kind
  if (!inputs.has(input)) {
    return noted(unseenNoteOf(asset.kind))
  }
  if (asset.kind === "image") {
    return seenImageOf(asset, handlers, images)
  }
  if (asset.kind === "mesh") {
    const still = await previewOf(asset, handlers)
    return still === null
      ? noted(agentCopy.media.noStill)
      : { note: null, parts: [still] }
  }
  return markedOf(asset)
}

async function runOf(getRun: GetRunHandler, runId: string | null) {
  if (runId === null) {
    return null
  }
  try {
    const { run } = await getRun.execute({ runId })
    const { id, appId, status, inputs, engine, createdAt } = run
    return { id, appId, status, inputs, engine, createdAt }
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null
    }
    throw error
  }
}

function inputsOf(modelId: string | undefined): ReadonlySet<string> {
  const found = modelId === undefined ? undefined : routerChatModelOf(modelId)
  return new Set(found?.inputs ?? [])
}

/** `read_asset`: the asset's facts, and the media itself when the conversation's model takes its kind. */
export function readAssetTool(options: ReadAssetToolOptions): ToolRegistration {
  const schema = routes.getAsset.params
  return {
    name: "read_asset",
    description: agentCopy.tools.readAsset,
    parameters: toolParameters(schema),
    replay: "safe",
    execute: async (args: unknown, api, context) => {
      const { assetId } = schema.parse(args)
      const handlers = options.handlersOf()
      const { asset } = await handlers.getAsset.execute({ assetId })
      const agent = await api.agent(context)
      const [run, seen] = await Promise.all([
        runOf(handlers.getRun, asset.sourceRunId),
        seenOf(asset, inputsOf(agent.model?.modelId), handlers, options.images),
      ])
      const facts = {
        asset,
        run,
        ...(seen.note === null ? {} : { note: seen.note }),
      }
      return {
        output: [{ type: "text", text: JSON.stringify(facts) }, ...seen.parts],
      }
    },
  }
}
