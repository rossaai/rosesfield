import {
  type Asset,
  asset,
  type Character,
  character,
  type Run,
  run,
} from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import type { GatewaySettings } from "@/api/gateway-settings"
import { assetBlobKey } from "@/api/query-client"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"

export type Seed = (client: QueryClient) => void

const createdAt = "2026-10-17T09:00:00.000Z"
const finishedAt = "2026-10-17T09:00:04.000Z"
const pastWaitMs = 12_000

const ids = {
  imageRun: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  videoRun: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e02",
  upscaleRun: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e03",
  workingRun: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e04",
  failedRun: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e05",
  first: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01",
  second: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f02",
  clip: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f03",
  upload: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f04",
  larger: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f05",
  ana: "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a01",
}

export const missingId = "00000000-0000-4000-8000-000000000000"

function assetOf(
  id: string,
  change: Partial<Record<keyof Asset, unknown>>
): Asset {
  return asset.parse({
    id,
    kind: "image",
    mime: "image/png",
    bytes: 2048,
    width: 1600,
    height: 900,
    durationSeconds: null,
    sourceRunId: null,
    createdAt,
    ...change,
  })
}

function runOf(id: string, change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id,
    appId: "image",
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: "16:9",
    seed: 1234,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt,
    finishedAt,
    ...change,
  })
}

export const screenAssets = {
  first: assetOf(ids.first, { sourceRunId: ids.imageRun }),
  second: assetOf(ids.second, { sourceRunId: ids.imageRun }),
  clip: assetOf(ids.clip, {
    kind: "video",
    mime: "video/mp4",
    durationSeconds: 2,
    sourceRunId: ids.videoRun,
  }),
  upload: assetOf(ids.upload, { width: 1024, height: 1024 }),
  larger: assetOf(ids.larger, {
    width: 2048,
    height: 2048,
    sourceRunId: ids.upscaleRun,
  }),
}

const sources: ReadonlyArray<readonly [string, string]> = [
  [ids.first, demoWide],
  [ids.second, demoWide],
  [ids.clip, demoVideo],
  [ids.upload, demoSquare],
  [ids.larger, demoSquare],
]

export const screenRuns = {
  image: runOf(ids.imageRun, {
    inputs: {
      prompt: "A red bicycle against a white wall",
      model: "z-image-turbo",
      resolution: "1k",
    },
    count: 2,
    outputs: [ids.first, ids.second],
  }),
  video: runOf(ids.videoRun, {
    appId: "video",
    inputs: { prompt: "A paper boat drifts on a pond", length: 2 },
    outputs: [ids.clip],
  }),
  upscale: runOf(ids.upscaleRun, {
    appId: "upscale",
    inputs: { mode: "image", image: [ids.upload], scale: "2x" },
    aspectRatio: "1:1",
    outputs: [ids.larger],
  }),
  working: runOf(ids.workingRun, {
    inputs: { prompt: "A green bicycle against a brick wall" },
    status: "running",
    count: 2,
    progress: 0.4,
    createdAt: new Date(Date.now() - pastWaitMs).toISOString(),
    finishedAt: null,
  }),
  failed: runOf(ids.failedRun, {
    inputs: { prompt: "A blue bicycle in the rain" },
    status: "failed",
    failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
  }),
}

export function failedWith(code: string, status: number): Run {
  return { ...screenRuns.failed, failure: { code, status } }
}

export const screenCharacter: Character = character.parse({
  id: ids.ana,
  name: "Ana",
  references: [ids.upload],
  notes: "",
  createdAt,
})

export function settingsOf(
  agent: GatewaySettings["agent"] = "missing"
): GatewaySettings {
  return {
    mode: "owner",
    engine: { target: "demo", address: null, key: "missing", origin: "demo" },
    lock: "local",
    keyFrom: "server",
    agent,
    agentModel: agent === "set" ? "MiniMax-M3" : null,
    place: "bun",
    retentionDays: null,
  }
}

export const liveSettings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: "https://cloud.comfy.org",
    key: "set",
    origin: "live",
  },
  lock: "token",
  keyFrom: "server",
  agent: "set",
  agentModel: "MiniMax-M3",
  place: "bun",
  retentionDays: null,
}

export function publicSettingsOf(hasKeys: boolean): GatewaySettings {
  return {
    mode: "public",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: hasKeys ? "set" : "missing",
      origin: hasKeys ? "live" : "demo",
    },
    lock: "none",
    keyFrom: "settings",
    agent: hasKeys ? "set" : "missing",
    agentModel: hasKeys ? "MiniMax-M3" : null,
    place: "workers",
    retentionDays: 7,
  }
}

function pageOf<Key extends string, Item>(key: Key, items: readonly Item[]) {
  return {
    pages: [{ [key]: items, next: null }],
    pageParams: [null],
  }
}

function failedQuery(
  client: QueryClient,
  queryKey: readonly unknown[],
  status: number
): void {
  client
    .getQueryCache()
    .build(client, { queryKey: [...queryKey] })
    .setState({
      status: "error",
      error: new GatewayRefusedError({
        code: status === 404 ? "NOT_FOUND" : "DEPENDENCY_FAILED",
        status,
        retryAfterSeconds: null,
      }),
      errorUpdatedAt: Date.parse(createdAt),
      fetchFailureCount: 1,
    })
}

export const seeds = {
  settings:
    (agent: GatewaySettings["agent"] = "missing"): Seed =>
    (client) => {
      client.setQueryData(["settings"], settingsOf(agent))
    },
  settingsAs:
    (settings: GatewaySettings): Seed =>
    (client) => {
      client.setQueryData(["settings"], settings)
    },
  data:
    (queryKey: readonly unknown[], data: unknown): Seed =>
    (client) => {
      client.setQueryData([...queryKey], data)
    },
  media: (): Seed => (client) => {
    for (const one of Object.values(screenAssets)) {
      client.setQueryData(["asset", one.id], { asset: one })
    }
    for (const [assetId, src] of sources) {
      client.setQueryData([assetBlobKey, assetId], src)
    }
    for (const one of Object.values(screenRuns)) {
      client.setQueryData(["run", one.id], { run: one })
    }
  },
  runs:
    (runs: readonly Run[], appId: string | null = null): Seed =>
    (client) => {
      client.setQueryData(["runs", { appId }], pageOf("runs", runs))
    },
  assets:
    (assets: readonly Asset[], kind: string | null = null): Seed =>
    (client) => {
      client.setQueryData(["assets", { kind }], pageOf("assets", assets))
    },
  characters:
    (list: readonly Character[]): Seed =>
    (client) => {
      client.setQueryData(["characters"], { characters: list })
      for (const one of list) {
        client.setQueryData(["character", one.id], { character: one })
      }
    },
  failed:
    (queryKey: readonly unknown[]): Seed =>
    (client) => {
      failedQuery(client, queryKey, 500)
    },
  missing:
    (queryKey: readonly unknown[]): Seed =>
    (client) => {
      failedQuery(client, queryKey, 404)
    },
}
