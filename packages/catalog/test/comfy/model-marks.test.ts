import { describe, expect, it } from "vitest"
import {
  type ModelFactsFile,
  modelFactsData,
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
        "Planted Lab": { searched: ["Simple Icons 16.35.0"] },
      },
    }
    expect(unmarkedLabsOf(partial)).toEqual(["Planted Lab"])
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
