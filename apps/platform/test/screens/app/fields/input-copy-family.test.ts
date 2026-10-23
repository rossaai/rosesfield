import { describe, expect, it } from "vitest"
import { appEmptyTitle } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import { inputNote, inputPlaceholder } from "@/screens/app/fields/input-copy"

function appOf(id: string) {
  const app = findCatalogApp(id)
  if (app === null) {
    throw new Error(`the catalog lacks ${id}`)
  }
  return app
}

function inputOf(id: string, name: string) {
  const input = appOf(id).inputs.find((one) => one.name === name)
  if (input === undefined) {
    throw new Error(`${id} has no ${name}`)
  }
  return input
}

describe("the words of an app built from another app's definition", () => {
  it("take the placeholder and the note of the family their labels name", () => {
    expect(inputPlaceholder(appOf("speech"), inputOf("speech", "script"))).toBe(
      tCatalog("audio.input.script.placeholder")
    )
    expect(
      inputNote(appOf("voice-clone"), inputOf("voice-clone", "recording"))
    ).toBe(tCatalog("audio.input.recording.note"))
    expect(appEmptyTitle(appOf("music"))).toBe(tCatalog("audio.empty.title"))
  })
})
