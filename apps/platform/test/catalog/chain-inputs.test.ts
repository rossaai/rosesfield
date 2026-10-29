import { type Run, run } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { assetInputFor, promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runHeadline, runOutputName } from "@/pieces/run/run-facts"
import { defaultsOf } from "@/screens/app/app-form"
import { withPrompt } from "@/screens/app/form-fill"

function motion() {
  const app = findCatalogApp("motion")
  if (app === null) {
    throw new Error("Motion is not in the catalog")
  }
  return app
}

const id = (n: number) =>
  assetIdFormat.parse(`${n}c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f`)

function draftOf(inputs: Run["inputs"]): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    appId: "motion",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "9:16",
    seed: 3,
    outputs: [id(9)],
    progress: 1,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-29T10:00:00.000Z",
    finishedAt: "2026-10-29T10:01:00.000Z",
  })
}

describe("an input a run chain fills is never the person's own", () => {
  it("leaves Motion's own prompt, photo and video as the ones a screen, a placed file and a prompt fill", () => {
    const app = motion()
    expect(promptInputOf(app)?.name).toBe("scene")
    expect(assetInputFor(app, "image")?.name).toBe("photo")
    expect(assetInputFor(app, "video")?.name).toBe("clip")
    const filled = withPrompt(app, defaultsOf(app), "replace the man")
    expect(filled.inputs.scene).toBe("replace the man")
    expect(filled.inputs.plannedScene).not.toBe("replace the man")
  })

  it("names a draft by your own prompt and never by the scene the plan wrote", () => {
    const draft = draftOf({
      example: "own",
      model: "ltx-2-5-guide",
      firstFrame: [id(1)],
      guide: [id(2)],
      mask: [id(3)],
      plannedScene: "The video as it is, with each thing changed.",
      scene: "replace the man",
      resolution: "480p",
    })
    expect(runOutputName(draft)).toContain("replace the man")
    expect(runHeadline(draft)).not.toContain("each thing changed")
    expect(
      runOutputName(draftOf({ ...draft.inputs, scene: "" }))
    ).not.toContain("each thing changed")
  })
})
