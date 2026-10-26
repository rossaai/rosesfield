import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import type { FieldProblem } from "@/screens/app/app-form"
import { barMessageOf } from "@/studio/image/bar-message"

const listing = findCatalogApp("image")

const kreaAspect: ModelField = {
  name: "aspectRatio",
  path: "aspect_ratio",
  required: true,
  kind: "choice",
  options: ["1:1", "4:3", "16:9"],
  default: null,
}

function problems(...list: FieldProblem[]): Map<string, FieldProblem> {
  return new Map(list.map((one) => [one.name, one]))
}

describe("the message above the Image bar", () => {
  it("names a missing input that sits on a chip", () => {
    if (listing === null) {
      throw new Error("The catalog lists no image app")
    }
    const missing = problems({
      name: "aspectRatio",
      key: "field.prompt.required",
      values: {},
    })
    expect(barMessageOf(missing, listing, [kreaAspect])).toBe(
      "Pick the format for this model, then press Generate."
    )
    const empty = problems({
      name: "prompt",
      key: "field.prompt.required",
      values: {},
    })
    expect(barMessageOf(empty, listing, [kreaAspect])).toBe("Write a prompt")
    expect(barMessageOf(new Map(), listing, [kreaAspect])).toBeNull()
  })
})
