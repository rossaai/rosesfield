import { autoRunLimitCredits } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { MentionPicker } from "@/pieces/character-picker"
import { useDraft } from "@/pieces/use-draft"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { readRunApproval } from "@/screens/agent/run-approval"
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

function runMode(): HTMLElement {
  return screen.getByRole("combobox", { name: t("agent.mode.label") })
}

function iconOf(element: Element | null | undefined): string {
  return element?.querySelector("svg")?.getAttribute("class") ?? ""
}

function leadOf(trigger: HTMLElement): string {
  return iconOf(trigger.querySelector("[data-slot='select-lead']"))
}

function renderBarButtons(): HTMLElement {
  const { container } = render(
    <TooltipProvider>
      <AttachMenu
        form="menu"
        label={t("bar.attach")}
        onUpload={() => undefined}
        onFromLibrary={() => undefined}
      />
      <MentionPicker
        open={false}
        onOpenChange={() => undefined}
        onPick={() => undefined}
      />
    </TooltipProvider>
  )
  return container
}

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
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
    }
    const send = screen.getByRole("button", { name: t("agent.send") })
    expect(send.getAttribute("data-slot")).toBe("generate-button")
    expect(send.getAttribute("data-form")).toBe("tile")
    expect(toolbar?.contains(send)).toBe(false)
  })

  it("draws its + and @ exactly as the same buttons in an app's bar", async () => {
    renderComposer()
    await field()
    const toolbar = document.querySelector<HTMLElement>(
      '[data-slot="composer-toolbar"]'
    )
    if (toolbar === null) {
      throw new Error("The composer holds no toolbar")
    }
    const bar = within(renderBarButtons())
    for (const name of [t("bar.attach"), t("bar.mention")]) {
      const composed = within(toolbar).getByRole("button", { name })
      const barred = bar.getByRole("button", { name })
      expect(classesOf(composed).sort()).toEqual(classesOf(barred).sort())
      expect(classesOf(composed)).toContain("bg-(--well)")
    }
  })

  it("holds the run mode beside the model chip, opening on Auto with its sparkles", async () => {
    renderComposer()
    await field()
    const toolbar = document.querySelector('[data-slot="composer-toolbar"]')
    const model = screen.getByRole("button", { name: modelName })
    const mode = runMode()
    expect(toolbar?.contains(mode)).toBe(true)
    expect(isBefore(model, mode)).toBe(true)
    expect(mode.textContent).toContain(t("agent.mode.auto"))
    expect(leadOf(mode)).toContain("lucide-sparkles")
    expect(document.querySelector(".lucide-hand")).toBeNull()
  })

  it("lists Auto and Manual with their icons and descriptions, and keeps Manual as ask once you choose it", async () => {
    renderComposer()
    await field()
    fireEvent.click(runMode())
    const options = await screen.findAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual([
      `${t("agent.mode.auto")}${t("agent.mode.auto.description", {
        credits: formatAmount(autoRunLimitCredits),
      })}`,
      `${t("agent.mode.manual")}${t("agent.mode.manual.description")}`,
    ])
    expect(
      options.map((option) =>
        iconOf(option.querySelector("[data-slot='select-item-icon']"))
      )
    ).toEqual([
      expect.stringContaining("lucide-sparkles"),
      expect.stringContaining("lucide-user-check"),
    ])
    const manual = options[1]
    if (manual === undefined) {
      throw new Error("The run mode lists no Manual")
    }
    fireEvent.pointerDown(manual, { pointerType: "mouse" })
    fireEvent.click(manual)
    expect(readRunApproval()).toBe("ask")
    await waitFor(() =>
      expect(runMode().textContent).toContain(t("agent.mode.manual"))
    )
    expect(leadOf(runMode())).toContain("lucide-user-check")
  })

  it("starts its text on the line of its first button: the toolbar takes the field's own side inset", async () => {
    renderComposer()
    const prompt = await field()
    const toolbar = document.querySelector('[data-slot="composer-toolbar"]')
    expect(classesOf(prompt)).toContain("px-s2")
    expect(classesOf(toolbar)).toContain("ps-s2")
  })

  it("opens the agent's model picker from the chip, with the chosen model chosen", async () => {
    renderComposer()
    await field()
    fireEvent.click(screen.getByRole("button", { name: modelName }))
    expect(await screen.findByRole("option", { selected: true })).not.toBeNull()
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
