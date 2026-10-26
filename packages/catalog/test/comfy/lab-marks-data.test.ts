import { describe, expect, it } from "vitest"
import { labOfModel, modelFactsData, modelFactsFile } from "#comfy/model-facts"

const markSet = [
  {
    name: "Simple Icons",
    version: "16.35.0",
    licence: "CC0-1.0",
    url: "https://icons.example/set",
  },
]

const emptyFile = {
  scoreMethod: "Each board's position, averaged over the boards.",
  boards: {},
  markSet,
  marks: {},
  marksMissing: {},
}

const markedServices: readonly string[] = ["Comfy", "Hugging Face"]

describe("the lab marks the model facts hold", () => {
  it("draws each lab's mark from a pinned public icon set as path data, for labs a model row names and the two services a screen marks", () => {
    expect(modelFactsData.markSet.map((set) => set.name)).toEqual([
      "Simple Icons",
      "LobeHub Icons",
    ])
    const lobe = modelFactsData.markSet.find(
      (set) => set.name === "LobeHub Icons"
    )
    expect(lobe?.licence).toBe("MIT")
    expect(lobe !== undefined && "text" in lobe ? lobe.text : "").toContain(
      "Permission is hereby granted"
    )
    const labs = new Set(
      Object.values(modelFactsData.models).map((row) => row.lab)
    )
    const marked = Object.keys(modelFactsData.marks)
    expect(marked.length).toBeGreaterThan(20)
    expect(
      marked.filter((lab) => !(labs.has(lab) || markedServices.includes(lab)))
    ).toEqual([])
    expect(modelFactsData.marks.Google?.slug).toBe("google")
    expect(modelFactsData.marks["Black Forest Labs"]?.set).toBe("LobeHub Icons")
  })

  it("takes a mark no icon set holds from its owner's own published file, names that file, and seats it on its owner's ground", () => {
    expect(modelFactsData.marks.Comfy).toMatchObject({
      slug: "comfy",
      hex: "F2FF59",
      ground: "211927",
      set: "Comfy",
      source: "https://comfy.org/icons/logomark.svg",
    })
    expect(
      Object.entries(modelFactsData.marks)
        .filter(([, mark]) => mark.source !== undefined)
        .map(([name]) => name)
    ).toEqual(["Beeble", "Comfy"])
    expect(modelFactsData.marks.Beeble).toMatchObject({
      set: "Brand",
      source: "https://beeble.ai/brand",
      viewBox: "0 0 300 300",
      accent: { hex: "00D084", hexDark: "00D084" },
    })
    expect(modelFactsData.marks["Hugging Face"]?.hex).toBe("FFD21E")
  })

  it("colours each lab's mark with a hex for each scheme, the set's own beside it in light", () => {
    expect(modelFactsData.marks.Google?.hex).toBe("4285F4")
    expect(modelFactsData.marks.MiniMax?.hex).toBe("E73562")
    expect(modelFactsData.marks.DeepSeek?.hex).toBe("5786FE")
    expect(modelFactsData.marks.OpenAI).toMatchObject({
      hex: "000000",
      hexDark: "FFFFFF",
    })
  })

  it("names one lab for each maker, so a picker groups a maker's models once", () => {
    const labs = new Set(
      Object.values(modelFactsData.models).map((row) => row.lab)
    )
    for (const split of [
      "KlingAI",
      "Fal",
      "Luma Labs",
      "Pruna AI",
      "SpaceXAI",
    ]) {
      expect(labs.has(split), split).toBe(false)
    }
    expect(labOfModel("kling/kling-v3")).toBe("Kling")
    expect(labOfModel("xai/grok-imagine-video")).toBe("xAI")
    expect(labOfModel("qwen/qwen-image-3.0")).toBe("Alibaba Qwen")
  })

  it("names the lab of each chat model the agent runs, and none for a model it does not hold", () => {
    expect(labOfModel("deepseek/deepseek-v4-flash")).toBe("DeepSeek")
    expect(labOfModel("z-ai/glm-4.6")).toBe("Z.ai")
    expect(labOfModel("anthropic/claude-sonnet-5")).toBe("Anthropic")
    expect(labOfModel("maker/unknown")).toBeNull()
    expect(labOfModel("toString")).toBeNull()
  })

  it("refuses a mark that is markup or a picture rather than path data, the control", () => {
    const mark = {
      slug: "maker",
      title: "Maker",
      hex: "4285F4",
      hexDark: "4285F4",
      set: "Simple Icons",
      path: "M0 0h24v24H0z",
    }
    const marks = [
      { ...mark, hexDark: "dark" },
      { ...mark, set: "Somewhere" },
      { ...mark, path: "<image href='maker.png'/>" },
      { ...mark, path: 'M0 0h24v24H0z"/><script>' },
      { ...mark, slug: "Maker Lab" },
      { ...mark, hex: "#4285F4" },
      { ...mark, hex: "blue" },
      { slug: "maker", title: "Maker", path: "M0 0h24v24H0z" },
    ]
    for (const mark of marks) {
      expect(
        modelFactsFile.safeParse({
          ...emptyFile,
          marks: { "Maker Lab": mark },
          models: {},
        }).success
      ).toBe(false)
    }
    expect(
      modelFactsFile.safeParse({
        ...emptyFile,
        marks: { "Maker Lab": mark },
        models: {},
      }).success
    ).toBe(true)
  })
})
