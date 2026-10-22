import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import { type Run, run } from "@rosesfield/contract"
import { promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { type ShowcaseRow, showcaseRows } from "@/showcase/showcase-rows"
import { previewOf } from "@/studio/effects/effect-previews"

export type ShowcaseItem = ShowcaseRow & { src: string; run: Run }

const mediaFiles = import.meta.glob("./media/*", {
  eager: true,
  query: "?url",
  import: "default",
})

const adapter = "comfy-workflow"

export function mediaOf(file: string): string | null {
  return mediaFiles[`./media/${file}`] ?? previewOf(file)
}

function inputsOf(row: ShowcaseRow): Record<string, string> {
  const app = findCatalogApp(row.appId)
  const prompt = app === null ? null : promptInputOf(app)
  return prompt === null || row.prompt === null
    ? { ...row.inputs }
    : { ...row.inputs, [prompt.name]: row.prompt }
}

export function showcaseRun(row: ShowcaseRow): Run {
  return run.parse({
    id: row.runId,
    appId: row.appId,
    status: "done",
    inputs: inputsOf(row),
    count: 1,
    aspectRatio: row.aspectRatio,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter, models: [row.model], workflowHash: null },
    cost: { amount: row.credits / comfyCreditsPerUsd, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: row.madeAt,
    finishedAt: new Date(
      Date.parse(row.madeAt) + row.seconds * 1000
    ).toISOString(),
  })
}

export function showcaseItemsOf(
  rows: readonly ShowcaseRow[],
  media: (file: string) => string | null = mediaOf
): ShowcaseItem[] {
  return rows.flatMap((row) => {
    const src = media(row.file)
    return src === null ? [] : [{ ...row, src, run: showcaseRun(row) }]
  })
}

export const showcaseItems: readonly ShowcaseItem[] =
  showcaseItemsOf(showcaseRows)

export function showcaseOf(appId: string): ShowcaseItem[] {
  return showcaseItems.filter((item) => item.appId === appId)
}

const madeFromAnother = new Set(
  showcaseRows.flatMap((row) => (row.from === undefined ? [] : [row.runId]))
)

export function isHeldStill(runId: string): boolean {
  return (
    showcaseRows.some((row) => row.runId === runId) &&
    !madeFromAnother.has(runId)
  )
}
