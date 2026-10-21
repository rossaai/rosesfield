import { describe, expect, it } from "vitest"
import { appsTakingCharacter, takesText } from "@/catalog/app-facts"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { imageApp } from "../sample-app"

function takesOf(appId: string): string {
  const app = findCatalogApp(appId)
  if (app === null) {
    throw new Error(`no app ${appId}`)
  }
  return takesText(app)
}

describe("takesText", () => {
  it("joins asset inputs that belong to different modes with or", () => {
    expect(takesOf("upscale")).toBe(
      "Takes an image or a clip, makes an image or a video"
    )
    expect(takesOf("lipsync")).toBe(
      "Takes a prompt, an image or a clip, and audio, makes a video"
    )
  })

  it("names one output for an app whose modes all make the same kind", () => {
    expect(takesOf("lipsync")).toMatch(/makes a video$/)
    expect(takesOf("layers")).toMatch(/makes images$/)
  })

  it("lists inputs that work together with and, and counts the output", () => {
    expect(takesText(imageApp())).toBe(
      "Takes a prompt, images, and a character, makes images"
    )
  })
})

describe("appsTakingCharacter", () => {
  it("lists every app with a character input and Image, whose reference images take the character's photos", () => {
    const ids = appsTakingCharacter(catalogApps).map((app) => app.id)
    const withCharacter = catalogApps
      .filter((app) => app.inputs.some((input) => input.type === "character"))
      .map((app) => app.id)
    expect(withCharacter.length).toBeGreaterThan(0)
    expect(ids).toEqual(expect.arrayContaining([...withCharacter, "image"]))
    expect(ids).toHaveLength(withCharacter.length + 1)
    expect(ids).not.toContain("edit")
  })
})
