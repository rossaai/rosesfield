import { describe, expect, it } from "vitest"
import { app } from "#lipsync/app"
import { lipsyncCopy } from "#lipsync/copy.en"

const copy: Readonly<Record<string, string>> = lipsyncCopy

const namespace = "lipsync."

function keysOfApp(): string[] {
  const keys = [
    app.nameKey,
    "lipsync.line",
    "lipsync.keywords",
    "lipsync.empty.title",
    "lipsync.formats.photo",
    "lipsync.formats.clip",
    "lipsync.formats.audio",
    "lipsync.input.scene.placeholder",
  ]
  for (const input of app.inputs) {
    keys.push(input.labelKey)
    if (input.type === "choice") {
      keys.push(...input.options.map((option) => option.labelKey))
    }
    if (
      input.type === "image" ||
      input.type === "video" ||
      input.type === "audio"
    ) {
      keys.push(`lipsync.input.${input.name}.note`)
    }
  }
  return keys.filter((key) => key.startsWith(namespace))
}

describe("the lip sync copy", () => {
  it("holds a text for every key the definition names, the model's name among them", () => {
    const missing = keysOfApp().filter((key) => !Object.hasOwn(copy, key))
    expect(missing).toEqual([])
  })

  it("keeps every key in the lip sync namespace and every text free of marks the voice refuses", () => {
    const entries = Object.entries(copy)
    expect(entries.filter(([key]) => !key.startsWith(namespace))).toEqual([])
    expect(entries.filter(([, text]) => /[;!&()–—]/.test(text))).toEqual([])
  })
})
