import type { ModelField } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
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

function media(name: string, required: boolean): ModelField {
  return {
    kind: "media",
    media: name === "audio" ? "audio" : "image",
    name,
    path: name,
    required,
    min: required ? 1 : 0,
    max: 1,
  }
}

const clip = media("image", true)
const audio = media("audio", false)
const firstFrame = media("firstFrame", false)

function show(fields: readonly ModelField[]): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <HostedFields fields={fields} form={form} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

describe("a model's optional inputs", () => {
  it("fold under Advanced when there are two or more, while the required input stays in view", () => {
    show([clip, audio, firstFrame])

    expect(screen.getByText(fieldCaption(clip))).toBeTruthy()
    expect(screen.queryByText(fieldCaption(audio))).toBeNull()
    expect(screen.queryByText(fieldCaption(firstFrame))).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: t("field.advanced") }))
    expect(screen.getByText(fieldCaption(audio))).toBeTruthy()
    expect(screen.getByText(fieldCaption(firstFrame))).toBeTruthy()
  })

  it("stays in view when it is the only optional one", () => {
    show([clip, audio])

    expect(screen.getByText(fieldCaption(audio))).toBeTruthy()
  })
})
