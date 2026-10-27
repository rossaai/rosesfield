import { z } from "zod"
import type {
  ModelFacts,
  ScoreSource,
  ScoreTier,
  TaskScore,
} from "#comfy/model-catalog.contract"
import source from "./model-facts.json"

const board = z.strictObject({
  name: z.string().min(1).max(120),
  url: z.url(),
  size: z.number().int().min(1),
  readOn: z.iso.date(),
})

const boardRow = z
  .strictObject({
    board: z.string().min(1).max(120),
    url: z.url(),
    readOn: z.iso.date(),
    published: z.iso.date().nullable(),
    row: z.string().min(1).max(200),
    position: z.number().int().min(1),
    size: z.number().int().min(1),
    positionScore: z.number().min(0).max(100),
    display: z.boolean(),
    rating: z.number().optional(),
    licence: z.string().min(1).max(200).optional(),
    site: z.url().optional(),
  })
  .refine((row) => row.position <= row.size, {
    message: "A board's position sits within its rows",
    path: ["position"],
  })
  .refine((row) => row.display === (row.licence !== undefined), {
    message: "A board's number is shown only under the licence that grants it",
    path: ["licence"],
  })

const fileTier = z.enum(["best quality", "best value", "cheapest", "costly"])

const taskPrice = z.union([
  z.strictObject({
    credits: z.number().min(0),
    unit: z.enum(["per output", "per second"]),
  }),
  z.strictObject({ none: z.string().min(1).max(200) }),
])

const scoreValue = z.number().int().min(0).max(100)

const taskCell = z
  .strictObject({
    score: scoreValue.nullable(),
    licensedScore: scoreValue.nullable(),
    rank: z.number().int().min(1),
    of: z.number().int().min(1),
    placement: z.enum(["score", "version", "release", "unplaced"]),
    placedAbove: z.string().min(1).max(200).optional(),
    rankBeforeLineRule: z.number().int().min(1).optional(),
    sources: z.array(boardRow).max(8),
    tiers: z.array(fileTier).max(4),
    price: taskPrice,
  })
  .refine((cell) => cell.rank <= cell.of, {
    message: "A rank sits within the task's models",
    path: ["rank"],
  })
  .refine((cell) => (cell.score === null) === (cell.sources.length === 0), {
    message: "A score comes from the boards that hold the model, and only then",
    path: ["score"],
  })
  .refine((cell) => (cell.placement === "score") === (cell.score !== null), {
    message: "A scored model is placed by its score",
    path: ["placement"],
  })

const releaseSource = z.union([
  z.strictObject({
    url: z.url(),
    kind: z.string().min(1).max(120),
  }),
  z.strictObject({ none: z.string().min(1).max(200) }),
])

const describedLine = z.strictObject({
  key: z.string().regex(/^comfy\.model\.[a-z][a-zA-Z0-9]*\.line$/),
  source: z.url(),
  quote: z.string().min(1).max(400),
})

const undescribedLine = z.strictObject({
  none: z.string().min(1).max(200),
})

const factRow = z.strictObject({
  lab: z.string().min(1).max(80),
  release: z.iso.date().nullable(),
  weights: z.url().nullable(),
  ranks: z.record(z.string(), z.number().int().min(1)),
  thirds: z.record(
    z.string(),
    z.union([z.literal(1), z.literal(2), z.literal(3)])
  ),
  line: z.union([describedLine, undescribedLine]),
  releaseSource: releaseSource.optional(),
  tasks: z.record(z.string(), taskCell).optional(),
})

const sourcedRow = factRow.refine(
  (row) =>
    row.releaseSource === undefined ||
    (row.release !== null) === "url" in row.releaseSource,
  {
    message: "A release date names the page it was read on",
    path: ["releaseSource"],
  }
)

const markSetName = z.enum(["Simple Icons", "LobeHub Icons"])

const markSet = z.union([
  z.strictObject({
    name: markSetName,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    licence: z.literal("CC0-1.0"),
    url: z.url(),
  }),
  z.strictObject({
    name: markSetName,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    licence: z.literal("MIT"),
    url: z.url(),
    text: z.string().min(1).max(4000),
  }),
])

const hex = z.string().regex(/^[0-9A-F]{6}$/)

const markPath = z
  .string()
  .max(8000)
  .regex(/^[Mm][-+.,\deMmLlHhVvCcSsQqTtAaZz\s]*$/)

const viewBox = z.string().regex(/^-?\d+(\.\d+)?( -?\d+(\.\d+)?){3}$/)

const labMark = z
  .strictObject({
    slug: z.string().regex(/^[a-z0-9]+$/),
    title: z.string().min(1).max(80),
    hex,
    hexDark: hex,
    ground: hex.optional(),
    fillRule: z.literal("evenodd").optional(),
    set: z.union([markSetName, z.literal("Comfy"), z.literal("Brand")]),
    path: markPath,
    viewBox: viewBox.optional(),
    accent: z.strictObject({ path: markPath, hex, hexDark: hex }).optional(),
    source: z.url().optional(),
  })
  .refine((mark) => mark.set !== "Brand" || mark.source !== undefined, {
    message: "A mark taken from a lab's own brand page names that page",
    path: ["source"],
  })

const markMissing = z.strictObject({
  searched: z.array(z.string().min(1).max(80)).min(1),
  ground: hex,
  ink: z.enum(["000000", "FFFFFF"]),
  source: z.url(),
})

type FactRow = z.infer<typeof factRow>

function rowsOfTask(
  models: Readonly<Record<string, FactRow>>
): Map<string, number[]> {
  const ranks = new Map<string, number[]>()
  for (const row of Object.values(models)) {
    for (const [task, cell] of Object.entries(row.tasks ?? {})) {
      ranks.set(task, [...(ranks.get(task) ?? []), cell.rank])
    }
  }
  return ranks
}

function isWholeOrder(ranks: readonly number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b)
  return sorted.every((rank, index) => rank === index + 1)
}

export const modelFactsFile = z
  .strictObject({
    scoreMethod: z.string().min(1).max(2000),
    boards: z.record(z.string(), board),
    markSet: z.array(markSet).min(1),
    marks: z.record(z.string(), labMark),
    marksMissing: z.record(z.string(), markMissing),
    models: z.record(z.string(), sourcedRow),
  })
  .superRefine((file, context) => {
    for (const [task, ranks] of rowsOfTask(file.models)) {
      const ofs = new Set(
        Object.values(file.models).flatMap((row) => {
          const cell = row.tasks?.[task]
          return cell === undefined ? [] : [cell.of]
        })
      )
      if (!isWholeOrder(ranks) || ofs.size !== 1 || !ofs.has(ranks.length)) {
        context.addIssue({
          code: "custom",
          message: `The ranks of ${task} run once each from 1 to its count of models`,
          path: ["models"],
        })
      }
    }
  })

export type ModelFactsFile = z.infer<typeof modelFactsFile>

export const weightsHost = "https://huggingface.co/"

export const modelFactsData: ModelFactsFile = modelFactsFile.parse(source)

function rowOf(id: string, data: ModelFactsFile): FactRow | undefined {
  return Object.hasOwn(data.models, id) ? data.models[id] : undefined
}

export function labOfModel(
  id: string,
  data: ModelFactsFile = modelFactsData
): string | null {
  return rowOf(id, data)?.lab ?? null
}

export function lineKeyOf(
  id: string,
  data: ModelFactsFile = modelFactsData
): string | null {
  const line = rowOf(id, data)?.line
  return line !== undefined && "key" in line ? line.key : null
}

type TaskCell = z.infer<typeof taskCell>

const tierNames = {
  "best quality": "bestQuality",
  "best value": null,
  cheapest: "cheapest",
  costly: "costly",
} as const satisfies Record<z.infer<typeof fileTier>, ScoreTier | null>

const lastScored = new WeakMap<ModelFactsFile, ReadonlyMap<string, number>>()

function lastScoredOf(data: ModelFactsFile): ReadonlyMap<string, number> {
  const held = lastScored.get(data)
  if (held !== undefined) {
    return held
  }
  const last = new Map<string, number>()
  for (const row of Object.values(data.models)) {
    for (const [task, cell] of Object.entries(row.tasks ?? {})) {
      if (cell.score !== null) {
        last.set(task, Math.max(last.get(task) ?? 0, cell.rank))
      }
    }
  }
  lastScored.set(data, last)
  return last
}

function sourceOf(row: TaskCell["sources"][number]): ScoreSource {
  return {
    board: row.board,
    url: row.url,
    readOn: row.readOn,
    display: row.display ? "allowed" : "refused",
  }
}

function tiersOf(cell: TaskCell, rank: number | null): ScoreTier[] {
  const named = cell.tiers
    .filter((tier) => tier !== "best quality")
    .flatMap((tier) => {
      const name = tierNames[tier]
      return name === null ? [] : [name]
    })
  return rank === 1 ? ["bestQuality", ...named] : named
}

function taskScoreOf(cell: TaskCell, lastScoredRank: number): TaskScore {
  const rank = cell.rank <= lastScoredRank ? cell.rank : null
  return {
    score: cell.score,
    rank,
    order: cell.rank,
    of: cell.of,
    sources: cell.sources.map(sourceOf),
    tiers: tiersOf(cell, rank),
  }
}

export function scoresOf(
  id: string,
  data: ModelFactsFile = modelFactsData
): Record<string, TaskScore> {
  const tasks = rowOf(id, data)?.tasks ?? {}
  const last = lastScoredOf(data)
  return Object.fromEntries(
    Object.entries(tasks).map(([task, cell]) => [
      task,
      taskScoreOf(cell, last.get(task) ?? 0),
    ])
  )
}

export function factsOf(
  id: string,
  data: ModelFactsFile = modelFactsData
): ModelFacts {
  const row = rowOf(id, data)
  const weights = row?.weights ?? null
  return {
    lab: labOfModel(id, data),
    release: row?.release ?? null,
    weights: weights?.startsWith(weightsHost) === true ? weights : null,
    lineKey: lineKeyOf(id, data),
    scores: scoresOf(id, data),
  }
}

export function unmarkedLabsOf(
  data: ModelFactsFile = modelFactsData
): string[] {
  const searched = data.markSet.map((set) => `${set.name} ${set.version}`)
  const labs = new Set(Object.values(data.models).map((row) => row.lab))
  return [...labs].filter((lab) => {
    if (Object.hasOwn(data.marks, lab)) {
      return false
    }
    const missing = Object.hasOwn(data.marksMissing, lab)
      ? data.marksMissing[lab]
      : undefined
    return !searched.every((set) => missing?.searched.includes(set))
  })
}
