import type { ComfyLow } from "@comfyorg/sdk/low"
import { assetIdFormat } from "@rosesfield/kernel"
import { RunFailedError } from "#domain/error/run-failed.error"
import type {
  EngineFile,
  EngineFiles,
  EngineRequest,
} from "#domain/generation-engine.port"
import { uploadComfyInputs } from "#infrastructure/comfy/comfy-low"
import type { ComfyWorkflowConfig } from "#infrastructure/comfy/comfy-workflow-binding"

type Held = ReadonlyMap<string, EngineFile>

export function comfyAssetOf(
  uploaded: ReadonlyMap<string, string>
): (assetId: string) => unknown {
  return (assetId) => {
    const id = uploaded.get(assetId)
    if (id === undefined) {
      throw new RunFailedError({ cause: assetId })
    }
    return { __type: "core/ASSET", info: { id } }
  }
}

export function heldValueOf(
  held: Held,
  assetOf: (assetId: string) => unknown
): (name: string) => unknown {
  return (name) => {
    const file = held.get(name)
    return file === undefined ? undefined : assetOf(file.assetId)
  }
}

export async function heldFilesOf(
  files: EngineFiles | null,
  bindings: ComfyWorkflowConfig["bindings"]
): Promise<Held> {
  const names = [
    ...new Set(
      bindings.flatMap((binding) =>
        binding.from === "file" ? [binding.name] : []
      )
    ),
  ]
  const read = await Promise.all(
    names.map(async (name): Promise<[string, EngineFile]> => {
      const file = (await files?.read(name)) ?? null
      if (file === null) {
        throw new RunFailedError({ cause: `no held file ${name}` })
      }
      return [
        name,
        {
          assetId: assetIdFormat.parse(crypto.randomUUID()),
          kind: file.mime.startsWith("image/") ? "image" : "video",
          mime: file.mime,
          bytes: file.bytes,
        },
      ]
    })
  )
  return new Map(read)
}

type BoundValues = {
  assetValue: (assetId: string) => unknown
  fileValue: (name: string) => unknown
}

export async function uploadedValuesOf(
  low: ComfyLow,
  files: EngineFiles | null,
  request: EngineRequest,
  config: ComfyWorkflowConfig
): Promise<BoundValues> {
  const held = await heldFilesOf(files, config.bindings)
  const uploaded = await uploadComfyInputs(low, [
    ...request.files,
    ...held.values(),
  ])
  const assetValue = comfyAssetOf(uploaded)
  return { assetValue, fileValue: heldValueOf(held, assetValue) }
}
