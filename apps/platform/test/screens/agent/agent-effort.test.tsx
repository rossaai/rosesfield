import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AgentModels } from "@/api/agent-wire"
import { t } from "@/copy/t"
import { useDraft } from "@/pieces/use-draft"
import { AgentComposer } from "@/screens/agent/agent-composer"
import {
  effortOf,
  keepEffort,
  readKeptEfforts,
  useEffortOf,
} from "@/screens/agent/agent-effort"
import { agentModelsQuery } from "@/screens/agent/agent-model"
import { agentDetailOf } from "./agent-details"
import { agentModels, conversations, renderAgent } from "./agent-screen-render"

const tuned = "deepseek/deepseek-v4.1-flash-1017"
const other = "anthropic/claude-opus-5.5"
const fixed = "openai/gpt-5.2-chat"
const plain = "z-ai/glm-5.3"

const listed: AgentModels = {
  ...agentModels,
  models: [tuned, other, fixed, plain],
  model: tuned,
  details: {
    [tuned]: agentDetailOf({
      name: "DeepSeek V4.1 Flash 1017",
      effort: "high",
      efforts: [
        { effort: "max", turn: 0.1 },
        { effort: "high", turn: 0.09 },
        { effort: "low", turn: 0.07 },
        { effort: "none", turn: 0.06 },
      ],
    }),
    [other]: agentDetailOf({
      name: "Claude Opus 5.5",
      effort: "xhigh",
      efforts: [
        { effort: "max", turn: 12 },
        { effort: "xhigh", turn: 8 },
        { effort: "medium", turn: 4 },
      ],
    }),
    [fixed]: agentDetailOf({
      name: "GPT-5.2 Chat",
      effort: "high",
      efforts: [{ effort: "high", turn: 2 }],
    }),
    [plain]: agentDetailOf({ name: "GLM-5.3", effort: null, efforts: [] }),
  },
}

function Composer(): ReactElement {
  const state = useDraft()
  return (
    <AgentComposer
      state={state}
      isAnswering={false}
      onSend={() => undefined}
      onStop={() => undefined}
    />
  )
}

function effortChip(): HTMLElement | null {
  return screen.queryByRole("combobox", { name: t("agent.effort.label") })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("the agent composer's Effort", () => {
  it("sits beside the model chip and the run mode, with its gauge, opening on the table's effort", async () => {
    renderAgent(() => <Composer />, "/agent", undefined, listed)
    const chip = await waitFor(() => {
      const found = effortChip()
      if (found === null) {
        throw new Error("No Effort chip")
      }
      return found
    })
    expect(chip.textContent).toContain(t("agent.effort.high"))
    expect(chip.querySelector("svg")?.getAttribute("class")).toContain(
      "lucide-gauge"
    )
    const model = screen.getByRole("button", {
      name: `${t("model.picker.title")} DeepSeek V4.1 Flash 1017`,
    })
    const mode = screen.getByRole("combobox", { name: t("agent.mode.label") })
    const order = [model, chip, mode].map((one) =>
      [...document.querySelectorAll("button, [role='combobox']")].indexOf(one)
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it("on a phone shows Effort and the run mode as their icons alone, named by their labels, and gives the model chip the room left", async () => {
    renderAgent(() => <Composer />, "/agent", undefined, listed)
    const effort = await waitFor(() => {
      const found = effortChip()
      if (found === null) {
        throw new Error("No Effort chip")
      }
      return found
    })
    const mode = screen.getByRole("combobox", { name: t("agent.mode.label") })
    const row = document.querySelector("[data-slot='chip-row']")
    for (const chip of [effort, mode]) {
      expect(row?.contains(chip)).toBe(true)
      expect(chip.getAttribute("data-compact")).toBe("icon")
      expect(
        chip.querySelector("[data-slot='select-value']")?.className.split(" ")
      ).toContain("@max-regular:hidden")
    }
    const chips = row?.querySelectorAll("[data-slot='chip-select']") ?? []
    expect([...chips].map((chip) => chip.getAttribute("data-compact"))).toEqual(
      ["icon", "icon"]
    )
    const model = screen.getByRole("button", {
      name: `${t("model.picker.title")} DeepSeek V4.1 Flash 1017`,
    })
    expect(row?.contains(model)).toBe(true)
    expect(model.className.split(" ")).toContain(
      "@max-regular:in-data-[density=composer]:shrink"
    )
  })

  it("lists the levels the model offers and keeps the one you choose for that model", async () => {
    renderAgent(() => <Composer />, "/agent", undefined, listed)
    const chip = await waitFor(() => {
      const found = effortChip()
      if (found === null) {
        throw new Error("No Effort chip")
      }
      return found
    })
    fireEvent.click(chip)
    const options = await screen.findAllByRole("option")
    expect(options.map((one) => one.textContent)).toEqual([
      `${t("agent.effort.max")}${t("run.price.estimated", { amount: "0.1" })}`,
      `${t("agent.effort.high")}${t("run.price.estimated", { amount: "0.09" })}`,
      `${t("agent.effort.low")}${t("run.price.estimated", { amount: "0.07" })}`,
      `${t("agent.effort.none")}${t("run.price.estimated", { amount: "0.06" })}`,
    ])
    const low = options[2]
    if (low === undefined) {
      throw new Error("The effort lists no Low")
    }
    fireEvent.pointerDown(low, { pointerType: "mouse" })
    fireEvent.click(low)
    expect(readKeptEfforts()).toEqual({ [tuned]: "low" })
    await waitFor(() =>
      expect(effortChip()?.textContent).toContain(t("agent.effort.low"))
    )
  })

  it("shows no Effort for a model that offers one level or none", async () => {
    for (const model of [fixed, plain]) {
      renderAgent(() => <Composer />, "/agent", undefined, {
        ...listed,
        model,
      })
      await screen.findByRole("combobox", { name: t("agent.mode.label") })
      expect(effortChip()).toBeNull()
      cleanup()
    }
  })

  it("resets to the new model's opening effort when the model changes, and keeps each model's own choice", async () => {
    keepEffort(tuned, "low")
    const client = renderAgent(() => <Composer />, "/agent", undefined, listed)
    await waitFor(() =>
      expect(effortChip()?.textContent).toContain(t("agent.effort.low"))
    )
    act(() => {
      client.setQueryData(agentModelsQuery.queryKey, {
        ...listed,
        model: other,
      })
    })
    await waitFor(() =>
      expect(effortChip()?.textContent).toContain(t("agent.effort.xhigh"))
    )
    act(() => {
      client.setQueryData(agentModelsQuery.queryKey, listed)
    })
    await waitFor(() =>
      expect(effortChip()?.textContent).toContain(t("agent.effort.low"))
    )
  })

  it("opens on the table's effort for an effort kept that the model does not offer, and reads each model's own kept effort", () => {
    const detail = listed.details[other]
    if (detail === undefined) {
      throw new Error("No Opus")
    }
    expect(effortOf(other, detail, { [other]: "low" })).toBe("xhigh")
    expect(effortOf(other, detail, { [tuned]: "low", [other]: "medium" })).toBe(
      "medium"
    )
  })

  it("keeps the conversation's effort the one the composer shows", async () => {
    const sent: unknown[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      sent.push(JSON.parse(String(init?.body)))
      return Response.json({
        conversation: { ...conversations[0], effort: "low" },
      })
    })
    keepEffort(tuned, "low")
    const conversationId = conversations[0]?.id ?? ""
    function Held(): null {
      useEffortOf(conversationId, "max", true)
      return null
    }
    renderAgent(() => <Held />, "/agent", undefined, listed)
    await waitFor(() => expect(sent).toEqual([{ effort: "low" }]))
  })
})
