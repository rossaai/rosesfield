import { comfyCloudUrl, type EngineSettings } from "#engine/engine-target"
import type { ServerEnv } from "#env"

export const demoEngine: EngineSettings = { target: "demo" }

export function comfyCloud(apiKey: string): EngineSettings {
  return { target: "comfy-cloud", baseUrl: comfyCloudUrl, apiKey }
}

export function localEnv(
  dataDir: string,
  engine: EngineSettings = demoEngine
): ServerEnv {
  return {
    engine,
    access: { mode: "owner", lock: { mode: "local" } },
    agent: null,
    host: "127.0.0.1",
    port: 8787,
    dataDir,
  }
}
