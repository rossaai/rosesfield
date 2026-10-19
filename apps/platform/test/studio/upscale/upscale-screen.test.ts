import type { AppListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { bodyOf, defaultsOf, problemsOf } from "@/screens/app/app-form"
import {
  bodyAppFor,
  formAppFor,
  messageOf,
  modeOf,
} from "@/studio/upscale/use-upscale-screen"

function upscaleListing(): AppListing {
  const app = findCatalogApp("upscale")
  if (app === null) {
    throw new Error("The catalog lists no upscale app")
  }
  return app
}

function presenceOf(app: AppListing, name: string): string | null {
  const input = app.inputs.find((one) => one.name === name)
  return input !== undefined && "presence" in input ? input.presence : null
}

describe("the upscale modes", () => {
  it("requires the file of the chosen mode and leaves the other optional", () => {
    const app = upscaleListing()
    expect(presenceOf(formAppFor(app, "image"), "image")).toBe("required")
    expect(presenceOf(formAppFor(app, "image"), "video")).toBe("optional")
    expect(presenceOf(formAppFor(app, "video"), "video")).toBe("required")
    expect(presenceOf(formAppFor(app, "video"), "image")).toBe("optional")
  })

  it("names only the missing file of the chosen mode", () => {
    const app = upscaleListing()
    const names = (mode: "image" | "video") => {
      const form = formAppFor(app, mode)
      const values = defaultsOf(form)
      const chosen = { ...values, inputs: { ...values.inputs, mode } }
      return problemsOf(form, chosen).map((problem) => problem.name)
    }
    expect(names("image")).toEqual(["image"])
    expect(names("video")).toEqual(["video"])
  })

  it("sends only the file of the chosen mode", () => {
    const app = upscaleListing()
    const names = (mode: "image" | "video") =>
      bodyAppFor(app, mode).inputs.map((input) => input.name)
    expect(names("image")).toEqual(["mode", "image", "scale", "model", "seed"])
    expect(names("video")).toEqual(["mode", "video", "scale", "model", "seed"])
  })

  it("leaves a video out of the body of an image run", () => {
    const app = upscaleListing()
    const values = defaultsOf(formAppFor(app, "image"))
    const filled = {
      ...values,
      inputs: { ...values.inputs, image: ["photo-1"], video: ["clip-1"] },
    }
    const body = bodyOf(bodyAppFor(app, "image"), filled)
    expect(body.inputs).toMatchObject({ mode: "image", image: ["photo-1"] })
    expect(body.inputs).not.toHaveProperty("video")
  })

  it("reads an unknown mode as image", () => {
    expect(modeOf("video")).toBe("video")
    expect(modeOf("audio")).toBe("image")
    expect(modeOf(undefined)).toBe("image")
  })
})

describe("the upscale file messages", () => {
  it("names a file the browser cannot open in the mode's words", () => {
    expect(messageOf("image", { kind: "unreadable" })).toContain(
      "cannot open this image"
    )
    expect(messageOf("video", { kind: "unreadable" })).toContain(
      "cannot open this video"
    )
  })

  it("names the kinds the mode takes", () => {
    expect(messageOf("video", { kind: "wrongKind" })).toBe(
      "This input takes MP4, MOV or WebM videos. Pick another file."
    )
  })

  it("names the short side and the minimum", () => {
    expect(messageOf("image", { kind: "tooSmall", side: 63, min: 64 })).toBe(
      "This image is 63 pixels on its short side. Pick one of 64 pixels or more."
    )
  })

  it("names a clip longer than the limit with a length over the limit", () => {
    expect(
      messageOf("video", { kind: "tooLong", seconds: 10.1, max: 10 })
    ).toBe("This clip runs 10.1 seconds. Pick one of 10 seconds or less.")
  })
})
