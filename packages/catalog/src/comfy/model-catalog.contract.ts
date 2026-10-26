import {
  appId,
  aspectRatio,
  defineRoute,
  errorBody,
  runCount,
  runInputs,
} from "@rosesfield/contract"
import type { ModelField } from "@rosesfield/generation/bindings"
import { z } from "zod"

const fieldBase = {
  name: z
    .string()
    .regex(/^[a-z][a-zA-Z0-9]*$/)
    .max(40),
  path: z.string().min(1).max(200),
  required: z.boolean(),
  description: z.string().min(1).max(300).exactOptional(),
}

const scalar = z.union([z.string().max(200), z.number()])

export const modelField: z.ZodType<ModelField> = z.discriminatedUnion("kind", [
  z.object({
    ...fieldBase,
    kind: z.enum(["prompt", "text"]),
    maxLength: z.number().int().nullable(),
    default: z.string().max(2000).nullable(),
  }),
  z.object({
    ...fieldBase,
    kind: z.literal("choice"),
    options: z.array(scalar).min(1).max(200),
    default: scalar.nullable(),
  }),
  z.object({
    ...fieldBase,
    kind: z.literal("number"),
    min: z.number().nullable(),
    max: z.number().nullable(),
    integer: z.boolean(),
    step: z.number().positive().exactOptional(),
    default: z.number().nullable(),
  }),
  z.object({
    ...fieldBase,
    kind: z.literal("toggle"),
    default: z.boolean().nullable(),
  }),
  z.object({
    ...fieldBase,
    kind: z.literal("media"),
    media: z.enum(["image", "video", "audio"]),
    min: z.number().int().min(0),
    max: z.number().int().min(1).max(16),
  }),
])

export const modelTag = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolution"), value: z.string().max(20) }),
  z.object({
    kind: z.literal("length"),
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  z.object({ kind: z.literal("sound") }),
  z.object({ kind: z.literal("open-weights") }),
  z.object({ kind: z.literal("hosted") }),
  z.object({ kind: z.literal("references"), max: z.number().int().min(1) }),
  z.object({ kind: z.literal("proven") }),
])

export const boardRank = z.object({
  position: z.number().int().min(1),
  size: z.number().int().min(1),
  board: z.string().min(1).max(120),
  url: z.url(),
  readOn: z.iso.date(),
})

export const priceThird = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const modelFacts = z.object({
  lab: z.string().min(1).max(80).nullable(),
  release: z.iso.date().nullable(),
  rank: boardRank.nullable(),
  priceThird: priceThird.nullable(),
  weights: z.url().nullable(),
  lineKey: z.string().max(120).nullable(),
})

export const catalogModel = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["hosted", "graph"]),
  maker: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  nameKey: z.string().max(120).nullable(),
  task: z.string().min(1).max(40).nullable(),
  tags: z.array(modelTag).max(8),
  form: z.array(modelField).max(64).nullable(),
  facts: modelFacts.optional(),
})

export const modelListResponse = z.object({
  models: z.array(catalogModel),
  defaultModel: z.string().nullable(),
  refusal: errorBody.nullable(),
})

export const priceBody = z.object({
  inputs: runInputs,
  count: runCount.default(1),
  aspectRatio: aspectRatio.nullable().default(null),
})

export const runPrice = z.discriminatedUnion("source", [
  z.object({
    source: z.enum(["measured", "estimate", "rates"]),
    credits: z.number(),
  }),
  z.object({ source: z.literal("unknown"), credits: z.null() }),
])

export const priceResponse = z.object({ price: runPrice })

export const priceAsksMax = 128

export const pricesBody = z.object({
  asks: z.array(priceBody).min(1).max(priceAsksMax),
})

export const pricesResponse = z.object({ prices: z.array(runPrice) })

const appParams = z.object({ appId })

export const catalogRoutes = {
  listModels: defineRoute({
    method: "GET",
    path: "/api/apps/:appId/models",
    params: appParams,
    query: null,
    body: null,
    response: modelListResponse,
    status: 200,
  }),
  priceRun: defineRoute({
    method: "POST",
    path: "/api/apps/:appId/price",
    params: appParams,
    query: null,
    body: priceBody,
    response: priceResponse,
    status: 200,
  }),
  priceRuns: defineRoute({
    method: "POST",
    path: "/api/apps/:appId/prices",
    params: appParams,
    query: null,
    body: pricesBody,
    response: pricesResponse,
    status: 200,
  }),
}

export type ModelTag = z.infer<typeof modelTag>
export type BoardRank = z.infer<typeof boardRank>
export type PriceThird = z.infer<typeof priceThird>
export type ModelFacts = z.infer<typeof modelFacts>
export type CatalogModel = z.infer<typeof catalogModel>
export type ModelListResponse = z.infer<typeof modelListResponse>
export type PriceResponse = z.infer<typeof priceResponse>
export type PricesResponse = z.infer<typeof pricesResponse>
