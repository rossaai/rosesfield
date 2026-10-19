import { ComfyLow } from "@comfyorg/sdk/low"
import { z } from "zod"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import type { EngineFile } from "#domain/generation-engine.port"
import { callComfy } from "#infrastructure/comfy/comfy-errors"
import { extensionOf } from "#infrastructure/comfy/comfy-media"

export type Fetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

type CreateComfyLowOptions = {
  baseUrl: string
  apiKey: string | null
  fetch: Fetch
  timeoutMs: number
}

const uploadedAsset = z.object({ id: z.string().min(1) })

export function createComfyLow(options: CreateComfyLowOptions): ComfyLow {
  const send = options.fetch
  const bound = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => send(input, init),
    { preconnect: () => undefined }
  )
  return new ComfyLow(options.baseUrl, options.apiKey ?? undefined, {
    fetch: bound,
    timeoutMs: options.timeoutMs,
  })
}

export async function uploadComfyInputs(
  low: ComfyLow,
  files: readonly EngineFile[]
): Promise<Map<string, string>> {
  const uploaded = await Promise.all(
    files.map(async (file) => {
      const asset = await callComfy(() =>
        low.postAssets(
          new Blob([new Uint8Array(file.bytes)], { type: file.mime }),
          file.mime,
          `${file.assetId}.${extensionOf(file.mime)}`
        )
      )
      const parsed = uploadedAsset.safeParse(asset)
      if (!parsed.success) {
        throw new EngineUnavailableError({ cause: parsed.error })
      }
      const pair: [string, string] = [file.assetId, parsed.data.id]
      return pair
    })
  )
  return new Map(uploaded)
}
