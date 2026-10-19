import { describe, expect, it } from "vitest"
import { CatalogModelPolicy } from "#comfy/catalog-model-policy"

const policy = new CatalogModelPolicy()

function model(id: string, takes: string[], makes: string[]) {
  return { id, provider: id.split("/")[0] ?? "", takes, makes, form: null }
}

describe("CatalogModelPolicy", () => {
  it("offers a model one of whose tasks the app lists", () => {
    expect(
      policy.allows(
        ["text-to-image"],
        model("maker/picture", ["text"], ["image"])
      )
    ).toBe(true)
  })

  it("refuses a model of another task and any Wan model", () => {
    expect(
      policy.allows(["text-to-image"], model("maker/clip", ["text"], ["video"]))
    ).toBe(false)
    expect(
      policy.allows(
        ["text-to-image"],
        model("wan/wan2.5-t2i-preview", ["text"], ["image"])
      )
    ).toBe(false)
    expect(policy.allows([], model("maker/picture", ["text"], ["image"]))).toBe(
      false
    )
  })
})
