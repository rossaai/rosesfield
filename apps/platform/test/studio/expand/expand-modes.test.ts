import { appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf } from "@/screens/app/app-form"
import { bodyAppFor, ratioOf } from "@/studio/expand/expand-modes"
import { app } from "../../../../../packages/catalog/src/expand/app"

const listing = appListing.parse(app)
const photo = "3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f"

function namesIn(mode: "format" | "sides"): string[] {
  return bodyAppFor(listing, mode).inputs.map((input) => input.name)
}

function valuesFor(mode: "format" | "sides") {
  const values = defaultsOf(listing)
  return {
    ...values,
    inputs: { ...values.inputs, mode, photo: [photo], left: 50 },
  }
}

describe("the inputs an Expand mode sends", () => {
  it("sends the format and no side in To a format", () => {
    expect(namesIn("format")).toEqual([
      "mode",
      "photo",
      "aspect",
      "scene",
      "seed",
    ])
    const body = bodyOf(bodyAppFor(listing, "format"), valuesFor("format"))
    expect(body.inputs).toEqual({
      mode: "format",
      photo: [photo],
      aspect: "16-9",
    })
  })

  it("sends the four sides and no format in By side", () => {
    expect(namesIn("sides")).toEqual([
      "mode",
      "photo",
      "top",
      "right",
      "bottom",
      "left",
      "scene",
      "seed",
    ])
    const body = bodyOf(bodyAppFor(listing, "sides"), valuesFor("sides"))
    expect(body.inputs).toEqual({
      mode: "sides",
      photo: [photo],
      top: 0,
      right: 0,
      bottom: 0,
      left: 50,
    })
  })

  it("reads a format value as its ratio", () => {
    expect(ratioOf("9-16")).toBe("9:16")
    expect(ratioOf(undefined)).toBe("16:9")
  })
})
