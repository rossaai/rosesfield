import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { type Run, routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import type {
  ClipColors,
  ClipPart,
  ClipPlan,
} from "@/screens/explore/share-clip"
import { outputPromptOf } from "@/viewer/result-panel"

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

function promptOf(
  run: Run,
  outputId: string,
  models: readonly CatalogModel[]
): string {
  const app = findCatalogApp(run.appId)
  return (
    outputPromptOf(run, outputId, models) ??
    (app === null ? run.appId : appName(app))
  )
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
  outputId: string,
  models: readonly CatalogModel[]
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
      input: inputPart ?? {
        kind: "text",
        text: promptOf(run, outputId, models),
      },
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
