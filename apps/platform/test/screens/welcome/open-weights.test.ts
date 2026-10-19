import type { Workflow } from "@rosesfield/catalog/workflows"
import { listWorkflows } from "@rosesfield/catalog/workflows"
import { describe, expect, it } from "vitest"
import { appWorkflows } from "@/catalog/app-workflows"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { modelRowsOf, openModels } from "@/screens/welcome/open-weights"

function workflowLoading(id: string, models: readonly string[]): Workflow {
  const [first] = listWorkflows()
  if (first === undefined) {
    throw new TypeError("The catalog lists no workflow")
  }
  return { ...first, id, models }
}

describe("modelRowsOf", () => {
  it("lists each model with the apps whose workflows load it", () => {
    const image = findCatalogApp("image")
    const upscale = findCatalogApp("upscale")
    if (image === null || upscale === null) {
      throw new TypeError("The catalog lacks Image or Upscale")
    }
    const rows = modelRowsOf([image, upscale], (appId) =>
      appId === "image"
        ? [workflowLoading("one", ["z_image_turbo_bf16.safetensors"])]
        : [workflowLoading("two", ["RealESRGAN_x4plus.safetensors"])]
    )
    expect(
      rows.map((row) => [row.model.id, row.apps.map((app) => app.id)])
    ).toEqual([
      ["z-image-turbo", ["image"]],
      ["real-esrgan", ["upscale"]],
    ])
  })
})

describe("the open-weights list", () => {
  it("names only files a workflow in the catalog loads", () => {
    const loaded = new Set(listWorkflows().flatMap((one) => one.models))
    const stale = openModels.filter(
      (model) => !model.files.some((file) => loaded.has(file))
    )
    expect(stale.map((model) => model.id)).toEqual([])
  })

  it("reaches the workflows an app runs through its bindings", () => {
    const ids = appWorkflows("image").map((workflow) => workflow.id)
    expect(ids).toEqual(
      expect.arrayContaining(["image-qwen-image-2512", "image-z-image-turbo"])
    )
    const nested = appWorkflows("video").map((workflow) => workflow.id)
    expect(nested).toEqual(
      expect.arrayContaining([
        "video-ltx-2-5-text",
        "video-ltx-2-5-start-frame",
      ])
    )
    const rows = modelRowsOf(catalogApps, appWorkflows)
    const ltx = rows.find((row) => row.model.id === "ltx-2-5")
    expect(ltx?.apps.map((app) => app.id)).toContain("video")
    expect(ltx?.apps.map((app) => app.id)).not.toContain("effects")
  })
})
