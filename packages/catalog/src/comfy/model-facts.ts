import { z } from "zod"
import {
  type BoardRank,
  type ModelFacts,
  priceThird,
} from "#comfy/model-catalog.contract"
import source from "./model-facts.json"

const board = z.strictObject({
  name: z.string().min(1).max(120),
  url: z.url(),
  size: z.number().int().min(1),
  readOn: z.iso.date(),
})

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
  thirds: z.record(z.string(), priceThird),
  line: z.union([describedLine, undescribedLine]),
})

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

export const modelFactsFile = z.strictObject({
  boards: z.record(z.string(), board),
  markSet: z.array(markSet).min(1),
  marks: z.record(z.string(), labMark),
  marksMissing: z.record(z.string(), markMissing),
  models: z.record(z.string(), factRow),
})

export type ModelFactsFile = z.infer<typeof modelFactsFile>

export const weightsHost = "https://huggingface.co/"

export const modelFactsData: ModelFactsFile = modelFactsFile.parse(source)

export function labOfModel(
  id: string,
  data: ModelFactsFile = modelFactsData
): string | null {
  return Object.hasOwn(data.models, id) ? (data.models[id]?.lab ?? null) : null
}

export function boardRankOf(
  id: string,
  task: string,
  data: ModelFactsFile = modelFactsData
): BoardRank | null {
  const row = Object.hasOwn(data.models, id) ? data.models[id] : undefined
  const position = row?.ranks[task]
  const read = Object.hasOwn(data.boards, task) ? data.boards[task] : undefined
  if (position === undefined || read === undefined) {
    return null
  }
  return {
    position,
    size: read.size,
    board: read.name,
    url: read.url,
    readOn: read.readOn,
  }
}

export function lineKeyOf(
  id: string,
  data: ModelFactsFile = modelFactsData
): string | null {
  const row = Object.hasOwn(data.models, id) ? data.models[id] : undefined
  const line = row?.line
  return line !== undefined && "key" in line ? line.key : null
}

export function factsOf(
  id: string,
  task: string | null,
  data: ModelFactsFile = modelFactsData
): ModelFacts {
  const row = Object.hasOwn(data.models, id) ? data.models[id] : undefined
  const weights = row?.weights ?? null
  return {
    lab: labOfModel(id, data),
    release: row?.release ?? null,
    rank: task === null ? null : boardRankOf(id, task, data),
    priceThird: task === null ? null : (row?.thirds[task] ?? null),
    weights: weights?.startsWith(weightsHost) === true ? weights : null,
    lineKey: lineKeyOf(id, data),
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
