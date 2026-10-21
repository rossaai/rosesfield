import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { modelToOpen, tabOfModel } from "@/studio/three-d/use-three-d-screen"
import {
  graph,
  hunyuan,
  meshy6,
  meshy71,
  threeDApp,
} from "./three-d-models"

const app = threeDApp()
const models = [hunyuan, meshy6, meshy71, graph]

function hostedWith(
  chosen: CatalogModel | null,
  defaultModel: string | null = null
): HostedState {
  return {
    isTaskApp: true,
    models,
    isLoading: false,
    error: null,
    keyState: "valid",
    defaultModel,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: [],
    choose: () => undefined,
  }
}

describe("the model each 3D tab opens on", () => {
  it("opens From an image on the graph when the app's default is a text model", () => {
    const hosted = hostedWith(meshy71, meshy71.id)
    expect(modelToOpen(hosted, "image", app, null)).toBe("pixal3d-trellis-2")
  })

  it("opens From text on Meshy 7.1 when the graph was chosen", () => {
    const hosted = hostedWith(graph, graph.id)
    expect(modelToOpen(hosted, "text", app, null)).toBe("meshy/meshy-7.1")
  })

  it("returns to the model you picked in a tab before", () => {
    const hosted = hostedWith(graph)
    expect(modelToOpen(hosted, "text", app, "meshy/meshy-6")).toBe(
      "meshy/meshy-6"
    )
  })

  it("keeps the chosen model while the tab lists it", () => {
    expect(modelToOpen(hostedWith(hunyuan), "image", app, null)).toBeNull()
    expect(modelToOpen(hostedWith(meshy6), "text", app, null)).toBeNull()
  })

  it("moves to the tab of a model a run used", () => {
    expect(tabOfModel(meshy6, app, "image")).toBe("text")
    expect(tabOfModel(graph, app, "text")).toBe("image")
    expect(tabOfModel(undefined, app, "text")).toBe("text")
  })
})
