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

const factRow = z.strictObject({
  lab: z.string().min(1).max(80),
  release: z.iso.date().nullable(),
  weights: z.url().nullable(),
  ranks: z.record(z.string(), z.number().int().min(1)),
  thirds: z.record(z.string(), priceThird),
})

export const modelFactsFile = z.strictObject({
  boards: z.record(z.string(), board),
  models: z.record(z.string(), factRow),
})

export type ModelFactsFile = z.infer<typeof modelFactsFile>

export const weightsHost = "https://huggingface.co/"

export const modelFactsData: ModelFactsFile = modelFactsFile.parse(source)

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

export function factsOf(
  id: string,
  task: string,
  lineKey: string | null,
  data: ModelFactsFile = modelFactsData
): ModelFacts {
  const row = Object.hasOwn(data.models, id) ? data.models[id] : undefined
  const weights = row?.weights ?? null
  return {
    lab: row?.lab ?? null,
    release: row?.release ?? null,
    rank: boardRankOf(id, task, data),
    priceThird: row?.thirds[task] ?? null,
    weights: weights?.startsWith(weightsHost) === true ? weights : null,
    lineKey,
  }
}
