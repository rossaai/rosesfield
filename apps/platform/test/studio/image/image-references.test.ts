import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  graphReferencesOf,
  referenceModelOf,
} from "@/studio/image/image-references"

const image = appListing.parse(findApp("image"))

function graph(id: string): CatalogModel {
  return {
    id,
    kind: "graph",
    maker: "comfy-cloud",
    name: id,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "open-weights" }],
    form: null,
  }
}

const listed = [
  graph("z-image-turbo"),
  graph("qwen-image-2512"),
  graph("qwen-image-edit-2511"),
]

describe("Image's references on its graphs", () => {
  it("reads the references field from the input the catalog binds to Qwen Image Edit 2511, and none on the text-only graphs", () => {
    expect(graphReferencesOf(image, "qwen-image-edit-2511")).toEqual({
      name: "references",
      path: "references",
      required: true,
      kind: "media",
      media: "image",
      min: 0,
      max: 3,
    })
    expect(graphReferencesOf(image, "z-image-turbo")).toBeNull()
    expect(graphReferencesOf(image, "qwen-image-2512")).toBeNull()
  })

  it("names the catalog's open graph that takes references as the model to move to", () => {
    expect(referenceModelOf(image, listed)).toBe("qwen-image-edit-2511")
    expect(referenceModelOf(image, listed.slice(0, 2))).toBeNull()
  })
})
