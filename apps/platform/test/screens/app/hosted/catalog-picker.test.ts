import {
  type CatalogModel,
  factsOf,
  graphMaker,
  type ModelFacts,
} from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { formatDate } from "@/copy/format"
import { t } from "@/copy/t"
import { catalogRowsOf } from "@/screens/app/hosted/catalog-picker"
import { capabilitiesOf } from "@/screens/app/hosted/model-rows"
import {
  type BadgeContext,
  badgesOf,
  rankNoteOf,
  weightsLinkOf,
} from "@/screens/app/hosted/row-badges"

const openWeights = [{ kind: "open-weights" as const }]

const huggingFaceYellow = "#FFD21E"

const imageContext: BadgeContext = {
  task: "text-to-image",
  today: "2026-10-26",
  taskBoards: [],
}

describe("the Open weights badge of a model row", () => {
  it("opens the model's weights page on Hugging Face", () => {
    expect(
      badgesOf("z-image-turbo", openWeights, undefined, imageContext)
    ).toEqual([
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
    expect(
      badgesOf("minimax/minimax-h3", openWeights, undefined, imageContext)
    ).toEqual([
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        markColour: huggingFaceYellow,
      },
    ])
  })

  it("is absent on a model whose weights are closed", () => {
    expect(
      badgesOf("z-image-turbo", [{ kind: "sound" }], undefined, imageContext)
    ).toEqual([])
  })
})

const board = {
  board: "Picture Arena",
  url: "https://boards.example/pictures",
  readOn: "2026-10-20",
  display: "allowed",
} as const

const facts: ModelFacts = {
  lab: "Maker Lab",
  release: "2026-10-10",
  weights: "https://huggingface.co/maker/open",
  lineKey: null,
  scores: {
    "text-to-image": {
      score: 90,
      rank: 3,
      order: 3,
      of: 40,
      sources: [board],
      tiers: ["bestValue"],
    },
  },
}

const words: Readonly<Record<string, string>> = {
  "comfy.badge.new": "New",
}

function wordOf(key: string): string | null {
  return words[key] ?? null
}

const context: BadgeContext = {
  task: "text-to-image",
  today: "2026-10-21",
  taskBoards: [],
  words: wordOf,
}

const rankNote = t("model.picker.rankFrom", {
  boards: "Picture Arena",
  date: formatDate("2026-10-20T00:00:00"),
})

describe("the fact badges of a model row", () => {
  it("shows New and Best value in that order before Open weights, each read through its copy key, and no rank, which rides the mark", () => {
    expect(badgesOf("maker/open", openWeights, facts, context)).toEqual([
      { kind: "new", label: "New" },
      { kind: "value", label: t("model.picker.bestValue") },
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
    const cell = facts.scores["text-to-image"]
    if (cell === undefined) {
      throw new Error("no cell")
    }
    const tail = {
      ...facts,
      scores: { "text-to-image": { ...cell, rank: null, tiers: [] } },
    } satisfies ModelFacts
    const kinds = (one: ModelFacts, task = "text-to-image"): string[] =>
      badgesOf("maker/open", [], one, { ...context, task }).map(
        (badge) => badge.kind
      )
    expect(kinds(old)).toEqual(["value"])
    expect(kinds(tail)).toEqual(["new"])
    expect(kinds(facts, "image-edit")).toEqual(["new"])
  })

  it("shows no New whose word the copy does not hold", () => {
    expect(
      badgesOf("maker/open", [], facts, { ...context, words: () => null }).map(
        (badge) => badge.kind
      )
    ).toEqual(["value"])
  })
})

describe("the rank's note", () => {
  it("names the boards that hold the model and the date they were read", () => {
    const other = { ...board, board: "Second Arena", readOn: "2026-10-26" }
    expect(rankNoteOf([board, other], [])).toBe(
      t("model.picker.rankFrom", {
        boards: "Picture Arena and Second Arena",
        date: formatDate("2026-10-26T00:00:00"),
      })
    )
    expect(rankNoteOf([board, other], [])).toBe(
      "Rank from Picture Arena and Second Arena, read on Oct 26, 2026"
    )
  })

  it("names the task's boards for a model ranked by its version, and nothing with no board, the control", () => {
    expect(rankNoteOf([], [board])).toBe(rankNote)
    expect(rankNoteOf([], [])).toBeNull()
  })
})

function graphOf(id: string, task: string): CatalogModel {
  const facts = factsOf(`graph/${id}`)
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

function hostedModelOf(id: string, task: string): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker: "Maker",
    name: id,
    nameKey: null,
    task,
    tags: [{ kind: "hosted" }],
    form: null,
    facts: factsOf(id),
  }
}

function rowsOf(models: readonly CatalogModel[]) {
  return catalogRowsOf(models, "2026-10-26")
}

describe("the catalog picker's Top order", () => {
  it("orders by the rank for the app's main task, whatever order the catalog lists, with the rank on the mark", () => {
    const rows = rowsOf([
      graphOf("z-image-turbo", "text-to-image"),
      hostedModelOf("openai/gpt-image-2", "text-to-image"),
      hostedModelOf("openai/gpt-image-2.5-sunburst", "text-to-image"),
      hostedModelOf("maker/unknown", "text-to-image"),
    ])
    expect(rows.map((row) => row.id)).toEqual([
      "openai/gpt-image-2.5-sunburst",
      "openai/gpt-image-2",
      "z-image-turbo",
      "maker/unknown",
    ])
    expect(rows.map((row) => row.rank?.place)).toEqual([1, 3, 39, undefined])
    expect(rows[0]?.rank?.label).toBe("#1")
  })

  it("orders 3D by the newest Meshy first, with its rank", () => {
    const rows = rowsOf([
      hostedModelOf("meshy/meshy-6", "three-d"),
      hostedModelOf("meshy/meshy-7", "three-d"),
      graphOf("meshy-7-1-image", "three-d"),
      hostedModelOf("meshy/meshy-7.1", "three-d"),
    ])
    expect(rows.map((row) => row.id)).toEqual([
      "meshy-7-1-image",
      "meshy/meshy-7.1",
      "meshy/meshy-7",
      "meshy/meshy-6",
    ])
    expect(rows[0]?.rank).toMatchObject({ place: 1, label: "#1" })
  })

  it("gives the app's default no rank when it sits after every scored model, and keeps it in its place", () => {
    const rows = rowsOf([
      graphOf("qwen-image-edit-2511", "text-to-image"),
      hostedModelOf("openai/gpt-image-2", "text-to-image"),
      hostedModelOf("recraft/recraftv2", "text-to-image"),
    ])
    expect(rows.map((row) => row.id)).toEqual([
      "openai/gpt-image-2",
      "qwen-image-edit-2511",
      "recraft/recraftv2",
    ])
    const ranked = rows.filter((row) => row.rank !== undefined)
    expect(ranked.map((row) => row.id)).toEqual(["openai/gpt-image-2"])
  })
})

describe("the capability line of a row in the catalog picker", () => {
  it("leads a row with what its model does when that differs from most of the picker's models, and holds no release date", () => {
    const rows = rowsOf([
      graphOf("z-image-turbo", "text-to-image"),
      graphOf("qwen-image-2512", "text-to-image"),
      graphOf("flux-2-klein-4b", "image-edit"),
    ])
    const labelsOf = (id: string) =>
      rows.find((row) => row.id === id)?.capabilities.map((tag) => tag.label)
    expect(labelsOf("z-image-turbo")).toEqual([])
    expect(labelsOf("flux-2-klein-4b")?.[0]).toBe(t("model.task.imageEdit"))
  })

  it("puts Sound first on a video model that makes sound, then its own capabilities, and no date, no hosting fact and no Ran in Rosesfield", () => {
    const labels = capabilitiesOf(
      {
        task: "text-to-video",
        tags: [
          { kind: "hosted" },
          { kind: "proven" },
          { kind: "resolution", value: "1080p" },
          { kind: "sound" },
          { kind: "open-weights" },
        ],
      },
      "text-to-video"
    ).map((tag) => tag.label)
    expect(labels).toEqual([t("model.tag.sound"), "1080p"])
    expect(labels.join(" ")).not.toContain(formatDate("2026-10-01T00:00:00"))
  })
})
