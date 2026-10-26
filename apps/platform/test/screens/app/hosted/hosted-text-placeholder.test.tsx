import type { ModelField } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { HostedField, HostedSettings } from "@/screens/app/hosted/hosted-fields"
import type { AppForm } from "@/screens/app/use-app-form"

afterEach(cleanup)

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

const styleText: ModelField = {
  kind: "text",
  name: "voiceId",
  path: "voice_id",
  required: false,
  maxLength: null,
  default: null,
}

describe("a model's text field", () => {
  it("says what to write when the model names no placeholder of its own", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <HostedSettings fields={[styleText]} form={form} />
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByRole("textbox").getAttribute("placeholder")).toBe(
      t("field.text.placeholder")
    )
  })

  it("shows its default as the placeholder when it has one", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <HostedSettings
            fields={[{ ...styleText, default: "alloy" }]}
            form={form}
          />
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByRole("textbox").getAttribute("placeholder")).toBe(
      "alloy"
    )
  })
})

const steps: ModelField = {
  kind: "number",
  name: "steps",
  path: "steps",
  required: false,
  min: 1,
  max: 50,
  integer: true,
  default: 30,
}

const seed: ModelField = {
  kind: "number",
  name: "seed",
  path: "seed",
  required: false,
  min: null,
  max: null,
  integer: true,
  default: 42,
}

function renderField(
  field: ModelField,
  value: number | undefined,
  setInput: AppForm["setInput"]
): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <HostedField field={field} value={value} form={{ ...form, setInput }} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe("a model's number field you clear", () => {
  it("shows the model's default as its placeholder and sets that default", () => {
    const set: unknown[][] = []
    renderField(steps, 12, (...args) => {
      set.push(args)
    })
    const field = screen.getByRole("spinbutton")
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "" } })
    expect(field.getAttribute("placeholder")).toBe("30")
    fireEvent.blur(field)
    expect(set).toEqual([["steps", 30]])
  })

  it("shows the seed's default as the placeholder of the seed field", () => {
    renderField(seed, undefined, () => undefined)
    expect(
      document
        .querySelector("input[type='number']")
        ?.getAttribute("placeholder")
    ).toBe("42")
  })
})
