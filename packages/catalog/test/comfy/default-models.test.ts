import { isHostedModelId } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { cloudWeights, heldFilesOf } from "#comfy/cloud-weights"
import {
  appTasksOf,
  defaultModelOf,
  isOpenWeights,
  modelsForApp,
} from "#comfy/list-models"
import { modelFactsData } from "#comfy/model-facts"
import {
  heldImageModels,
  imageGraphs,
  openDefaultOf,
} from "#image/image-models"
import { findApp, listApps } from "#list-apps"
import { findWorkflow, type Workflow } from "#list-workflows"

const heldFiles = heldFilesOf()

const closedTasks: readonly string[] = ["video-edit", "three-d"]

const taskApps = listApps().filter((app) => defaultModelOf(app) !== null)

const imageTask = "text-to-image"

const graphPrefix = "graph/"

type Candidate = { model: string; position: number; workflow: Workflow }

function imageGraphsByRank(): Candidate[] {
  return Object.entries(modelFactsData.models)
    .flatMap(([id, row]) => {
      const position = row.ranks[imageTask]
      const model = id.slice(graphPrefix.length)
      const workflow = id.startsWith(graphPrefix)
        ? findWorkflow(`image-${model}`)
        : null
      return position === undefined || row.weights === null || workflow === null
        ? []
        : [{ model, position, workflow }]
    })
    .sort((a, b) => a.position - b.position)
}

function isHeldOnCloud(candidate: Candidate): boolean {
  return candidate.workflow.models.every((file) => heldFiles.has(file))
}

function imageApp(): NonNullable<ReturnType<typeof findApp>> {
  const image = findApp("image")
  if (image === null) {
    throw new Error("the catalog lacks Image")
  }
  return image
}

describe("the model each app opens on", () => {
  it("is held by at least the Image and the Video apps", () => {
    expect(taskApps.map((app) => app.id)).toEqual(
      expect.arrayContaining(["image", "video"])
    )
  })

  it.each(
    taskApps
      .filter((app) => !closedTasks.includes(appTasksOf(app)[0] ?? ""))
      .map((app) => ({ id: app.id, app }))
  )(
    "$id opens on one of its own open-weights graphs, so a run with the defaults calls no hosted model",
    ({ app }) => {
      const opened = defaultModelOf(app) ?? ""
      expect(isHostedModelId(opened)).toBe(false)
      const listed = modelsForApp(app, []).find((one) => one.id === opened)
      expect(listed?.kind).toBe("graph")
      expect(listed !== undefined && isOpenWeights(listed)).toBe(true)
    }
  )

  it("opens Video edit on a hosted model, because no open model holds its edit task, and keeps its open-weights graphs for its other modes", () => {
    const videoEdit = findApp("video-edit")
    if (videoEdit === null) {
      throw new Error("the catalog lacks Video edit")
    }
    expect(appTasksOf(videoEdit)[0]).toBe("video-edit")
    expect(isHostedModelId(defaultModelOf(videoEdit) ?? "")).toBe(true)
    const graphs = modelsForApp(videoEdit, []).filter(
      (one) => one.kind === "graph"
    )
    expect(graphs.length).toBeGreaterThan(0)
    expect(graphs.every(isOpenWeights)).toBe(true)
  })

  it("opens Image on the highest-ranked open-weights graph whose weights Comfy Cloud holds", () => {
    const held = imageGraphsByRank().filter(isHeldOnCloud)
    expect(held[0]?.model).toBe(defaultModelOf(imageApp()))
    expect(defaultModelOf(imageApp())).toBe("z-image-turbo")
    expect(cloudWeights.readOn).toBe("2026-10-29")
    const opened = modelsForApp(imageApp(), []).find(
      (one) => one.id === "z-image-turbo"
    )
    expect(opened?.facts?.scores["text-to-image"]).toMatchObject({
      rank: 39,
      sources: [
        {
          board: "Artificial Analysis Text to Image Arena",
          readOn: "2026-10-26",
        },
        { board: "Arena Text to Image", readOn: "2026-10-26" },
      ],
    })
  })

  it("leaves out of the picker a higher-ranked graph whose weights Comfy Cloud lacks, as it does Ming-Image-0.1-Design", () => {
    const ranked = imageGraphsByRank()
    expect(ranked[0]?.model).toBe("ming-image-0-1-design")
    const lacking = ranked.filter((one) => !isHeldOnCloud(one))
    expect(lacking.map((one) => one.model)).toEqual(["ming-image-0-1-design"])
    const listed = modelsForApp(imageApp(), []).map((one) => one.id)
    for (const one of lacking) {
      expect(listed).not.toContain(one.model)
    }
    expect(listed).toContain("z-image-turbo")
  })

  it("lists Ming-Image-0.1-Design and opens Image on it once Comfy Cloud's object_info holds its three weight files, and keeps its graph in the tree meanwhile", () => {
    const ming = findWorkflow("image-ming-image-0-1-design")
    expect(ming?.models).toHaveLength(3)
    const today = heldImageModels(imageGraphs, heldFiles)
    expect(today.map((one) => one.value)).not.toContain("ming-image-0-1-design")
    expect(openDefaultOf(today)).toBe("z-image-turbo")
    const later = heldImageModels(
      imageGraphs,
      new Set([...heldFiles, ...(ming?.models ?? [])])
    )
    expect(later[0]?.value).toBe("ming-image-0-1-design")
    expect(openDefaultOf(later)).toBe("ming-image-0-1-design")
    const partly = heldImageModels(
      imageGraphs,
      new Set([...heldFiles, ...(ming?.models.slice(0, 2) ?? [])])
    )
    expect(partly.map((one) => one.value)).not.toContain(
      "ming-image-0-1-design"
    )
  })

  it("opens on the open-weights graph the board ranks highest, not on the first one listed, and on the first one listed when the board ranks none", () => {
    const today = heldImageModels(imageGraphs, heldFiles)
    const unranked = today
      .filter((one) => one.value !== "z-image-turbo")
      .reverse()
    expect(unranked.length).toBeGreaterThan(1)
    expect(openDefaultOf(unranked)).toBe(unranked[0]?.value)
    const reordered = [...today].reverse()
    expect(reordered[0]?.value).not.toBe("z-image-turbo")
    expect(openDefaultOf(reordered)).toBe("z-image-turbo")
    const closed = {
      ...modelFactsData,
      models: Object.fromEntries(
        Object.entries(modelFactsData.models).map(([id, row]) => [
          id,
          id === "graph/z-image-turbo" ? { ...row, weights: null } : row,
        ])
      ),
    }
    expect(openDefaultOf(reordered, closed)).toBe(reordered[0]?.value)
  })
})
