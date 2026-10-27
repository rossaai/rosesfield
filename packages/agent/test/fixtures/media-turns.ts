import type { Asset } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { agentTools } from "#infrastructure/pi-agent-tools"
import type { ImagesOf } from "#infrastructure/pi-asset-media"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeAssetStore } from "../fake/fake-asset-store"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  type AgentRig,
  agentFor,
  generationFor,
  type Library,
  noWait,
  readAll,
  toolHandlersFor,
} from "../harness"
import { imageApp, start } from "../sample"
import {
  type RouterAnswer,
  type RouterRequest,
  replayRouter,
  textAnswer,
} from "./router-chat-answers"

export const comfyKey = "comfyui-rosesfield-media-test"
export const imageModel = "anthropic/claude-opus-5.5"
export const mediaModel = "google/gemini-4-argon"
export const textModel = "z-ai/glm-5.3"

export const rigs: AgentRig[] = []

export async function closeRigs(): Promise<void> {
  for (const rig of rigs.splice(0)) {
    await rig.close()
  }
}

let serial = 0

function idOf(): string {
  serial += 1
  return `0b8f3c2e-5a4d-4c1b-9e7f-${serial.toString(16).padStart(12, "0")}`
}

type Stored = {
  library: Library & { store: FakeAssetStore }
  add: (fields: Partial<Asset>, bytes: Uint8Array) => Promise<Asset>
}

export function storedLibrary(): Stored {
  const library = {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
    store: new FakeAssetStore(),
  }
  return {
    library,
    add: async (fields, bytes) => {
      const asset: Asset = {
        id: assetIdFormat.parse(idOf()),
        kind: "image",
        mime: "image/png",
        bytes: bytes.length,
        width: null,
        height: null,
        durationSeconds: null,
        sourceRunId: null,
        createdAt: start.toISOString(),
        ...fields,
      }
      await library.assets.add(asset)
      await library.store.put(asset.id, bytes, asset.mime)
      return asset
    },
  }
}

export function readCalls(
  model: string,
  assetIds: readonly string[]
): RouterAnswer {
  return {
    status: 200,
    body: {
      id: "gen-1760000000-media",
      object: "chat.completion",
      created: 1_760_000_000,
      model,
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: assetIds.map((assetId, index) => ({
              id: `call_read_${index}`,
              type: "function",
              function: {
                name: "read_asset",
                arguments: JSON.stringify({ assetId }),
              },
            })),
          },
        },
      ],
      usage: { prompt_tokens: 900, completion_tokens: 20, cost: 0.0001 },
    },
  }
}

type Turn = {
  requests: RouterRequest[]
}

type TurnOptions = {
  model: string
  library: Library
  reads: readonly (readonly string[])[]
  images?: ImagesOf
}

export async function turnsWith(options: TurnOptions): Promise<Turn> {
  const generation = generationFor([imageApp()])
  const handlers = toolHandlersFor(generation, options.library)
  const answers = options.reads.flatMap((ids) => [
    ...(ids.length === 0 ? [] : [readCalls(options.model, ids)]),
    textAnswer(options.model, "Seen.", 0.0001),
  ])
  const replay = replayRouter(answers)
  const rig = agentFor(
    agentTools({
      apps: [imageApp()],
      handlers: () => handlers,
      wait: noWait,
      ...(options.images === undefined ? {} : { images: options.images }),
    }),
    () =>
      openPiModels(routerAgentModel(comfyKey), {
        fetch: replay.fetch,
        media: () => handlers,
      })
  )
  rigs.push(rig)
  await rig.agent.chooseModel(options.model)
  const { id } = await rig.agent.startConversation({ runApproval: "ask" })
  for (const _ids of options.reads) {
    await readAll(await rig.agent.send({ conversationId: id, text: "Look" }))
  }
  return { requests: replay.requests }
}

type Sent = {
  role: string
  content: unknown
}

export function messagesOf(request: RouterRequest | undefined): Sent[] {
  const messages = request?.body.messages
  return Array.isArray(messages) ? messages : []
}

export function partsOf(
  request: RouterRequest | undefined,
  type: string
): unknown[] {
  return messagesOf(request).flatMap((message) =>
    Array.isArray(message.content)
      ? message.content.filter((part: { type?: unknown }) => part.type === type)
      : []
  )
}

export function toolTextOf(request: RouterRequest | undefined): string {
  return messagesOf(request)
    .filter((message) => message.role === "tool")
    .map((message) => String(message.content))
    .join("\n")
}

export function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
}
