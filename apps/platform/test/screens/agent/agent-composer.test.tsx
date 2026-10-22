import { cleanup, fireEvent, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RunApproval } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { useDraft } from "@/pieces/use-draft"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { renderAgent } from "./agent-screen-render"

type Calls = { sent: number; stopped: number; approvals: RunApproval[] }

function Harness({
  calls,
  approval,
  isAnswering,
}: {
  calls: Calls
  approval: RunApproval
  isAnswering: boolean
}): ReactElement {
  const state = useDraft()
  return (
    <AgentComposer
      state={state}
      isAnswering={isAnswering}
      approval={approval}
      onApprovalChange={(next) => calls.approvals.push(next)}
      onSend={() => {
        calls.sent += 1
      }}
      onStop={() => {
        calls.stopped += 1
      }}
    />
  )
}

function renderComposer(
  approval: RunApproval = "ask",
  isAnswering = false
): Calls {
  const calls: Calls = { sent: 0, stopped: 0, approvals: [] }
  renderAgent(() => (
    <Harness calls={calls} approval={approval} isAnswering={isAnswering} />
  ))
  return calls
}

async function field(): Promise<HTMLElement> {
  return screen.findByRole("textbox", { name: t("agent.prompt.label") })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the agent composer", () => {
  it("draws one well with every button a circle of one size and the model as a pill", async () => {
    renderComposer()
    await field()
    const well = document.querySelector('[data-slot="agent-composer"]')
    expect(well?.className).toContain("rounded-vessel")
    expect(well?.className).toContain("bg-surface")
    const circles = [
      t("bar.attach"),
      t("bar.mention"),
      t("agent.ask.label"),
      t("agent.send"),
    ].map((name) => screen.getByRole("button", { name }))
    for (const circle of circles) {
      expect(circle.className).toContain("size-icon-dense")
      expect(circle.className).toContain("rounded-full")
    }
    const chip = screen.getByRole("button", {
      name: `${t("model.picker.title")} Deepseek V4 Flash`,
    })
    expect(chip.className).toContain("rounded-full")
    expect(chip.className).not.toContain("rounded-dense")
  })

  it("draws no focus ring around the field and sets its text on the well's text line", async () => {
    renderComposer()
    const prompt = await field()
    expect(prompt.className).toContain("outline-none")
    expect(prompt.className).toContain("px-s2")
    expect(prompt.className).not.toMatch(/focus-visible:outline-\(/)
    expect(prompt.parentElement?.className ?? "").not.toMatch(/outline/)
  })

  it("shows Ask before each run as a pressed circle that switches off and on", async () => {
    const calls = renderComposer("ask")
    await field()
    const ask = screen.getByRole("button", { name: t("agent.ask.label") })
    expect(ask.getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(ask)
    expect(calls.approvals).toEqual(["auto"])
  })

  it("shows Ask before each run unpressed when runs go without asking", async () => {
    const calls = renderComposer("auto")
    await field()
    const ask = screen.getByRole("button", { name: t("agent.ask.label") })
    expect(ask.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(ask)
    expect(calls.approvals).toEqual(["ask"])
  })

  it("keeps Send off until the field holds words, then sends on a press and on Enter", async () => {
    const calls = renderComposer()
    const prompt = await field()
    const send = screen.getByRole("button", { name: t("agent.send") })
    expect(send).toHaveProperty("disabled", true)
    fireEvent.keyDown(prompt, { key: "Enter" })
    expect(calls.sent).toBe(0)
    fireEvent.change(prompt, { target: { value: "A red bicycle" } })
    expect(send).toHaveProperty("disabled", false)
    fireEvent.click(send)
    fireEvent.keyDown(prompt, { key: "Enter" })
    expect(calls.sent).toBe(2)
  })

  it("turns Send into Stop while the agent answers", async () => {
    const calls = renderComposer("ask", true)
    await field()
    expect(screen.queryByRole("button", { name: t("agent.send") })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: t("agent.stop") }))
    expect(calls.stopped).toBe(1)
  })
})
