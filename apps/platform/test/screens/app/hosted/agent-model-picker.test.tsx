import { isMatch, searchedRowsOf } from "@rosesfield/ui/lib/model-sections"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatEstimate } from "@/copy/format"
import { t } from "@/copy/t"
import { keepEffort } from "@/screens/agent/agent-effort"
import {
  type AgentDetails,
  AgentModelPicker,
  agentLabOf,
  agentRowsOf,
  turnPriceOf,
} from "@/screens/app/hosted/agent-model-picker"
import { agentDetailOf } from "../../agent/agent-details"

afterEach(cleanup)

beforeEach(() => {
  window.localStorage.clear()
})

const models = [
  "anthropic/claude-opus-5.5",
  "moonshotai/kimi-k3.1-pro",
  "deepseek/deepseek-v4.1-flash-1017",
  "z-ai/glm-5.3",
]

const details: AgentDetails = {
  "anthropic/claude-opus-5.5": agentDetailOf({
    name: "Claude Opus 5.5",
    lab: "anthropic",
    rank: 1,
    order: 1,
    bestValue: true,
    context: 1_000_000,
    inputs: ["image", "file"],
    reasons: true,
    input: 844,
    output: 4220,
    turn: 12.3,
    effort: "max",
    efforts: [
      { effort: "max", turn: 12.3 },
      { effort: "low", turn: 1.43 },
    ],
  }),
  "moonshotai/kimi-k3.1-pro": agentDetailOf({
    name: "Kimi K3.1 Pro",
    lab: "moonshotai",
    rank: 2,
    order: 2,
    context: 1_048_576,
    inputs: ["image", "video"],
    reasons: true,
    turn: 0.08,
  }),
  "deepseek/deepseek-v4.1-flash-1017": agentDetailOf({
    name: "DeepSeek V4.1 Flash 1017",
    lab: "deepseek",
    rank: 16,
    order: 3,
    context: 1_048_576,
    turn: 0.1029,
  }),
  "z-ai/glm-5.3": agentDetailOf({
    name: "GLM-5.3",
    lab: "z-ai",
    rank: null,
    order: 4,
    context: 262_144,
    turn: 0,
  }),
}

function open(
  change: Partial<Parameters<typeof AgentModelPicker>[0]> = {}
): void {
  render(
    <AgentModelPicker
      models={models}
      details={details}
      chosen="deepseek/deepseek-v4.1-flash-1017"
      onChoose={() => undefined}
      {...change}
    />
  )
  fireEvent.click(screen.getByRole("button", { name: /Model/ }))
}

function rowOf(model: string, section = "all"): Element | null | undefined {
  return screen
    .getAllByRole("option")
    .find(
      (one) =>
        one.dataset.model === model &&
        one.closest("[data-section]")?.getAttribute("data-section") === section
    )
    ?.closest("[data-slot='model-row']")
}

function captionOf(row: Element | null | undefined): (string | null)[] {
  return [
    ...(row?.querySelectorAll("[data-slot='model-row-capability']") ?? []),
  ].map((one) => one.getAttribute("aria-label") ?? one.textContent)
}

function glyphsOf(row: Element | null | undefined): string[] {
  return [
    ...(row?.querySelectorAll("[data-slot='model-row-capability'] svg") ?? []),
  ].map((one) => one.getAttribute("class") ?? "")
}

describe("the agent's model picker", () => {
  it("names each chat model's lab from the catalog's facts, else from the table's lab", () => {
    expect(agentLabOf("deepseek/deepseek-v4-flash")).toBe("DeepSeek")
    expect(agentLabOf("z-ai/glm-4.6")).toBe("Z.ai")
    expect(agentLabOf("openrouter/new-model")).toBe("OpenRouter")
    expect(agentLabOf("maker/model", "openai")).toBe("OpenAI")
  })

  it("orders the models by the table's rank by intelligence and shows the rank on each lab's mark", () => {
    open({ models: [...models].reverse() })
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual(models)
    const opus = rowOf("anthropic/claude-opus-5.5")
    expect(
      opus?.querySelector("[data-slot='model-row-rank']")?.textContent
    ).toBe("1")
    expect(
      rowOf("deepseek/deepseek-v4.1-flash-1017")?.querySelector(
        "[data-slot='model-row-rank']"
      )?.textContent
    ).toBe("16")
    expect(
      rowOf("z-ai/glm-5.3")?.querySelector("[data-slot='model-row-rank']")
    ).toBeNull()
  })

  it("holds only what the model can do under its name: its context, whether it reasons and each input it takes", () => {
    open()
    const opus = rowOf("anthropic/claude-opus-5.5")
    expect(captionOf(opus)).toEqual([
      t("agent.model.context", { size: "1M" }),
      t("agent.model.reasons"),
      t("shell.area.image"),
      t("agent.model.input.file"),
    ])
    expect(opus?.textContent).not.toContain("per 1M")
    expect(captionOf(rowOf("z-ai/glm-5.3"))).toEqual([
      t("agent.model.context", { size: "256K" }),
    ])
  })

  it("shows the video capability with the library's video glyph for a model that takes video, and no input for a text-only model", () => {
    open()
    const kimi = rowOf("moonshotai/kimi-k3.1-pro")
    expect(captionOf(kimi)).toContain(t("shell.area.video"))
    expect(glyphsOf(kimi)).toContainEqual(
      expect.stringContaining("lucide-video")
    )
    const textOnly = rowOf("deepseek/deepseek-v4.1-flash-1017")
    expect(captionOf(textOnly)).toEqual([
      t("agent.model.context", { size: "1M" }),
    ])
    expect(glyphsOf(textOnly)).toEqual([])
  })

  it("marks Best value beside the name of a model on the Pareto line, and on no other", () => {
    open()
    const badge = (model: string): string | null | undefined =>
      rowOf(model)?.querySelector("[data-slot='model-row-badges']")?.textContent
    expect(badge("anthropic/claude-opus-5.5")).toBe(t("model.picker.bestValue"))
    expect(badge("moonshotai/kimi-k3.1-pro")).toBeUndefined()
  })

  it("ends each row with a turn's credits as an estimate, and names the credits per 1M tokens in and out on hover", () => {
    open()
    const opus = rowOf("anthropic/claude-opus-5.5")
    expect(opus?.querySelector("[data-slot='credit-price']")?.textContent).toBe(
      "12"
    )
    const note = opus?.querySelector("[data-slot='model-row-price-note']")
    const hover = `${t("agent.model.rate.in", { credits: "844" })}, ${t(
      "agent.model.rate.out",
      { credits: "4,220" }
    )}`
    expect(note?.getAttribute("aria-label")).toBe(
      `${t("run.price.estimated", { amount: "12" })}. ${hover}`
    )
    expect(
      rowOf("moonshotai/kimi-k3.1-pro")?.querySelector(
        "[data-slot='credit-price']"
      )?.textContent
    ).toBe("0.08")
    expect(
      rowOf("deepseek/deepseek-v4.1-flash-1017")?.querySelector(
        "[data-slot='credit-price']"
      )?.textContent
    ).toBe("0.1")
    expect(
      rowOf("z-ai/glm-5.3")
        ?.querySelector("[data-slot='model-row-price']")
        ?.getAttribute("data-state")
    ).toBe("none")
  })

  it("writes a turn with two significant figures under 1, one decimal under 10 and none from 10, never as <1", () => {
    expect(formatEstimate(0.08)).toBe("0.08")
    expect(formatEstimate(0.0834)).toBe("0.083")
    expect(formatEstimate(1.43)).toBe("1.4")
    expect(formatEstimate(12.3)).toBe("12")
    const opus = details["anthropic/claude-opus-5.5"]
    if (opus === undefined) {
      throw new Error("The details hold no Opus")
    }
    expect(turnPriceOf(opus, "low")).toMatchObject({
      amount: "1.4",
      credits: 1.43,
    })
  })

  it("prices a row at the effort you kept for its model", () => {
    const before = agentRowsOf(models, details)
    expect(
      before.find((row) => row.id === "anthropic/claude-opus-5.5")?.price
        ?.amount
    ).toBe("12")
    open()
    act(() => keepEffort("anthropic/claude-opus-5.5", "low"))
    expect(
      rowOf("anthropic/claude-opus-5.5")?.querySelector(
        "[data-slot='credit-price']"
      )?.textContent
    ).toBe("1.4")
  })

  it("lists your recent models on top in the order given, and every model below", () => {
    open({ recent: ["z-ai/glm-5.3", "anthropic/claude-opus-5.5"] })
    const recent = screen
      .getAllByRole("option")
      .filter(
        (one) =>
          one.closest("[data-section]")?.getAttribute("data-section") ===
          "recent"
      )
      .map((one) => one.dataset.model)
    expect(recent).toEqual(["z-ai/glm-5.3", "anthropic/claude-opus-5.5"])
    expect(screen.getAllByRole("option")).toHaveLength(6)
  })

  it("chooses the model you press, the control", () => {
    const onChoose = vi.fn()
    open({ onChoose })
    const glm = screen
      .getAllByRole("option")
      .find((one) => one.dataset.model === "z-ai/glm-5.3")
    if (glm !== undefined) {
      fireEvent.click(glm)
    }
    expect(onChoose).toHaveBeenCalledWith("z-ai/glm-5.3")
  })
})

describe("search over the agent's 274 models", () => {
  const many = Array.from({ length: 274 }, (_, index) => `maker/model-${index}`)
  const manyDetails: AgentDetails = Object.fromEntries(
    many.map((model, index) => [
      model,
      agentDetailOf({
        name: `Model ${index}`,
        rank: index + 1,
        order: index + 1,
        inputs: index % 2 === 0 ? ["image", "video"] : [],
        reasons: index % 3 === 0,
        turn: 0.1 + index,
      }),
    ])
  )

  it("matches a key press over every row within 16 ms", () => {
    const rows = agentRowsOf(many, manyDetails)
    expect(rows).toHaveLength(274)
    const searched = searchedRowsOf(rows)
    const needles = ["m", "mo", "mod", "mode", "model", "model 9", "model 99"]
    const times = needles.map((needle) => {
      const start = performance.now()
      const shown = searched.filter(({ text }) => isMatch(text, needle))
      const took = performance.now() - start
      expect(shown.length).toBeGreaterThan(0)
      return took
    })
    expect(Math.max(...times)).toBeLessThan(16)
  })
})
