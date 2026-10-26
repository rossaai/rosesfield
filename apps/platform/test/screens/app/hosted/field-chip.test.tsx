import type { ModelField } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { ModelFieldChips } from "@/screens/app/hosted/field-chip"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import type { AppForm } from "@/screens/app/use-app-form"

const fields: ModelField[] = [
  {
    name: "prompt",
    path: "prompt",
    required: true,
    kind: "prompt",
    maxLength: null,
    default: null,
  },
  {
    name: "style",
    path: "style",
    required: false,
    kind: "choice",
    options: ["photo", "film"],
    default: "photo",
  },
  {
    name: "guidance",
    path: "guidance",
    required: false,
    kind: "number",
    min: 1,
    max: 10,
    integer: true,
    default: 3,
  },
  {
    name: "watermark",
    path: "watermark",
    required: false,
    kind: "toggle",
    default: false,
  },
  {
    name: "negativePrompt",
    path: "negativePrompt",
    required: false,
    kind: "text",
    maxLength: null,
    default: null,
  },
]

function formWith(inputs: Record<string, FieldValue>): AppForm {
  return {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

afterEach(cleanup)

describe("the model's fields on the composer row", () => {
  it("draws the settings a person changes most as chips and the rest behind one Advanced chip", () => {
    render(
      <TooltipProvider>
        <ModelFieldChips fields={fields} form={formWith({})} output="image" />
      </TooltipProvider>
    )
    const style = fields[1]
    if (style === undefined) {
      throw new Error("no style field")
    }
    expect(
      screen.getAllByRole("combobox", { name: new RegExp(fieldCaption(style)) })
        .length
    ).toBeGreaterThan(0)
    for (const field of fields.slice(2)) {
      expect(
        screen.queryByRole("button", { name: new RegExp(fieldCaption(field)) }),
        field.name
      ).toBeNull()
    }
    expect(
      screen.getAllByRole("button", { name: new RegExp(t("field.advanced")) })
    ).toHaveLength(1)
    expect(screen.queryByRole("button", { name: t("bar.settings") })).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })
})
