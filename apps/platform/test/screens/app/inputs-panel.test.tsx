import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { defaultsOf } from "@/screens/app/app-form"
import { InputsPanel } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"

const image = appListing.parse(findApp("image"))

function formOf(): AppForm {
  return {
    values: defaultsOf(image),
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPanel(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <InputsPanel app={image} form={formOf()} lastSeed={null} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function isBefore(first: Element, second: Element): boolean {
  return (
    (first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  )
}

describe("an app's column", () => {
  it("shows the prompt, then the model as the bar's chip with no caption, then the format first and the count after it", () => {
    renderPanel()
    const prompt = screen.getByRole("textbox")
    const model = screen.getByRole("button", {
      name: new RegExp(`^${t("model.picker.title")} `),
    })
    const format = screen.getByRole("combobox", {
      name: t("field.aspect.label"),
    })
    const count = screen.getByRole("group", { name: t("field.count.label") })
    expect(isBefore(prompt, model)).toBe(true)
    expect(isBefore(model, format)).toBe(true)
    expect(isBefore(format, count)).toBe(true)
    expect(model.querySelector("[data-slot='model-row-name']")).not.toBeNull()
    expect(model.getAttribute("data-width")).toBe("full")
    expect(screen.queryByText(t("model.picker.title"))).toBeNull()
  })

  it("keeps the seed under Advanced, closed until you open it", () => {
    renderPanel()
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: t("field.advanced") }))
    expect(screen.getByText(t("field.seed.label"))).toBeDefined()
  })

  it("shows Optional on no setting and gives the prompt a placeholder", () => {
    renderPanel()
    expect(screen.queryByText(t("field.optional"))).toBeNull()
    expect(screen.getByRole("textbox").getAttribute("placeholder")).not.toBe("")
  })
})
