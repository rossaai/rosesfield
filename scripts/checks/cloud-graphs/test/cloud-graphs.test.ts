import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  graphsUnder,
  readSnapshot,
  readWeights,
  refusalsOf,
  type Snapshot,
} from "../check-cloud-graphs"

const here = fileURLToPath(new URL("..", import.meta.url))
const workflows = fileURLToPath(
  new URL("../../../../workflows", import.meta.url)
)

const sample: Snapshot = {
  readOn: "2026-10-29",
  nodes: {
    UNETLoader: { unet_name: "@UNETLoader.unet_name", weight_dtype: "COMBO" },
    PackLoader: { model: "STRING" },
  },
  lists: { "UNETLoader.unet_name": ["a.safetensors"] },
}

describe("bun run cloud:check", () => {
  it("refuses each planted graph for its one planted defect, the control", async () => {
    const [snapshot, weights] = await Promise.all([
      readSnapshot(),
      readWeights(),
    ])
    const planted = await graphsUnder(join(here, "planted"))
    const reasons = Object.fromEntries(
      planted.map(({ path, graph }) => [
        path.split("/")[0],
        refusalsOf(graph, snapshot, weights).map((one) => one.reason),
      ])
    )
    expect(reasons).toEqual({
      "unknown-class": ["Comfy Cloud has no node PlantedSamplerThatCloudLacks"],
      "unknown-file": [
        "unet_name loads planted_weights_cloud_lacks.safetensors, which Comfy Cloud does not list for UNETLoader and packages/catalog/src/comfy/cloud-weights.json does not hold",
      ],
      "unknown-input": ["UNETLoader takes no input planted_input"],
    })
  })

  it("passes every graph under workflows/", async () => {
    const [snapshot, weights] = await Promise.all([
      readSnapshot(),
      readWeights(),
    ])
    const graphs = await graphsUnder(workflows)
    expect(graphs.length).toBeGreaterThan(30)
    const refused = graphs.flatMap(({ path, graph }) =>
      refusalsOf(graph, snapshot, weights).map(
        (one) => `${path} node ${one.node}: ${one.reason}`
      )
    )
    expect(refused).toEqual([])
  })

  it("takes a file held in cloud-weights.json for its loader, and refuses a weight file on a text input it does not hold", () => {
    const weights = {
      loaders: { PackLoader: { input: "model", files: ["b.safetensors"] } },
    }
    const graph = (node: string, inputs: Record<string, unknown>) => ({
      "1": { class_type: node, inputs },
    })
    expect(
      refusalsOf(
        graph("UNETLoader", { unet_name: "a.safetensors", weight_dtype: "x" }),
        sample,
        weights
      )
    ).toEqual([])
    expect(
      refusalsOf(
        graph("PackLoader", { model: "b.safetensors" }),
        sample,
        weights
      )
    ).toEqual([])
    expect(
      refusalsOf(
        graph("PackLoader", { model: "c.safetensors" }),
        sample,
        weights
      )
    ).toHaveLength(1)
    expect(
      refusalsOf(graph("PackLoader", { model: ["2", 0] }), sample, weights)
    ).toEqual([])
    expect(refusalsOf({ "1": { inputs: {} } }, sample, weights)).toHaveLength(1)
  })
})
