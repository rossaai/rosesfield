import { appId, defineRoute, runInputs } from "@rosesfield/contract"
import type { ModelField } from "@rosesfield/generation"
import { z } from "zod"

const fieldBase = {
  name: z
    .string()
    .regex(/^[a-z][a-zA-Z0-9]*$/)
    .max(40),
  path: z.string().min(1).max(200),
  label: z.string().min(1).max(120),
  required: z.boolean(),
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
])

export const catalogModel = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["hosted", "graph"]),
  maker: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  nameKey: z.string().max(120).nullable(),
  task: z.string().min(1).max(40),
  tags: z.array(modelTag).max(8),
  proven: z.boolean(),
  form: z.array(modelField).max(64).nullable(),
})

export const modelListResponse = z.object({
  models: z.array(catalogModel),
  defaultModel: z.string().nullable(),
})

export const priceBody = z.object({ inputs: runInputs })

export const priceResponse = z.object({
  price: z.discriminatedUnion("source", [
    z.object({ source: z.enum(["estimate", "rates"]), credits: z.number() }),
    z.object({ source: z.literal("unknown"), credits: z.null() }),
  ]),
})

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
}

export type ModelTag = z.infer<typeof modelTag>
export type CatalogModel = z.infer<typeof catalogModel>
export type ModelListResponse = z.infer<typeof modelListResponse>
export type PriceResponse = z.infer<typeof priceResponse>
