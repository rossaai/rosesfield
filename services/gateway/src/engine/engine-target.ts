import { ComfyGenerationEngine } from "@rosesfield/generation"
import { z } from "zod"
import { EnvInvalidError } from "#error/env-invalid.error"

export const engineTarget = z.enum([
  "comfy-cloud",
  "comfy-deployment",
  "comfyui",
  "runpod-pod",
  "modal",
  "runpod-serverless",
  "demo",
])

export type EngineTarget = z.infer<typeof engineTarget>

export type ComfyTarget = Exclude<EngineTarget, "runpod-serverless" | "demo">

export type EngineSettings =
  | { target: "demo" }
  | { target: ComfyTarget; baseUrl: string; apiKey: string | null }
  | { target: "runpod-serverless"; endpointId: string; apiKey: string | null }

export type TargetSetting =
  | "COMFY_API_KEY"
  | "COMFY_BASE_URL"
  | "RUNPOD_API_KEY"
  | "RUNPOD_ENDPOINT_ID"

export const engineTargets: Record<EngineTarget, readonly TargetSetting[]> = {
  "comfy-cloud": ["COMFY_API_KEY"],
  "comfy-deployment": ["COMFY_BASE_URL", "COMFY_API_KEY"],
  comfyui: ["COMFY_BASE_URL"],
  "runpod-pod": ["COMFY_BASE_URL", "COMFY_API_KEY"],
  modal: ["COMFY_BASE_URL", "COMFY_API_KEY"],
  "runpod-serverless": ["RUNPOD_ENDPOINT_ID", "RUNPOD_API_KEY"],
  demo: [],
}

export const comfyCloudUrl = ComfyGenerationEngine.cloudUrl

const hostSuffixes: readonly { suffix: string; target: ComfyTarget }[] = [
  { suffix: ".run.comfy.app", target: "comfy-deployment" },
  { suffix: ".proxy.runpod.net", target: "runpod-pod" },
  { suffix: ".modal.run", target: "modal" },
  { suffix: ".modal.direct", target: "modal" },
]

export function comfyTargetOf(baseUrl: string): ComfyTarget {
  const { hostname } = new URL(baseUrl)
  if (hostname === new URL(comfyCloudUrl).hostname) {
    return "comfy-cloud"
  }
  const found = hostSuffixes.find(({ suffix }) => hostname.endsWith(suffix))
  return found?.target ?? "comfyui"
}

export function engineAddressOf(engine: EngineSettings): string | null {
  switch (engine.target) {
    case "demo":
      return null
    case "runpod-serverless":
      return `https://api.runpod.ai/v2/${engine.endpointId}`
    default:
      return new URL(engine.baseUrl).origin
  }
}

export function withEngineKey(
  engine: EngineSettings,
  apiKey: string | null
): EngineSettings {
  return engine.target === "demo" ? engine : { ...engine, apiKey }
}

export function checkEngineSettings(engine: EngineSettings): void {
  if (engine.target === "runpod-serverless") {
    throw new EnvInvalidError({
      problems: [
        "RUNPOD_ENDPOINT_ID is set, and Rosesfield no longer runs on RunPod Serverless. Run ComfyUI behind comfy-api-proxy in a RunPod pod and set COMFY_BASE_URL to its address.",
      ],
    })
  }
}
