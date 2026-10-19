import { describe, expect, it } from "vitest"
import { app } from "#motion/app"
import { motionCopy } from "#motion/copy.en"

const copy: Readonly<Record<string, string>> = motionCopy

function keysOfApp(): string[] {
  const keys = [
    app.nameKey,
    "motion.line",
    "motion.keywords",
    "motion.empty.title",
    "motion.formats.photo",
    "motion.formats.clip",
    "motion.input.scene.placeholder",
    "motion.input.scene.note",
    "motion.input.resolution.note",
  ]
  for (const input of app.inputs) {
    keys.push(input.labelKey)
    if (input.type === "choice") {
      keys.push(...input.options.map((option) => option.labelKey))
    }
    if (input.type === "image" || input.type === "video") {
      keys.push(`motion.input.${input.name}.note`)
    }
  }
  return keys
}

describe("the motion copy", () => {
  it("holds a text for every key the definition names and every input note", () => {
    const missing = keysOfApp().filter((key) => !Object.hasOwn(copy, key))
    expect(missing).toEqual([])
  })

  it("keeps every key in the motion namespace and every text free of marks the voice refuses", () => {
    const entries = Object.entries(copy)
    expect(entries.filter(([key]) => !key.startsWith("motion."))).toEqual([])
    expect(entries.filter(([, text]) => /[;!&()–—]/.test(text))).toEqual([])
  })
})
