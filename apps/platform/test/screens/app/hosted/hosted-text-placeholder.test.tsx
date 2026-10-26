import type { ModelField } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { HostedSettings } from "@/screens/app/hosted/hosted-fields"
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
})
