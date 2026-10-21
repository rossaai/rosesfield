import { resolveBinding } from "@rosesfield/generation"
import type { HostedModel } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listApps } from "#list-apps"
import { findWorkflow, listWorkflows } from "#list-workflows"
import {
  both,
  fileGraph,
  type Graph,
  graphSchema,
  motion,
  motionWorkflowId,
} from "./motion-replay"

const removedWorkflows = [
  "motion-wan-animate-2",
  "recast-character-scail-2",
  "recast-object-wan-vace",
]

function hosted(id: string, takes: string[]): HostedModel {
  const provider = id.split("/")[0] ?? ""
  return { id, provider, takes, makes: ["video"], form: null }
}

function inputOf(graph: Graph, id: string, name: string): unknown {
  return graph[id]?.inputs[name]
}

function boundGraph(sound: "on" | "off"): Graph {
  const binding = resolveBinding(motion.engine, { ...both, sound })
  return graphSchema.parse(binding.config.workflow)
}

describe("the motion graph", () => {
  it("declares the motion transfer and character swap tasks and opens on the LTX 2.3 control graph", () => {
    expect(appTasksOf(motion)).toEqual(["motion-transfer", "character-swap"])
    expect(defaultModelOf(motion)).toBe("ltx-2-3-control")
    const binding = resolveBinding(motion.engine, { ...both, sound: "off" })
    expect(binding.config.models).toEqual(
      findWorkflow(motionWorkflowId)?.models
    )
  })

  it("lists the LTX 2.3 control graph first, then each Router model named for a task, and no Wan, reference or other video model", () => {
    const listed = modelsForApp(motion, [
      hosted("wan/wan2.2-animate", ["image", "video"]),
      hosted("higgsfield/higgsfield-genjutsu-motion-transfer-v1.0", [
        "image",
        "video",
      ]),
      hosted("kling/kling-v3-motion-control", ["image", "video"]),
      hosted("lab/lab-character-swap-v1", ["image", "video"]),
      hosted("ltx/ltx-2-3-pro", ["image"]),
    ])
    expect(listed.map((one) => [one.id, one.kind, one.task])).toEqual([
      ["ltx-2-3-control", "graph", "motion-transfer"],
      ["kling/kling-v3-motion-control", "hosted", "motion-transfer"],
      ["lab/lab-character-swap-v1", "hosted", "character-swap"],
    ])
    expect(listed[0]?.nameKey).toBe("motion.model.ltx23")
  })

  it("loads no Wan file, and the Wan Animate 2, SCAIL-2 and Wan VACE graphs and the Recast app are gone", () => {
    const motionFiles = findWorkflow(motionWorkflowId)?.models ?? []
    const wanFiles = motionFiles.filter((file) => /wan|scail|vace/i.test(file))
    expect(motionFiles).toHaveLength(5)
    expect(wanFiles).toEqual([])
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids.filter((id) => removedWorkflows.includes(id))).toEqual([])
    expect(listApps().map((app) => app.id)).not.toContain("recast")
  })

  it("puts your photo as the first frame and drives it with the pose guide of the clip through the IC-LoRA", () => {
    const graph = fileGraph()
    expect(inputOf(graph, "198", "image")).toEqual(["200", 0])
    expect(inputOf(graph, "115", "image")).toEqual(["719", 0])
    expect(inputOf(graph, "115", "iclora_parameters")).toEqual(["196", 0])
    expect(inputOf(graph, "719", "image1")).toEqual(["712", 0])
    expect(inputOf(graph, "707", "input")).toEqual(["706", 0])
    expect(inputOf(graph, "706", "video")).toEqual(["692", 0])
    expect(inputOf(graph, "692", "video")).toEqual(["199", 0])
    expect(graph["712"]?.class_type).toBe("SDPoseDrawKeypoints")
    expect(inputOf(graph, "709", "max_detections")).toBe(1)
  })

  it("renders 8 n + 1 frames and cuts the video back to the clip's frame count at the clip's frame rate", () => {
    const graph = fileGraph()
    expect(inputOf(graph, "108", "length")).toEqual(["716", 1])
    expect(inputOf(graph, "101", "frames_number")).toEqual(["716", 1])
    expect(inputOf(graph, "716", "values.a")).toEqual(["713", 2])
    expect(inputOf(graph, "713", "image")).toEqual(["706", 0])
    expect(inputOf(graph, "724", "image")).toEqual(["105", 0])
    expect(inputOf(graph, "724", "batch_index")).toBe(0)
    expect(inputOf(graph, "724", "length")).toEqual(["713", 2])
    expect(inputOf(graph, "122", "images")).toEqual(["724", 0])
    expect(inputOf(graph, "122", "fps")).toEqual(["706", 2])
    expect(inputOf(graph, "109", "frame_rate")).toEqual(["706", 2])
    expect(inputOf(graph, "68", "format")).toBe("mp4")
  })

  it("carries the clip's sound with Keep the clip's sound on and no audio track with it off", () => {
    expect(inputOf(boundGraph("on"), "122", "audio")).toEqual(["706", 1])
    expect(boundGraph("off")["122"]?.inputs).not.toHaveProperty("audio")
    expect(inputOf(boundGraph("off"), "122", "images")).toEqual(["724", 0])
  })
})
