import { describe, expect, it } from "vitest"
import {
  defaultChatModel,
  defaultModelOf,
  isRouterChatModel,
  openEffortOf,
  type RouterChatModel,
  routerChatData,
  routerChatModelOf,
  routerChatModels,
  routerChatTable,
  turnEffortOf,
} from "#infrastructure/router-chat-models"
import source from "../../src/infrastructure/router-chat-models.json"

function modelOf(id: string): RouterChatModel {
  const found = routerChatModelOf(id)
  if (found === undefined) {
    throw new Error(`The table lists no ${id}`)
  }
  return found
}

const priced = {
  id: "maker/chat-small",
  name: "Chat Small",
  lab: "maker",
  tools: true,
  context: 131_072,
  inputs: [],
  usdPer1M: { input: 0.1, output: 0.4 },
  score: 80,
  rank: 1,
  placement: "score",
  boards: ["Arena Text, style control"],
  efforts: [],
  defaultEffort: null,
  points: [],
}

function tableWith(models: readonly unknown[]): unknown {
  return { ...source, models }
}

describe("the agent's chat model table", () => {
  it("lists every tool-calling chat model of the table, in rank order, with its read date and sources", () => {
    expect(routerChatModels).toHaveLength(274)
    expect(routerChatData.readOn).toBe("2026-10-26")
    expect(routerChatData.sources.map((one) => one.url)).toContain(
      "https://openrouter.ai/api/v1/models"
    )
    expect(routerChatModels.slice(0, 3)).toEqual([
      "anthropic/claude-opus-5.5",
      "moonshotai/kimi-k3.1-pro",
      "google/gemini-4-argon",
    ])
  })

  it("refuses a model that cannot call tools", () => {
    expect(routerChatTable.safeParse(tableWith([priced])).success).toBe(true)
    expect(
      routerChatTable.safeParse(tableWith([{ ...priced, tools: false }]))
        .success
    ).toBe(false)
  })

  it("opens each model on the effort OpenRouter uses by default for it, as read on the table's day", () => {
    expect(openEffortOf(modelOf("anthropic/claude-opus-5.5"))).toBe("high")
    expect(openEffortOf(modelOf("openai/gpt-6.1-terra"))).toBe("medium")
    expect(openEffortOf(modelOf("anthropic/claude-sonnet-5"))).toBe("high")
    expect(openEffortOf(modelOf(defaultChatModel))).toBe("high")
    const opened = routerChatData.models.filter(
      (one) =>
        one.efforts.length > 1 &&
        one.defaultEffort !== null &&
        one.efforts.includes(one.defaultEffort)
    )
    expect(opened).toHaveLength(117)
    expect(
      opened.filter((one) => openEffortOf(one) !== one.defaultEffort)
    ).toEqual([])
  })

  it("opens on medium where OpenRouter names no default it offers, else on the middle level, and on none for a model with one level or none", () => {
    const tuned: Pick<RouterChatModel, "efforts"> = {
      efforts: ["high", "medium", "low"],
    }
    expect(openEffortOf({ ...tuned, defaultEffort: "low" })).toBe("low")
    expect(openEffortOf({ ...tuned, defaultEffort: null })).toBe("medium")
    expect(openEffortOf({ ...tuned, defaultEffort: "max" })).toBe("medium")
    expect(
      openEffortOf({
        efforts: ["max", "high", "low", "none"],
        defaultEffort: null,
      })
    ).toBe("high")
    expect(
      openEffortOf({ efforts: ["xhigh", "high", "low"], defaultEffort: null })
    ).toBe("high")
    expect(
      openEffortOf({ efforts: ["high"], defaultEffort: "high" })
    ).toBeNull()
    expect(openEffortOf({ efforts: [], defaultEffort: null })).toBeNull()
  })

  it("opens on the highest ranked scored model priced at or under the median", () => {
    expect(defaultChatModel).toBe("deepseek/deepseek-v4.1-flash-1017")
    const cheap = { ...priced, id: "maker/cheap", rank: 2 }
    const dear = {
      ...priced,
      id: "maker/dear",
      usdPer1M: { input: 9, output: 9 },
      rank: 1,
    }
    const unscored = {
      ...priced,
      id: "maker/unscored",
      score: null,
      boards: [],
      rank: 3,
    }
    expect(
      defaultModelOf(routerChatTable.parse(tableWith([dear, cheap, unscored])))
    ).toBe("maker/cheap")
  })

  it("refuses a chosen model the table does not list", () => {
    expect(isRouterChatModel(defaultChatModel)).toBe(true)
    expect(isRouterChatModel("anthropic/claude-sonnet-5")).toBe(true)
    expect(isRouterChatModel("maker/none")).toBe(false)
  })

  it("sends the chosen effort when the model offers it, else the model's opening effort, and none for a model without a choice", () => {
    const model = modelOf(defaultChatModel)
    expect(model.efforts).toEqual(["max", "high", "low", "none"])
    expect(turnEffortOf(defaultChatModel, "low")).toBe("low")
    expect(turnEffortOf(defaultChatModel, undefined)).toBe("high")
    expect(turnEffortOf(defaultChatModel, "medium")).toBe("high")
    const single = routerChatData.models.find((one) => one.efforts.length < 2)
    expect(turnEffortOf(single?.id ?? "", "high")).toBeNull()
    expect(turnEffortOf("maker/none", "high")).toBeNull()
  })
})
