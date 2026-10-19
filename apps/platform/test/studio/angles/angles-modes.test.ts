import { type AppListing, appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf } from "@/screens/app/app-form"
import { bodyAppFor, isShownIn } from "@/studio/angles/angles-modes"
import { app as anglesInput } from "../../../../../packages/catalog/src/angles/app"

const app: AppListing = appListing.parse(anglesInput)
const imageId = "2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b"

function valuesIn(mode: "set" | "single") {
  const base = defaultsOf(app)
  return {
    ...base,
    count: mode === "set" ? 4 : 1,
    inputs: { ...base.inputs, mode, image: [imageId] },
  }
}

describe("the Angles screen sends the inputs of its mode", () => {
  it("shows the views in set mode and the side and height in one view", () => {
    const shown = (mode: "set" | "single"): string[] =>
      ["angleSet", "side", "height", "distance"].filter((name) =>
        isShownIn(app, mode, name)
      )
    expect(shown("set")).toEqual(["angleSet", "distance"])
    expect(shown("single")).toEqual(["side", "height", "distance"])
  })

  it("leaves out the inputs of the other mode, so the gateway takes the body", () => {
    expect(bodyOf(bodyAppFor(app, "set"), valuesIn("set")).inputs).toEqual({
      mode: "set",
      image: [imageId],
      angleSet: "turnaround",
      distance: "medium",
    })
    expect(
      bodyOf(bodyAppFor(app, "single"), valuesIn("single")).inputs
    ).toEqual({
      mode: "single",
      image: [imageId],
      side: "back",
      height: "eye-level",
      distance: "medium",
    })
  })

  it("the shared form alone sends the inputs of both modes", () => {
    expect(Object.keys(bodyOf(app, valuesIn("single")).inputs).sort()).toEqual([
      "angleSet",
      "distance",
      "height",
      "image",
      "mode",
      "side",
    ])
  })
})
