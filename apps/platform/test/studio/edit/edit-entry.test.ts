import { describe, expect, it } from "vitest"
import { appsTaking } from "@/catalog/app-facts"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { taskAppOf } from "@/screens/app/hosted/task-app"
import { editToolId, shownTools } from "@/studio/edit/edit-tools"

const graphModel = "qwen-image-edit-2511"
const hostedModel = "bfl/flux-3-image"

describe("Edit in the catalog", () => {
  it("opens the Edit tab first in the tool row, at its own address", () => {
    expect(findCatalogApp(editToolId)?.id).toBe(editToolId)
    const [first] = shownTools(findCatalogApp)
    expect(first?.tool.id).toBe(editToolId)
  })

  it("opens Edit on Qwen Image Edit 2511, with FLUX 3 Image one choice away", () => {
    expect(taskAppOf(editToolId)?.defaultModel).toBe(graphModel)
    const model = findCatalogApp(editToolId)?.inputs.find(
      (input) => input.name === "model"
    )
    const options =
      model?.type === "choice" ? model.options.map((one) => one.value) : []
    expect(options).toEqual([graphModel, hostedModel])
  })

  it("offers Edit in Use in for an image of the library", () => {
    const ids = appsTaking(catalogApps, "image").map((app) => app.id)
    expect(ids).toContain(editToolId)
  })
})
