import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { fieldValueText } from "@/screens/app/settings-plan"

const ratio: ModelField = {
  kind: "choice",
  name: "ratio",
  path: "ratio",
  required: false,
  options: ["adaptive", "16:9", "9:16"],
  default: "adaptive",
}

describe("a model's format setting", () => {
  it("is named Format, as in every other app, whatever the model calls it", () => {
    expect(fieldCaption(ratio)).toBe(t("field.aspect.label"))
  })

  it("reads Auto for the value that follows the input, and keeps a ratio as it is", () => {
    expect(fieldValueText(ratio, "adaptive")).toBe(t("choice.auto"))
    expect(fieldValueText(ratio, "16:9")).toBe("16:9")
  })
})
