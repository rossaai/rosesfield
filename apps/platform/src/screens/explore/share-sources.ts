import { type Run, routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import type {
  ClipColors,
  ClipPart,
  ClipPlan,
} from "@/screens/explore/share-clip"

export type ClipSources = {
  plan: ClipPlan
  release: () => void
}

async function blobUrl(
  assetId: string
): Promise<{ url: string; kind: string }> {
  const blob = await callRoute(routes.readAssetContent, { params: { assetId } })
  return { url: URL.createObjectURL(blob), kind: blob.type.split("/")[0] ?? "" }
}

function firstMediaInput(run: Run): string | null {
  for (const value of Object.values(run.inputs)) {
    if (Array.isArray(value) && value[0] !== undefined) {
      return value[0]
    }
  }
  return null
}

function promptOf(run: Run): string {
  const app = findCatalogApp(run.appId)
  const name =
    app?.inputs.find((input) => input.type === "prompt")?.name ?? "prompt"
  const prompt = run.inputs[name]
  if (typeof prompt === "string" && prompt.trim() !== "") {
    return prompt.trim()
  }
  return app === null ? run.appId : appName(app)
}

function partOf(source: { url: string; kind: string }): ClipPart | null {
  if (source.kind === "image") {
    return { kind: "image", src: source.url }
  }
  if (source.kind === "video") {
    return { kind: "video", src: source.url }
  }
  return null
}

export async function clipSourcesOf(
  run: Run,
  outputId: string
): Promise<ClipSources> {
  const inputId = firstMediaInput(run)
  const [result, input] = await Promise.all([
    blobUrl(outputId),
    inputId === null
      ? Promise.resolve(null)
      : blobUrl(inputId).catch(() => null),
  ])
  const urls = [result.url, ...(input === null ? [] : [input.url])]
  const resultPart = partOf(result)
  if (resultPart === null) {
    throw new Error("A clip needs an image or a video result")
  }
  const inputPart = input === null ? null : partOf(input)
  return {
    plan: {
      input: inputPart ?? { kind: "text", text: promptOf(run) },
      result: resultPart,
    },
    release: () => {
      for (const url of urls) {
        URL.revokeObjectURL(url)
      }
    },
  }
}

export function clipColors(): ClipColors {
  const style = getComputedStyle(document.documentElement)
  return {
    ground: style.getPropertyValue("--canvas").trim() || "black",
    ink: style.getPropertyValue("--ink").trim() || "white",
    font: "Montserrat, sans-serif",
  }
}

export const posterEdge = 1280

async function frameOf(
  url: string,
  kind: string
): Promise<HTMLImageElement | HTMLVideoElement> {
  if (kind === "video") {
    const video = document.createElement("video")
    video.muted = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error("The video did not load"))
    })
    return video
  }
  const image = new Image()
  image.src = url
  await image.decode()
  return image
}

export function posterSize(
  width: number,
  height: number
): { width: number; height: number } {
  const scale = Math.min(1, posterEdge / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export async function posterOf(
  run: Run,
  outputId: string
): Promise<Blob | null> {
  const kind = findCatalogApp(run.appId)?.output.kind
  if (kind !== "video" && kind !== "image") {
    return null
  }
  const { url } = await blobUrl(outputId)
  try {
    const frame = await frameOf(url, kind)
    const size =
      frame instanceof HTMLVideoElement
        ? posterSize(frame.videoWidth, frame.videoHeight)
        : posterSize(frame.naturalWidth, frame.naturalHeight)
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext("2d")?.drawImage(frame, 0, 0, size.width, size.height)
    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.86)
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
