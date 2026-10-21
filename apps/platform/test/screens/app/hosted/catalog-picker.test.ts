import { type ModelFacts, modelTasks } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import {
  badgesOf,
  lineOf,
  modelLineOf,
  weightsLinkOf,
} from "@/screens/app/hosted/catalog-picker"

const openWeights = [{ kind: "open-weights" as const }]

describe("the Open weights badge of a model row", () => {
  it("opens the model's weights page on Hugging Face", () => {
    expect(badgesOf("z-image-turbo", openWeights)).toEqual([
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        href: "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo",
      },
    ])
  })

  it("opens the Hugging Face repository a model names when its link is its licence", () => {
    expect(weightsLinkOf("ltx-2-5")).toBe(
      "https://huggingface.co/Lightricks/LTX-2.5"
    )
  })

  it("links nowhere for a model with no weights page on Hugging Face", () => {
    expect(weightsLinkOf("sam-3-1")).toBeNull()
    expect(weightsLinkOf("minimax/minimax-h3")).toBeNull()
    expect(badgesOf("minimax/minimax-h3", openWeights)).toEqual([
      { kind: "openWeights", label: t("model.tag.openWeights") },
    ])
  })

  it("is absent on a model whose weights are closed", () => {
    expect(badgesOf("z-image-turbo", [{ kind: "sound" }])).toEqual([])
  })
})

const rank = {
  position: 3,
  size: 40,
  board: "Picture Arena",
  url: "https://boards.example/pictures",
  readOn: "2026-10-20",
}

const facts: ModelFacts = {
  lab: "Maker Lab",
  release: "2026-10-10",
  rank,
  priceThird: 3,
  weights: "https://huggingface.co/maker/open",
  lineKey: null,
}

const words: Readonly<Record<string, string>> = {
  "comfy.badge.new": "New",
  "comfy.badge.top": "Top",
  "comfy.badge.premium": "Premium",
  "comfy.model.lineByMaker": "{line}, by {maker}",
  "comfy.model.makerOpen.line": "Makes pictures of open things",
}

function wordOf(
  key: string,
  values: Readonly<Record<string, string | number>> = {}
): string | null {
  const text = words[key]
  return text === undefined
    ? null
    : text.replace(/\{(\w+)\}/g, (slot, name: string) =>
        String(values[name] ?? slot)
      )
}

describe("the fact badges of a model row", () => {
  it("shows New, Top and Premium in that order before Open weights, each read through its copy key", () => {
    expect(
      badgesOf("maker/open", openWeights, facts, "2026-10-21", wordOf)
    ).toEqual([
      { kind: "new", label: "New" },
      { kind: "top", label: "Top" },
      { kind: "premium", label: "Premium" },
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        href: "https://huggingface.co/maker/open",
      },
    ])
  })

  it("shows a badge only while its fact holds", () => {
    const old = { ...facts, release: "2026-09-21" }
    const lower = {
      ...facts,
      rank: { ...rank, position: 6 },
    } satisfies ModelFacts
    const cheap = { ...facts, priceThird: 2 } satisfies ModelFacts
    const kinds = (one: ModelFacts): string[] =>
      badgesOf("maker/open", [], one, "2026-10-21", wordOf).map(
        (badge) => badge.kind
      )
    expect(kinds(old)).toEqual(["top", "premium"])
    expect(kinds(lower)).toEqual(["new", "premium"])
    expect(kinds(cheap)).toEqual(["new", "top"])
  })

  it("shows no badge whose word the copy does not hold", () => {
    expect(badgesOf("maker/open", [], facts, "2026-10-21", () => null)).toEqual(
      []
    )
  })
})

describe("the line of a model row", () => {
  it("is the model's own line when the copy holds its key, and the task's line when it does not", () => {
    expect(
      modelLineOf("text-to-image", { ...facts, lineKey: "model.line.speech" })
    ).toBe(t("model.line.speech"))
    expect(
      modelLineOf("text-to-image", {
        ...facts,
        lineKey: "comfy.model.notWritten.line",
      })
    ).toBe(t("model.line.textToImage"))
    expect(modelLineOf("text-to-image", undefined)).toBe(
      t("model.line.textToImage")
    )
  })

  it("says the model's own line and its maker in one line, and keeps the line alone when the copy holds no pattern", () => {
    const own = { ...facts, lineKey: "comfy.model.makerOpen.line" }
    expect(modelLineOf("text-to-image", own, "Maker Lab", wordOf)).toBe(
      "Makes pictures of open things, by Maker Lab"
    )
    expect(modelLineOf("text-to-image", own, undefined, wordOf)).toBe(
      "Makes pictures of open things"
    )
    expect(
      modelLineOf("text-to-image", own, "Maker Lab", (key) =>
        key === "comfy.model.makerOpen.line" ? "Makes pictures" : null
      )
    ).toBe("Makes pictures")
    expect(modelLineOf("unknown-task", facts, "Maker Lab", wordOf)).toBeNull()
  })
})

describe("the line of a task", () => {
  it("names what each task of the catalog makes", () => {
    for (const task of modelTasks) {
      expect(lineOf(task), task).toMatch(/\S/)
    }
    expect(lineOf("music")).toBe("Makes music from your words")
    expect(lineOf("voice-change")).toBe("Says your recording in another voice")
  })
})
