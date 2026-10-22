import { describe, expect, it } from "vitest"

const sources = import.meta.glob(
  ["../../../src/**/*.{ts,tsx}", "!../../../src/copy/**", "!**/*.gen.ts"],
  { query: "?raw", import: "default", eager: true }
)

const label = /machineMade|machine-made|AI generated/

function filesNaming(pattern: RegExp, files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([, text]) => pattern.test(text))
    .map(([file]) => file)
}

describe("the machine-made label", () => {
  it("appears on no tile, card, page or viewer", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100)
    expect(filesNaming(label, sources)).toEqual([])
  })

  it("is caught when a screen shows it", () => {
    const planted = {
      "explore-tile.tsx": `<span>{t("explore.tile.machineMade")}</span>`,
      "share-screen.tsx": `<p data-slot="share-machine-made" />`,
    }
    expect(filesNaming(label, planted)).toEqual([
      "explore-tile.tsx",
      "share-screen.tsx",
    ])
  })
})
