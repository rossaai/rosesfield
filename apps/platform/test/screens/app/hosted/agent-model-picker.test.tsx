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

  it("puts the chosen model under Featured, then every model in a group of its lab, each headed by its mark", () => {
    render(
      <AgentModelPicker
        models={models}
        chosen="deepseek/deepseek-v4-flash"
        onChoose={() => undefined}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /Model/ }))
    const groups = screen
      .getAllByRole("group")
      .map((group) => group.getAttribute("aria-label"))
    expect(groups).toEqual([
      "Featured",
      "Anthropic",
      "DeepSeek",
      "OpenAI",
      "Z.ai",
    ])
    const heading = screen
      .getByRole("group", { name: "DeepSeek" })
      .querySelector(
        "[data-slot='model-section-heading'] [data-slot='lab-mark']"
      )
    expect(heading?.getAttribute("data-mark")).toBe("deepseek")
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
