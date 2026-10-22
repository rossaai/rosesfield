import { describe, expect, it } from "vitest"
import {
  type ModelFactsFile,
  modelFactsData,
  modelFactsFile,
  unmarkedLabsOf,
} from "#comfy/model-facts"

function withLab(lab: string, data: ModelFactsFile): ModelFactsFile {
  return {
    ...data,
    models: {
      ...data.models,
      "planted/model": {
        lab,
        release: null,
        weights: null,
        ranks: {},
        thirds: {},
        line: { none: "A planted row" },
      },
    },
  }
}

function luminanceOf(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map((at) => {
    const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function inkOn(ground: string): string {
  const light = luminanceOf(ground)
  return (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) ? "000000" : "FFFFFF"
}

describe("the lab marks", () => {
  it("hold a mark, or a row naming every set searched, for each lab the catalog names", () => {
    expect(unmarkedLabsOf()).toEqual([])
  })

  it("refuse a planted lab that has no mark and no missing row, the control", () => {
    expect(unmarkedLabsOf(withLab("Planted Lab", modelFactsData))).toEqual([
      "Planted Lab",
    ])
  })

  it("refuse a missing row that does not name every set the marks are read from", () => {
    const data = withLab("Planted Lab", modelFactsData)
    const partial = {
      ...data,
      marksMissing: {
        ...data.marksMissing,
        "Planted Lab": {
          searched: ["Simple Icons 16.35.0"],
          ground: "7C5CFF",
          ink: "000000" as const,
          source: "https://example.com/",
        },
      },
    }
    expect(unmarkedLabsOf(partial)).toEqual(["Planted Lab"])
  })

  it("give each lab with no published mark its brand colour and where it was read, never a grey", () => {
    for (const [lab, row] of Object.entries(modelFactsData.marksMissing)) {
      const [red, green, blue] = [0, 2, 4].map((at) =>
        Number.parseInt(row.ground.slice(at, at + 2), 16)
      )
      expect({ lab, grey: red === green && green === blue }).toEqual({
        lab,
        grey: false,
      })
      expect(row.source, lab).toMatch(/^https:\/\//)
      expect({ lab, ink: row.ink }).toEqual({ lab, ink: inkOn(row.ground) })
    }
  })

  it("refuse a missing row with no brand colour, and a brand-page mark that names no page", () => {
    const { ground: _, ...colourless } = {
      searched: ["Simple Icons 16.35.0", "LobeHub Icons 1.95.1"],
      ground: "7C5CFF",
      ink: "000000",
      source: "https://example.com/",
    }
    expect(
      modelFactsFile.safeParse({
        ...modelFactsData,
        marksMissing: { "Planted Lab": colourless },
      }).success
    ).toBe(false)
    const { source: __, ...unsourced } = modelFactsData.marks.Beeble ?? {}
    expect(
      modelFactsFile.safeParse({
        ...modelFactsData,
        marks: { ...modelFactsData.marks, Beeble: unsourced },
      }).success
    ).toBe(false)
    expect(modelFactsFile.safeParse(modelFactsData).success).toBe(true)
  })

  it("carry each graph model's real lab, so Chatterbox names Resemble AI and the video graph names Lightricks", () => {
    expect(modelFactsData.models["graph/chatterbox"]?.lab).toBe("Resemble AI")
    expect(modelFactsData.models["graph/ltx-2-5"]?.lab).toBe("Lightricks")
    expect(modelFactsData.marks.Lightricks?.set).toBe("LobeHub Icons")
  })

  it("cover the labs the reference names that a pinned set draws", () => {
    for (const lab of [
      "Lightricks",
      "Black Forest Labs",
      "OpenAI",
      "Bria",
      "Ideogram",
      "Kling",
      "Krea",
      "Luma",
      "Pruna",
      "Recraft",
      "Runway",
      "xAI",
    ]) {
      expect(Object.hasOwn(modelFactsData.marks, lab), lab).toBe(true)
    }
  })
})
