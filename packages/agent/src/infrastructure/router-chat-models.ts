import { z } from "zod"
import { type AgentEffort, agentEffort, agentModelInput } from "#agent.contract"
import source from "./router-chat-models.json"

export const routerChat = {
  provider: "comfy-router",
  route: "openrouter/chat-completions",
  timeoutMs: 120_000,
  contextWindow: 65_536,
  maxTokens: 8192,
}

const point = z.strictObject({
  effort: z.union([agentEffort, z.literal("default")]),
  score: z.number().int().min(0).max(100).nullable(),
  costPerTaskUsd: z.number().min(0).nullable(),
  outputTokensPerTask: z.number().int().min(1).nullable(),
  onLine: z.boolean(),
})

const chatModel = z
  .strictObject({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(120),
    lab: z.string().min(1).max(80),
    tools: z.literal(true),
    context: z.number().int().min(1),
    inputs: z.array(agentModelInput).max(4),
    usdPer1M: z.strictObject({
      input: z.number().min(0),
      output: z.number().min(0),
      cacheRead: z.number().min(0).nullable(),
      cacheWrite: z.number().min(0).nullable(),
    }),
    score: z.number().int().min(0).max(100).nullable(),
    rank: z.number().int().min(1),
    placement: z.enum(["score", "version", "release"]),
    boards: z.array(z.string().min(1).max(120)).max(4),
    efforts: z.array(agentEffort).max(7),
    defaultEffort: agentEffort.nullable(),
    points: z.array(point).max(12),
  })
  .refine((model) => (model.score === null) === (model.boards.length === 0), {
    message: "A score comes from the boards that hold the model, and only then",
    path: ["score"],
  })

const readAt = z.iso.datetime()

export const routerChatTable = z
  .strictObject({
    readOn: z.iso.date(),
    method: z.record(z.string(), z.string().min(1).max(2000)),
    sources: z
      .array(z.strictObject({ name: z.string(), url: z.url(), readAt }))
      .min(1),
    boards: z.record(
      z.string(),
      z.strictObject({ url: z.url(), display: z.boolean() })
    ),
    models: z.array(chatModel).min(1),
  })
  .refine(
    (table) => table.models.every((model, index) => model.rank === index + 1),
    { message: "The models run in rank order from 1", path: ["models"] }
  )
  .refine(
    (table) =>
      new Set(table.models.map((model) => model.id)).size ===
      table.models.length,
    { message: "A model is listed once", path: ["models"] }
  )

export type RouterChatTable = z.infer<typeof routerChatTable>
export type RouterChatModel = z.infer<typeof chatModel>
export type ChatPoint = z.infer<typeof point>

export const routerChatData: RouterChatTable = routerChatTable.parse(source)

const byId: ReadonlyMap<string, RouterChatModel> = new Map(
  routerChatData.models.map((model) => [model.id, model])
)

export const routerChatModels: readonly string[] = routerChatData.models.map(
  (model) => model.id
)

/** The highest ranked scored model, the first one Featured holds, which the agent opens on until you choose another. */
export function defaultModelOf(table: RouterChatTable): string {
  const found = table.models
    .filter((model) => model.score !== null)
    .sort((a, b) => a.rank - b.rank)[0]
  if (found === undefined) {
    throw new Error("No chat model is scored")
  }
  return found.id
}

export const defaultChatModel: string = defaultModelOf(routerChatData)

export function isRouterChatModel(model: string): boolean {
  return byId.has(model)
}

export function routerChatModelOf(model: string): RouterChatModel | undefined {
  return byId.get(model)
}

export function hasEffortChoice(model: RouterChatModel): boolean {
  return model.efforts.length > 1
}

/** The effort a model opens on: OpenRouter's default effort for it when it offers it, else medium when it offers medium, else the middle level of its efforts, and none for a model with no effort to choose. */
export function openEffortOf(
  model: Pick<RouterChatModel, "efforts" | "defaultEffort">
): AgentEffort | null {
  const { efforts, defaultEffort } = model
  if (efforts.length < 2) {
    return null
  }
  if (defaultEffort !== null && efforts.includes(defaultEffort)) {
    return defaultEffort
  }
  return efforts.includes("medium")
    ? "medium"
    : (efforts[Math.floor((efforts.length - 1) / 2)] ?? null)
}

/** The effort a turn sends: the chosen one when the model offers it, else the model's opening effort, and none for a model with no effort to choose. */
export function turnEffortOf(
  model: string,
  chosen: AgentEffort | undefined
): AgentEffort | null {
  const found = byId.get(model)
  if (found === undefined || !hasEffortChoice(found)) {
    return null
  }
  return chosen !== undefined && found.efforts.includes(chosen)
    ? chosen
    : openEffortOf(found)
}

export function pointOf(
  model: RouterChatModel,
  effort: AgentEffort | null
): ChatPoint | undefined {
  return model.points.find((one) => one.effort === (effort ?? "default"))
}
