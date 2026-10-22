export type MediaKind = "image" | "video"

export type Media = { file: string; kind: MediaKind }

export type AppTake = {
  appId: string
  appName: string
  runId: string
  input: Media | null
  output: Media
  credits: number | null
}

export const tourScenes = [
  "key",
  "areas",
  "models",
  "run",
  "share",
  "credits",
] as const

export const builtScenes = [
  "router",
  "cloud",
  "catalog",
  "graph",
  "proof",
] as const

export type TourScene = (typeof tourScenes)[number]

export type BuiltScene = (typeof builtScenes)[number]

export type SceneId = TourScene | BuiltScene

export type Window = { start: number; end: number }

export type Scene = {
  id: SceneId
  file: string
  windows: Window[]
  caption: string
}

export type LiveRun = { runId: string; credits: number }

export type Credits = {
  budget: number
  live: LiveRun[]
  proofRuns: number
  proofCredits: number
}

export type Manifest = {
  url: string
  recordedAt: string
  hook: { take: AppTake; caption: string }
  scenes: Scene[]
  shareUrl: string | null
  apps: AppTake[]
  credits: Credits
}

type Row = Record<string, unknown>

const sceneIds: readonly string[] = [...tourScenes, ...builtScenes]

function rowOf(value: unknown, where: string): Row {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`The take's manifest has no ${where}.`)
  }
  return Object.fromEntries(Object.entries(value))
}

function textOf(value: unknown, where: string): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`The take's manifest has no ${where}.`)
  }
  return value
}

function numberOf(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`The take's manifest has no ${where}.`)
  }
  return value
}

function listOf(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`The take's manifest has no ${where}.`)
  }
  return value
}

function mediaOf(value: unknown, where: string): Media {
  const row = rowOf(value, where)
  const kind = row.kind
  if (kind !== "image" && kind !== "video") {
    throw new Error(`The take's manifest has no kind for ${where}.`)
  }
  return { file: textOf(row.file, `${where} file`), kind }
}

function takeOf(value: unknown, where: string): AppTake {
  const row = rowOf(value, where)
  return {
    appId: textOf(row.appId, `${where} app`),
    appName: textOf(row.appName, `${where} app name`),
    runId: textOf(row.runId, `${where} run`),
    input: row.input === null ? null : mediaOf(row.input, `${where} input`),
    output: mediaOf(row.output, `${where} output`),
    credits:
      row.credits === null ? null : numberOf(row.credits, `${where} credits`),
  }
}

function sceneIdOf(value: unknown): SceneId {
  const id = tourScenes.find((one) => one === value)
  const built = builtScenes.find((one) => one === value)
  const found = id ?? built
  if (found === undefined) {
    throw new Error(
      `The take's manifest names a scene ${String(value)}, and the scenes are ${sceneIds.join(", ")}.`
    )
  }
  return found
}

function sceneOf(value: unknown): Scene {
  const row = rowOf(value, "scene")
  const id = sceneIdOf(row.id)
  return {
    id,
    file: textOf(row.file, `${id} file`),
    caption: textOf(row.caption, `${id} caption`),
    windows: listOf(row.windows, `${id} windows`).map((one) => {
      const window = rowOf(one, `${id} window`)
      return {
        start: numberOf(window.start, `${id} window start`),
        end: numberOf(window.end, `${id} window end`),
      }
    }),
  }
}

function creditsOf(value: unknown): Credits {
  const row = rowOf(value, "credits")
  return {
    budget: numberOf(row.budget, "budget"),
    proofRuns: numberOf(row.proofRuns, "proof runs"),
    proofCredits: numberOf(row.proofCredits, "proof credits"),
    live: listOf(row.live, "live runs").map((one) => {
      const live = rowOf(one, "live run")
      return {
        runId: textOf(live.runId, "live run id"),
        credits: numberOf(live.credits, "live run credits"),
      }
    }),
  }
}

export function manifestOf(value: unknown): Manifest {
  const row = rowOf(value, "body")
  const hook = rowOf(row.hook, "hook")
  return {
    url: textOf(row.url, "site address"),
    recordedAt: textOf(row.recordedAt, "recording time"),
    hook: {
      take: takeOf(hook.take, "hook"),
      caption: textOf(hook.caption, "hook caption"),
    },
    scenes: listOf(row.scenes, "scenes").map(sceneOf),
    shareUrl:
      row.shareUrl === null ? null : textOf(row.shareUrl, "share link"),
    apps: listOf(row.apps, "apps").map((one) => takeOf(one, "app")),
    credits: creditsOf(row.credits),
  }
}

export function liveCreditsOf(credits: Credits): number {
  return credits.live.reduce((sum, run) => sum + run.credits, 0)
}

export const manifestName = "manifest.json"
