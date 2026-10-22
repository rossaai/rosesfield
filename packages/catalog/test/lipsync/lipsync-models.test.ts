import type { AppDefinition, EngineBinding } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import {
  comfyWorkflowAdapter,
  type HostedModel,
  hostedModelOf,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { defaultModelOf, modelsForApp } from "#comfy/list-models"
import { app } from "#lipsync/app"
import { photoWorkflow } from "#lipsync/comfy/photo-workflow"
import { clipModel, graphModel, modeDefaults } from "#lipsync/lipsync-models"
import { readApps } from "#list-apps"
import { findWorkflow, listWorkflows } from "#list-workflows"

function parseLipsync(): AppDefinition {
  const [parsed] = readApps([{ folder: "lipsync", app }])
  if (parsed === undefined) {
    throw new Error("The lipsync app did not parse")
  }
  return parsed
}

const lipsync = parseLipsync()
const photoGraph = findWorkflow(photoWorkflow)?.graph

const wanPattern = /(^|[^a-z])wan|infinite-?talk/i

function hosted(id: string, takes: readonly string[]): HostedModel {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes,
    makes: ["video"],
    form: null,
  }
}

const lipSyncModels: readonly HostedModel[] = [
  hosted("kling/kling-avatar-2-0", ["image", "audio"]),
  hosted("wan/wan-2-6-lip-sync", ["video", "audio"]),
  hosted("fal/wan2-2-s2v-lipsync", ["image", "audio"]),
  hosted(clipModel, ["text", "image", "video", "audio"]),
]

function isBinding(value: unknown): value is EngineBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    "adapter" in value &&
    typeof value.adapter === "string" &&
    "config" in value &&
    typeof value.config === "object"
  )
}

function workflowsIn(value: unknown): EngineBinding[] {
  if (isBinding(value) && value.adapter === comfyWorkflowAdapter) {
    return [value]
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(workflowsIn)
    : []
}

function wanNames(names: readonly string[]): string[] {
  return names.filter((name) => wanPattern.test(name))
}

describe("the Lip sync models", () => {
  it("opens From a photo on the LTX 2.3 graph and From a clip on Dreamina Seedance 2.5", () => {
    expect(defaultModelOf(lipsync)).toBe(graphModel)
    expect(modeDefaults).toEqual({ photo: graphModel, clip: clipModel })
    const photo = resolveBinding(lipsync.engine, {
      mode: "photo",
      model: modeDefaults.photo,
    })
    const clip = resolveBinding(lipsync.engine, {
      mode: "clip",
      model: modeDefaults.clip,
    })
    expect(photo.adapter).toBe(comfyWorkflowAdapter)
    expect(photo.config.workflow).toEqual(photoGraph)
    expect(hostedModelOf(clip)).toBe(clipModel)
  })

  it("refuses a clip run on the graph, which takes only a photo", () => {
    expect(() =>
      resolveBinding(lipsync.engine, { mode: "clip", model: graphModel })
    ).toThrow(/no option is bound to clip/)
  })

  it("lists the graph first and no Wan model in the picker", () => {
    const listed = modelsForApp(lipsync, lipSyncModels)
    expect(listed.map((model) => model.id)).toEqual([
      graphModel,
      clipModel,
      "kling/kling-avatar-2-0",
    ])
    expect(listed[0]?.nameKey).toBe("lipsync.model.ltx23")
    expect(wanNames(listed.map((model) => model.id))).toEqual([])
  })

  it("binds no Wan graph and leaves no InfiniteTalk folder", () => {
    const models = workflowsIn(lipsync.engine).flatMap((binding) => {
      const listed = binding.config.models
      return Array.isArray(listed) ? listed.map(String) : []
    })
    expect(models).toContain("ltx-2.3-22b-dev-fp8.safetensors")
    expect(wanNames(models)).toEqual([])
    const lipsyncFolders = listWorkflows()
      .map((workflow) => workflow.id)
      .filter((id) => id.startsWith("lipsync-"))
    expect(lipsyncFolders).toEqual([photoWorkflow])
    expect(findWorkflow("lipsync-photo-infinitetalk")).toBeNull()
    expect(findWorkflow("lipsync-clip-infinitetalk")).toBeNull()
  })
})

describe("the control of the Wan check", () => {
  it("names the InfiniteTalk files and a Wan model id", () => {
    expect(
      wanNames([
        "wan2.1_infiniteTalk_single_fp16.safetensors",
        "Wan2_1-InfiniTetalk-Single_fp16.safetensors",
        "lipsync-photo-infinitetalk",
        "wan/wan-2-6-lip-sync",
        "ltx-2.3-22b-dev-fp8.safetensors",
      ])
    ).toEqual([
      "wan2.1_infiniteTalk_single_fp16.safetensors",
      "Wan2_1-InfiniTetalk-Single_fp16.safetensors",
      "lipsync-photo-infinitetalk",
      "wan/wan-2-6-lip-sync",
    ])
  })
})
