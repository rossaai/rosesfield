import { cleanup, fireEvent, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { useDraft } from "@/pieces/use-draft"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { renderAgent } from "./agent-screen-render"

type Calls = { sent: number; stopped: number }

function Harness({
  calls,
  isAnswering,
}: {
  calls: Calls
  isAnswering: boolean
}): ReactElement {
  const state = useDraft()
  return (
    <AgentComposer
      state={state}
      isAnswering={isAnswering}
      onSend={() => {
        calls.sent += 1
      }}
      onStop={() => {
        calls.stopped += 1
      }}
    />
  )
}

function renderComposer(isAnswering = false): Calls {
  const calls: Calls = { sent: 0, stopped: 0 }
  renderAgent(() => <Harness calls={calls} isAnswering={isAnswering} />)
  return calls
}

async function field(): Promise<HTMLElement> {
  return screen.findByRole("textbox", { name: t("agent.prompt.label") })
}

function classesOf(element: Element | null | undefined): string[] {
  return element?.getAttribute("class")?.split(" ") ?? []
}

function isBefore(one: Node | undefined, two: Node | undefined): boolean {
  if (one === undefined || two === undefined) {
    return false
  }
  return (
    (one.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  )
}

const modelName = `${t("model.picker.title")} DeepSeek V4 Flash`

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the agent composer", () => {
  it("is the apps' prompt bar, with the attach, the character and the model chip in its toolbar and Send in Generate's place", async () => {
    renderComposer()
    await field()
    const bars = document.querySelectorAll('[data-slot="composer"]')
    expect(bars).toHaveLength(1)
    expect(bars[0]?.getAttribute("data-bar")).toBe("prompt")
    const toolbar = document.querySelector('[data-slot="composer-toolbar"]')
    const order = [t("bar.attach"), t("bar.mention"), modelName].map((name) =>
      screen.getByRole("button", { name })
    )
    for (const button of order) {
      expect(toolbar?.contains(button)).toBe(true)
    }
    const [attach, mention, chip] = order
    expect(isBefore(attach, mention)).toBe(true)
    expect(isBefore(mention, chip)).toBe(true)
    for (const circle of [attach, mention]) {
      expect(classesOf(circle)).toContain("size-icon-dense")
      expect(classesOf(circle)).not.toContain("bg-(--well)")
    }
    const send = screen.getByRole("button", { name: t("agent.send") })
    expect(send.getAttribute("data-slot")).toBe("generate-button")
    expect(send.getAttribute("data-form")).toBe("tile")
    expect(toolbar?.contains(send)).toBe(false)
  })

  it("carries no hand: Ask before each run is not a control of the composer", async () => {
    renderComposer()
    await field()
    expect(
      screen.queryByRole("button", { name: t("agent.ask.label") })
    ).toBeNull()
    expect(screen.queryByText(t("agent.ask.label"))).toBeNull()
  })

  it("starts its text on the line of its first button: the toolbar takes the field's own side inset", async () => {
    renderComposer()
    const prompt = await field()
    const toolbar = document.querySelector('[data-slot="composer-toolbar"]')
    expect(classesOf(prompt)).toContain("px-s2")
    expect(classesOf(toolbar)).toContain("ps-s2")
  })

  it("opens the agent's model picker from the chip, with the chosen model featured", async () => {
    renderComposer()
    await field()
    fireEvent.click(screen.getByRole("button", { name: modelName }))
    expect(await screen.findByText(t("model.picker.featured"))).not.toBeNull()
  })

  it("sends only once the field holds words, on a press and on Enter", async () => {
    const calls = renderComposer()
    const prompt = await field()
    const send = screen.getByRole("button", { name: t("agent.send") })
    fireEvent.click(send)
    fireEvent.keyDown(prompt, { key: "Enter" })
    expect(calls.sent).toBe(0)
    fireEvent.change(prompt, { target: { value: "A red bicycle" } })
    fireEvent.click(send)
    fireEvent.keyDown(prompt, { key: "Enter" })
    expect(calls.sent).toBe(2)
  })

  it("turns Send into Stop in the same place while the agent answers, and Enter sends nothing", async () => {
    const calls = renderComposer(true)
    const prompt = await field()
    expect(screen.queryByRole("button", { name: t("agent.send") })).toBeNull()
    const stop = screen.getByRole("button", { name: t("agent.stop") })
    expect(stop.getAttribute("data-slot")).toBe("generate-button")
    expect(stop.getAttribute("data-form")).toBe("tile")
    fireEvent.change(prompt, { target: { value: "A red bicycle" } })
    fireEvent.keyDown(prompt, { key: "Enter" })
    fireEvent.click(stop)
    expect(calls.stopped).toBe(1)
    expect(calls.sent).toBe(0)
  })
})
