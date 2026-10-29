import { comfyCreditsPerUsd } from "@rosesfield/catalog/comfy"
import {
  approvedExamples,
  exampleInput,
  type LibraryExample,
} from "@rosesfield/catalog/motion"
import { type Run, run } from "@rosesfield/contract"
import { promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { type ShowcaseRow, showcaseRows } from "@/showcase/showcase-rows"

export type ShowcaseItem = ShowcaseRow & { src: string; run: Run }

const mediaFiles = import.meta.glob("./media/*", {
  eager: true,
  query: "?url",
  import: "default",
})

const adapter = "comfy-workflow"

const motionAppId = "motion"

export function mediaOf(file: string): string | null {
  return mediaFiles[`./media/${file}`] ?? null
}

export function exampleRowsOf(
  examples: readonly LibraryExample[]
): ShowcaseRow[] {
  return examples.flatMap((example) => {
    const { preview } = example
    return preview === null
      ? []
      : [
          {
            runId: preview.runId,
            file: preview.file,
            appId: motionAppId,
            kind: "video",
            width: preview.width,
            height: preview.height,
            model: preview.model,
            prompt: null,
            inputs: {
              [exampleInput]: example.id,
              resolution: preview.resolution,
            },
            aspectRatio: preview.aspectRatio,
            credits: preview.credits,
            seconds: preview.seconds,
            madeAt: preview.madeAt,
          },
        ]
  })
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

const shownRows: readonly ShowcaseRow[] = [
  ...showcaseRows,
  ...exampleRowsOf(approvedExamples),
]

export const showcaseItems: readonly ShowcaseItem[] = showcaseItemsOf(shownRows)

export function showcaseOf(appId: string): ShowcaseItem[] {
  return showcaseItems.filter((item) => item.appId === appId)
}

const isClipFile = (file: string): boolean => file.endsWith(".mp4")

const madeFromClip = new Set(
  shownRows.flatMap((row) =>
    row.from !== undefined && isClipFile(row.from) ? [row.runId] : []
  )
)

const shownSources = new Set(
  shownRows.flatMap((row) =>
    madeFromClip.has(row.runId)
      ? []
      : [row.from, row.input?.file].filter(
          (file): file is string => file !== undefined
        )
  )
)

export function isFeedExample(runId: string): boolean {
  const row = shownRows.find((one) => one.runId === runId)
  return (
    row !== undefined && !madeFromClip.has(runId) && !shownSources.has(row.file)
  )
}

export function exampleGroupOf(runId: string): string {
  const row = shownRows.find((one) => one.runId === runId)
  return row === undefined ? runId : (row.from ?? row.file)
}

export type ExampleSource = {
  src: string
  name: string
}

export function exampleInputOf(
  runId: string,
  media: (file: string) => string | null = mediaOf
): ExampleSource | null {
  const input = shownRows.find((row) => row.runId === runId)?.input
  const src = input === undefined ? null : media(input.file)
  return input === undefined || src === null ? null : { src, name: input.name }
}
