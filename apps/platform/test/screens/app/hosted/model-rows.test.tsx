import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import type { ModelFacts } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { formatDate } from "@/copy/format"
import { t } from "@/copy/t"
import { modelRowsOf, type RowModel } from "@/screens/app/hosted/model-rows"

const source = join(import.meta.dirname, "../../../../src")

const callers = [
  "screens/app/hosted/catalog-picker.tsx",
  "screens/app/bar/model-settings.tsx",
  "studio/ads/ads-model-picker.tsx",
  "screens/app/hosted/agent-model-picker.tsx",
  "gallery/entries/reference-create.tsx",
]

const builder = "screens/app/hosted/model-rows.tsx"

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const rowFields =
  /\bcapabilities:\s|import \{[^}]*\bModelRow\b[^}]*\} from "@rosesfield\/ui\/components\/model-row"/

describe("every model picker's rows", () => {
  it("come from the one row builder in each of the five pickers, and no other file writes a row", () => {
    for (const caller of callers) {
      const text = readFileSync(join(source, caller), "utf8")
      expect(text, caller).toMatch(
        /import \{[^}]*\bmodelRowsOf\b[^}]*\} from "@\/screens\/app\/hosted\/model-rows"/
      )
      expect(text, caller).toMatch(/<ModelPicker\b/)
      expect(text, caller).toMatch(/words=\{pickerWords\(\)\}/)
    }
    const writers = sourceFiles(source)
      .filter((file) => rowFields.test(readFileSync(file, "utf8")))
      .map((file) => relative(source, file))
    expect(writers).toEqual([builder])
  })
})

const facts: ModelFacts = {
  lab: "Maker Lab",
  release: "2026-10-20",
  weights: "https://huggingface.co/maker/one",
  lineKey: null,
  scores: {
    "text-to-image": {
      score: 90,
      rank: 2,
      order: 2,
      of: 9,
      sources: [
        {
          board: "Picture Arena",
          url: "https://boards.example/pictures",
          readOn: "2026-10-26",
          display: "allowed",
        },
      ],
      tiers: ["bestValue"],
    },
  },
}

function modelOf(id: string, change: Partial<RowModel> = {}): RowModel {
  return {
    id,
    name: id,
    lab: "Maker Lab",
    keywords: ["Maker"],
    task: "text-to-image",
    facts,
    tags: [
      { kind: "proven" },
      { kind: "hosted" },
      { kind: "open-weights" },
      { kind: "references", max: 16 },
      { kind: "sound" },
    ],
    ...change,
  }
}

describe("a model row", () => {
  it("holds in its caption only what the model can do, and no release date, lab or Ran in Rosesfield", () => {
    const [row] = modelRowsOf([modelOf("maker/one")], { today: "2026-10-26" })
    const caption = row?.capabilities.map((one) => one.label) ?? []
    expect(caption).toEqual([
      t("model.tag.sound"),
      t("model.tag.references", { max: 16 }),
    ])
    const text = caption.join(" ")
    expect(text).not.toContain(formatDate("2026-10-20T00:00:00"))
    expect(text).not.toContain("2026")
    expect(text).not.toContain("Maker Lab")
    expect(text).not.toContain("Ran in")
    expect(text).not.toContain("Hosted")
  })

  it("carries the rank for the picker's main task with its boards' note, New, Best value and Open weights with its page", () => {
    const [row] = modelRowsOf([modelOf("maker/one")], { today: "2026-10-26" })
    expect(row?.rank).toEqual({
      place: 2,
      label: "#2",
      note: t("model.picker.rankFrom", {
        boards: "Picture Arena",
        date: formatDate("2026-10-26T00:00:00"),
      }),
    })
    expect(row?.badges.map((badge) => badge.kind)).toEqual([
      "new",
      "value",
      "openWeights",
    ])
    expect(row?.badges.at(-1)?.href).toBe("https://huggingface.co/maker/one")
  })

  it("carries no rank for a model no board holds for the task", () => {
    const rows = modelRowsOf(
      [
        modelOf("maker/one"),
        modelOf("maker/two"),
        modelOf("maker/edit", { task: "image-edit", facts: undefined }),
      ],
      { today: "2026-10-26" }
    )
    expect(rows.find((row) => row.id === "maker/edit")).not.toHaveProperty(
      "rank"
    )
    expect(
      rows.find((row) => row.id === "maker/edit")?.capabilities[0]?.label
    ).toBe(t("model.task.imageEdit"))
  })
})
