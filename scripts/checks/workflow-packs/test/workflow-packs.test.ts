import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  type CloudPacks,
  graphsUnder,
  plantedRefusals,
  readCloudPacks,
  refusalsOf,
  registryIdOf,
} from "../check-workflow-packs"

const workflows = fileURLToPath(
  new URL("../../../../workflows", import.meta.url)
)

const sample: CloudPacks = {
  readOn: "2026-11-02",
  packs: {
    AudioAmplify: "ComfyUI_AudioTools",
    BlockifyMask: "ComfyUI-KJNodes",
  },
}

function graphOf(node: string, declared: readonly string[] = []) {
  return {
    path: "x/x.api.json",
    graph: { "1": { class_type: node, inputs: {} } },
    declared,
  }
}

describe("bun run packs:check", () => {
  it("refuses the guide graph as on main at its three undeclared pack nodes, the control", async () => {
    const refused = await plantedRefusals(await readCloudPacks())
    expect(refused).toEqual([
      "guide-on-main/guide-on-main.api.json node 359",
      "guide-on-main/guide-on-main.api.json node 360",
      "guide-on-main/guide-on-main.api.json node 361",
    ])
  })

  it("passes every graph under workflows/, the fixed guide among them", async () => {
    const cloud = await readCloudPacks()
    const graphs = await graphsUnder(workflows)
    expect(graphs.length).toBeGreaterThan(30)
    expect(
      graphs.find((graph) => graph.path.startsWith("motion-guide-ltx-2-5/"))
        ?.declared
    ).toEqual(["comfyui-wanvideowrapper", "comfyui_audiotools"])
    const refused = graphs.flatMap((graph) =>
      refusalsOf(graph, cloud).map(
        (one) => `${graph.path} node ${one.node}: ${one.reason}`
      )
    )
    expect(refused).toEqual([])
  })

  it("names the undeclared pack by its registry id, and passes a core node and a declared pack", () => {
    expect(refusalsOf(graphOf("AudioAmplify"), sample)).toEqual([
      {
        node: "1",
        reason:
          "AudioAmplify comes from the pack comfyui_audiotools, which requiresCustomNodes of entry.json does not declare",
      },
    ])
    expect(refusalsOf(graphOf("SaveVideo"), sample)).toEqual([])
    expect(
      refusalsOf(graphOf("BlockifyMask", ["comfyui-kjnodes"]), sample)
    ).toEqual([])
  })

  it("reads a pack's registry id from its folder on Comfy Cloud", () => {
    expect(registryIdOf("ComfyUI-WanVideoWrapper")).toBe(
      "comfyui-wanvideowrapper"
    )
    expect(registryIdOf("bfsnodes")).toBe("comfyui-bfsnodes")
  })
})
