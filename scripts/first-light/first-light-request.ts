import type { Workflow } from "../../packages/catalog/src/workflow-registry"
import { apiGraph } from "../../packages/catalog/src/workflow-registry"
import type { RunInputs } from "../../packages/contract/src/index"
import {
  type ComfyValueBinding,
  comfyWorkflow,
} from "../../packages/generation/src/bindings"
import type {
  EngineFile,
  EngineRequest,
} from "../../packages/generation/src/index"
import { assetIdFormat } from "../../packages/kernel/src/index"

export type SampleFile = { mime: string; bytes: Uint8Array }

export type Samples = Partial<Record<"image" | "video" | "audio", SampleFile>>

export type RequestOptions = {
  workflow: Workflow
  samples: Samples
  sampleText: string
  values: Readonly<Record<string, string | number>>
  idempotencyKey: string
  timeoutSeconds: number
  newId?: () => string
}

export type RequestPlan =
  | { ok: true; request: EngineRequest }
  | { ok: false; missing: ("image" | "video" | "audio")[] }

const assetKinds: Readonly<Record<string, "image" | "video" | "audio">> = {
  LoadImage: "image",
  LoadImageMask: "image",
  LoadVideo: "video",
  LoadAudio: "audio",
}

export const sampleText =
  "A red bicycle leans against a white wall in soft morning light."

type Bound = {
  bindings: ComfyValueBinding[]
  inputs: RunInputs
  files: EngineFile[]
  missing: ("image" | "video" | "audio")[]
}

function bindInputs(options: RequestOptions): Bound {
  const graph = apiGraph.parse(options.workflow.graph)
  const newId = options.newId ?? (() => crypto.randomUUID())
  const bound: Bound = { bindings: [], inputs: {}, files: [], missing: [] }
  for (const [name, target] of Object.entries(options.workflow.inputs)) {
    const node = graph[target.nodeId]
    const path = [...target.path]
    if (target.type === "cloud-asset") {
      const kind = assetKinds[node?.class_type ?? ""] ?? "image"
      const sample = options.samples[kind]
      if (sample === undefined) {
        bound.missing.push(kind)
        continue
      }
      const assetId = assetIdFormat.parse(newId())
      bound.files.push({
        assetId,
        kind,
        mime: sample.mime,
        bytes: sample.bytes,
      })
      bound.inputs[name] = [assetId]
      bound.bindings.push({ from: "input", name, index: 0, path })
      continue
    }
    const current = node?.inputs[target.inputName]
    const value =
      options.values[name] ?? (current === "" ? options.sampleText : undefined)
    if (value !== undefined) {
      bound.inputs[name] = value
      bound.bindings.push({ from: "input", name, path })
    }
  }
  return bound
}

export function planRequest(options: RequestOptions): RequestPlan {
  const { workflow } = options
  const bound = bindInputs(options)
  if (bound.missing.length > 0) {
    return { ok: false, missing: [...new Set(bound.missing)] }
  }
  return {
    ok: true,
    request: {
      idempotencyKey: options.idempotencyKey,
      binding: comfyWorkflow({
        workflow: apiGraph.parse(workflow.graph),
        bindings: bound.bindings,
        models: [...workflow.models],
      }),
      inputs: bound.inputs,
      files: bound.files,
      count: 1,
      aspectRatio: null,
      seed: null,
      outputKind: workflow.mediaType,
      timeoutSeconds: options.timeoutSeconds,
    },
  }
}
