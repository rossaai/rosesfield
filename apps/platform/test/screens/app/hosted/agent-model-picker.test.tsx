import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  AgentModelPicker,
  type AgentRates,
  agentLabOf,
  agentRowsOf,
} from "@/screens/app/hosted/agent-model-picker"

afterEach(cleanup)

const models = [
  "deepseek/deepseek-v4-flash",
  "anthropic/claude-sonnet-5",
  "openai/gpt-5.6-luna",
  "z-ai/glm-4.6",
]

const rates: AgentRates = {
  "anthropic/claude-sonnet-5": { input: 603.46, output: 3017.3, turn: 1.84 },
  "deepseek/deepseek-v4-flash": { input: 19.2, output: 38.4, turn: 0.05 },
}

function open(
  change: Partial<Parameters<typeof AgentModelPicker>[0]> = {}
): void {
  render(
    <AgentModelPicker
      models={models}
      chosen="deepseek/deepseek-v4-flash"
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

describe("the agent's model picker", () => {
  it("names each chat model's lab from the catalog's facts, and the maker for a model it holds no row for", () => {
    expect(agentLabOf("deepseek/deepseek-v4-flash")).toBe("DeepSeek")
    expect(agentLabOf("z-ai/glm-4.6")).toBe("Z.ai")
    expect(agentLabOf("openrouter/new-model")).toBe("OpenRouter")
  })

  it("orders the models by the chat boards' rank and shows the rank on each lab's mark", () => {
    open()
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual([
      "anthropic/claude-sonnet-5",
      "openai/gpt-5.6-luna",
      "deepseek/deepseek-v4-flash",
      "z-ai/glm-4.6",
    ])
    const sonnet = rowOf("anthropic/claude-sonnet-5")
    expect(
      sonnet
        ?.querySelector("[data-slot='model-row-mark'] [data-slot='lab-mark']")
        ?.getAttribute("data-mark")
    ).toBe("anthropic")
    const rank = sonnet?.querySelector("[data-slot='model-row-rank']")
    expect(rank?.textContent).toBe("2")
    expect(rank?.getAttribute("data-tone")).toBe("silver")
  })

  it("shows a model's credits per million tokens in and out in its caption, and a typical turn's credits as an estimate at its end", () => {
    open({ rates })
    const sonnet = rowOf("anthropic/claude-sonnet-5")
    expect(
      [
        ...(sonnet?.querySelectorAll("[data-slot='model-row-capability']") ??
          []),
      ].map((one) => one.textContent)
    ).toEqual(["603 per 1M in", "3,017 per 1M out"])
    expect(
      sonnet?.querySelector("[data-slot='credit-price']")?.textContent
    ).toBe("2")
    expect(
      screen.getByRole("option", {
        name: `Claude Sonnet 5, ${t("run.price.estimated", { amount: "2" })}`,
      })
    ).toBeTruthy()
    expect(
      rowOf("deepseek/deepseek-v4-flash")?.querySelector(
        "[data-slot='credit-price']"
      )?.textContent
    ).toBe("<1")
    const glm = rowOf("z-ai/glm-4.6")
    expect(glm?.textContent).not.toContain("per 1M")
    expect(
      glm
        ?.querySelector("[data-slot='model-row-price']")
        ?.getAttribute("data-state")
    ).toBe("none")
  })

  it("prices the rows from the typical turn, so a cheaper turn sorts first on Price, Low to high", () => {
    const rows = agentRowsOf(models, rates)
    expect(
      rows.find((row) => row.id === "anthropic/claude-sonnet-5")?.price
    ).toMatchObject({ credits: 1.84 })
    expect(rows.find((row) => row.id === "z-ai/glm-4.6")?.price).toBeUndefined()
  })

  it("lists your recent models on top in the order given, and every model below", () => {
    open({ recent: ["z-ai/glm-4.6", "deepseek/deepseek-v4-flash"] })
    const recent = screen
      .getAllByRole("option")
      .filter(
        (one) =>
          one.closest("[data-section]")?.getAttribute("data-section") ===
          "recent"
      )
      .map((one) => one.dataset.model)
    expect(recent).toEqual(["z-ai/glm-4.6", "deepseek/deepseek-v4-flash"])
    expect(screen.getAllByRole("option")).toHaveLength(6)
  })

  it("chooses the model you press, the control", () => {
    const onChoose = vi.fn()
    open({ onChoose })
    const glm = screen
      .getAllByRole("option")
      .find((one) => one.dataset.model === "z-ai/glm-4.6")
    if (glm !== undefined) {
      fireEvent.click(glm)
    }
    expect(onChoose).toHaveBeenCalledWith("z-ai/glm-4.6")
  })
})
