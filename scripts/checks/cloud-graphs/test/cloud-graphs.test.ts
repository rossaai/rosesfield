import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  type Cloud,
  type Graph,
  graphsUnder,
  readSnapshot,
  readWeights,
  refusalsOf,
} from "../check-cloud-graphs"

const here = fileURLToPath(new URL("..", import.meta.url))
const workflows = fileURLToPath(
  new URL("../../../../workflows", import.meta.url)
)

const sample: Cloud = {
  snapshot: {
    readOn: "2026-10-29",
    nodes: {
      UNETLoader: ["unet_name", "weight_dtype"],
      PackLoader: ["model"],
    },
    fileInputs: { "UNETLoader.unet_name": "UNETLoader.unet_name" },
    lists: { "UNETLoader.unet_name": ["a.safetensors"] },
  },
  weights: {
    loaders: { PackLoader: { input: "model", files: ["b.safetensors"] } },
  },
}

async function realCloud(): Promise<Cloud> {
  const [snapshot, weights] = await Promise.all([readSnapshot(), readWeights()])
  return { snapshot, weights }
}

function graphOf(
  node: string,
  inputs: Record<string, unknown>,
  runsOn: Graph["runsOn"] = "cloud-and-local"
): Graph {
  return {
    path: "x/x.api.json",
    graph: { "1": { class_type: node, inputs } },
    runsOn,
  }
}

describe("bun run cloud:check", () => {
  it("refuses each planted graph for its one planted defect, and skips the file test only for a graph declared local-only, the control", async () => {
    const cloud = await realCloud()
    const planted = await graphsUnder(join(here, "planted"))
    const reasons = Object.fromEntries(
      planted.map((graph) => [
        graph.path.split("/")[0],
        refusalsOf(graph, cloud).map((one) => one.reason),
      ])
    )
    expect(reasons).toEqual({
      "local-only": ["UNETLoader takes no input planted_input"],
      "unknown-class": ["Comfy Cloud has no node PlantedSamplerThatCloudLacks"],
      "unknown-file": [
        "unet_name loads planted_weights_cloud_lacks.safetensors, which Comfy Cloud does not list for UNETLoader and packages/catalog/src/comfy/cloud-weights.json does not hold",
      ],
      "unknown-input": ["UNETLoader takes no input planted_input"],
    })
  })

  it("passes every graph under workflows/, and reads local-only from each entry", async () => {
    const cloud = await realCloud()
    const graphs = await graphsUnder(workflows)
    expect(graphs.length).toBeGreaterThan(30)
    const refused = graphs.flatMap((graph) =>
      refusalsOf(graph, cloud).map(
        (one) => `${graph.path} node ${one.node}: ${one.reason}`
      )
    )
    expect(refused).toEqual([])
    expect(
      graphs
        .filter((graph) => graph.runsOn === "local-only")
        .map((graph) => graph.path)
    ).toEqual([
      "image-ming-image-0-1-design/image-ming-image-0-1-design.api.json",
    ])
  })

  it("takes a file held in cloud-weights.json for its loader, and refuses a weight file on a text input it does not hold", () => {
    const refused = (graph: Graph) => refusalsOf(graph, sample).length
    expect(
      refused(
        graphOf("UNETLoader", { unet_name: "a.safetensors", weight_dtype: "x" })
      )
    ).toBe(0)
    expect(refused(graphOf("UNETLoader", { unet_name: "c.safetensors" }))).toBe(
      1
    )
    expect(
      refused(
        graphOf("UNETLoader", { unet_name: "c.safetensors" }, "local-only")
      )
    ).toBe(0)
    expect(refused(graphOf("PackLoader", { model: "b.safetensors" }))).toBe(0)
    expect(refused(graphOf("PackLoader", { model: "c.safetensors" }))).toBe(1)
    expect(refused(graphOf("PackLoader", { model: ["2", 0] }))).toBe(0)
    expect(
      refused({
        path: "x",
        graph: { "1": { inputs: {} } },
        runsOn: "cloud-and-local",
      })
    ).toBe(1)
  })
})
