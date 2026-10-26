import {
  type CatalogModel,
  factsOf,
  graphMaker,
  type ModelFacts,
} from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import {
  badgesOf,
  capabilitiesOf,
  pickerSections,
  weightsLinkOf,
} from "@/screens/app/hosted/catalog-picker"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"

const openWeights = [{ kind: "open-weights" as const }]

const huggingFaceYellow = "#FFD21E"

describe("the Open weights badge of a model row", () => {
  it("opens the model's weights page on Hugging Face", () => {
    expect(badgesOf("z-image-turbo", openWeights)).toEqual([
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        href: "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo",
        markColour: huggingFaceYellow,
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
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        markColour: huggingFaceYellow,
      },
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
        markColour: huggingFaceYellow,
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

function graphOf(id: string, task: string): CatalogModel {
  const facts = factsOf(`graph/${id}`, task)
  return {
    id,
    kind: "graph",
    maker: facts.lab ?? graphMaker,
    name: id,
    nameKey: null,
    task,
    tags: [{ kind: "open-weights" }],
    form: null,
    facts,
  }
}

function hostedOf(models: readonly CatalogModel[]): HostedState {
  return {
    isTaskApp: true,
    models,
    isLoading: false,
    error: null,
    keyState: "ready",
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
  }
}

describe("the capability line of a row in the catalog picker", () => {
  it("leads a row with what its model does when that differs from most of the picker's models", () => {
    const rows = pickerSections(
      hostedOf([
        graphOf("z-image-turbo", "text-to-image"),
        graphOf("qwen-image-2512", "text-to-image"),
        graphOf("flux-2-klein-4b", "image-edit"),
      ]),
      "2026-10-21"
    )
      .filter((section) => section.id === "all")
      .flatMap((section) => section.rows)
    const tagsOfRow = (id: string) =>
      rows.find((row) => row.id === id)?.tags.map((tag) => tag.label)
    expect(tagsOfRow("z-image-turbo")).toEqual(["Rank 70 of 104"])
    expect(tagsOfRow("flux-2-klein-4b")).toEqual([t("model.task.imageEdit")])
  })

  it("names no task when every model in the picker does the same task", () => {
    const rows = pickerSections(
      hostedOf([graphOf("z-image-turbo", "text-to-image")]),
      "2026-10-21"
    )
      .filter((section) => section.id === "all")
      .flatMap((section) => section.rows)
    expect(rows[0]?.tags.map((tag) => tag.label)).toEqual(["Rank 70 of 104"])
  })

  it("puts a hosted video model's own facts before its rank and the hosting fact last", () => {
    const tags = capabilitiesOf(
      [
        { kind: "hosted" },
        { kind: "resolution", value: "1080p" },
        { kind: "sound" },
      ],
      factsOf("graph/ltx-2-5", "text-to-video")
    ).map((tag) => tag.label)
    expect(tags).toEqual([
      "1080p",
      t("model.tag.sound"),
      "Rank 23 of 29",
      t("model.tag.hosted"),
    ])
  })
})
