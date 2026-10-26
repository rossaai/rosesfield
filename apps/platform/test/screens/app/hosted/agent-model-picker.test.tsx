import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AgentModelPicker,
  agentLabOf,
  agentPickerSections,
} from "@/screens/app/hosted/agent-model-picker"

afterEach(cleanup)

const models = [
  "deepseek/deepseek-v4-flash",
  "anthropic/claude-sonnet-5",
  "openai/gpt-5.6-luna",
  "z-ai/glm-4.6",
]

describe("the agent's model picker", () => {
  it("names each chat model's lab from the catalog's facts, and the maker for a model it holds no row for", () => {
    expect(agentLabOf("deepseek/deepseek-v4-flash")).toBe("DeepSeek")
    expect(agentLabOf("z-ai/glm-4.6")).toBe("Z.ai")
    expect(agentLabOf("openrouter/new-model")).toBe("OpenRouter")
  })

  it("lists the chosen model first, then every other model once, each with its lab's mark", () => {
    render(
      <AgentModelPicker
        models={models}
        chosen="deepseek/deepseek-v4-flash"
        onChoose={() => undefined}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    expect(screen.queryAllByRole("group")).toEqual([])
    expect(
      screen.getAllByRole("option").map((one) => one.dataset.model)
    ).toEqual(models)
    const mark = screen
      .getAllByRole("option")
      .find((one) => one.dataset.model === "anthropic/claude-sonnet-5")
      ?.closest("[data-slot='model-row']")
      ?.querySelector("[data-slot='model-row-mark'] [data-slot='lab-mark']")
    expect(mark?.getAttribute("data-mark")).toBe("anthropic")
  })

  it("shows a model's credits per million tokens in and out from the rate card, and nothing on a row the card holds no rate for", () => {
    render(
      <AgentModelPicker
        models={models}
        rates={{
          "anthropic/claude-sonnet-5": { input: 603.46, output: 3017.3 },
        }}
        chosen="deepseek/deepseek-v4-flash"
        onChoose={() => undefined}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    const rowOf = (model: string): Element | null | undefined =>
      screen
        .getAllByRole("option")
        .find((one) => one.dataset.model === model)
        ?.closest("[data-slot='model-row']")
    const prices = rowOf("anthropic/claude-sonnet-5")?.querySelectorAll(
      "[data-slot='model-row-capability']"
    )
    expect([...(prices ?? [])].map((one) => one.textContent)).toEqual([
      "603 per 1M in",
      "3,017 per 1M out",
    ])
    expect(rowOf("z-ai/glm-4.6")?.textContent).not.toContain("per 1M")
    expect(document.body.textContent).not.toMatch(/unknown/i)
  })

  it("shows no price on a row, since no price for a chat model is known", () => {
    render(
      <AgentModelPicker
        models={models}
        chosen="deepseek/deepseek-v4-flash"
        onChoose={() => undefined}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    expect(document.querySelector("[data-slot='credit-price']")).toBeNull()
    expect(document.body.textContent).not.toMatch(/unknown/i)
  })

  it("chooses the model you press, the control", () => {
    const onChoose = vi.fn()
    const sections = agentPickerSections(models, null)
    expect(sections.map((section) => section.id)).toEqual(["all"])
    render(
      <AgentModelPicker
        models={models}
        chosen="deepseek/deepseek-v4-flash"
        onChoose={onChoose}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    const [glm] = screen
      .getAllByRole("option")
      .filter((one) => one.dataset.model === "z-ai/glm-4.6")
    if (glm !== undefined) {
      fireEvent.click(glm)
    }
    expect(onChoose).toHaveBeenCalledWith("z-ai/glm-4.6")
  })
})
