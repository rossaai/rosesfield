import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import type { AppChoice } from "./demo-args"
import type { DemoHost, HostAsset, HostRun } from "./demo-host"
import type { AppTake, Media, MediaKind } from "./demo-manifest"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const extensions: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
}

export function isKept(run: HostRun): boolean {
  return (
    run.status === "done" && run.origin === "live" && run.outputs.length > 0
  )
}

export function appNameOf(appId: string): string {
  const words = appId.split("-").join(" ")
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}

export async function chooseRun(
  host: DemoHost,
  choice: AppChoice
): Promise<HostRun> {
  if (choice.runId !== null) {
    const run = await host.run(choice.runId)
    if (run.appId !== choice.appId || !isKept(run)) {
      throw new Error(
        `Run ${choice.runId} is not a finished live ${choice.appId} run on ${host.url}. Every result in the video comes from a real run.`
      )
    }
    return run
  }
  const run = (await host.runs(choice.appId)).find(isKept)
  if (run === undefined) {
    throw new Error(
      `${host.url} holds no finished live ${choice.appId} run for this key. Make one there first, or name one with --apps ${choice.appId}=<run id>.`
    )
  }
  return run
}

export function inputAssetIds(run: HostRun): string[] {
  return Object.values(run.inputs).flatMap((value) => {
    const values = Array.isArray(value) ? value : [value]
    return values.filter(
      (one): one is string => typeof one === "string" && uuidPattern.test(one)
    )
  })
}

function kindOf(asset: HostAsset): MediaKind | null {
  return asset.kind === "image" || asset.kind === "video" ? asset.kind : null
}

async function firstMedia(
  host: DemoHost,
  ids: readonly string[],
  kinds: readonly MediaKind[]
): Promise<HostAsset | null> {
  const assets = await Promise.all(
    ids.map((id) => host.asset(id).catch(() => null))
  )
  return (
    assets.find((asset): asset is HostAsset => {
      if (asset === null) {
        return false
      }
      const kind = kindOf(asset)
      return kind !== null && kinds.includes(kind)
    }) ?? null
  )
}

async function saved(
  host: DemoHost,
  asset: HostAsset,
  folder: string,
  name: string
): Promise<Media> {
  const kind = kindOf(asset)
  if (kind === null) {
    throw new Error(
      `Asset ${asset.id} is ${asset.kind}, not an image or a video.`
    )
  }
  const extension = extensions[asset.mime] ?? asset.mime.split("/")[1] ?? "bin"
  const file = join("media", `${name}.${extension}`)
  await mkdir(join(folder, "media"), { recursive: true })
  await host.download(asset.id, join(folder, file))
  return { file, kind }
}

export type AppSeen = Pick<AppTake, "model" | "screen">

export const unseen: AppSeen = { model: null, screen: null }

export async function takeOf(
  host: DemoHost,
  run: HostRun,
  folder: string,
  seen: AppSeen = unseen
): Promise<AppTake> {
  const [output, input] = await Promise.all([
    firstMedia(host, run.outputs, ["video", "image"]),
    firstMedia(host, inputAssetIds(run), ["image"]),
  ])
  if (output === null) {
    throw new Error(
      `Run ${run.id} of ${run.appId} made no image or video, so it has no clip.`
    )
  }
  const name = `${run.appId}-${run.id.slice(0, 8)}`
  const [outputMedia, inputMedia] = await Promise.all([
    saved(host, output, folder, `${name}-result`),
    input === null ? null : saved(host, input, folder, `${name}-input`),
  ])
  return {
    appId: run.appId,
    appName: appNameOf(run.appId),
    runId: run.id,
    input: inputMedia,
    output: outputMedia,
    credits: run.credits,
    ...seen,
  }
}
