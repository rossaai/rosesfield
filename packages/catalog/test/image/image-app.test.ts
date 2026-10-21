import {
  type AppDefinition,
  type EngineBinding,
  inputRulesOf,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  hostedModelOf,
  resolveBinding,
} from "@rosesfield/generation"
import { AspectRatio, type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { adsCopy } from "#ads/copy.en"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { app } from "#image/app"
import { imageCopy } from "#image/copy.en"
import { imageModels, referenceModel, resolutionsOf } from "#image/image-models"
import { readApps } from "#list-apps"
import { listWorkflows } from "#list-workflows"
import { videoCopy } from "#video/copy.en"

function readImage(): AppDefinition {
  const [read] = readApps([{ folder: "image", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Image")
  }
  return read
}

const definition = readImage()
const body = startRunBodyFor(definition)

function workflowOf(binding: EngineBinding): unknown {
  return binding.config.workflow
}

function fieldAt(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (current, key) =>
      typeof current === "object" && current !== null && key in current
        ? Object.entries(current).find(([name]) => name === key)?.[1]
        : undefined,
    value
  )
}

const assetId = assetIdFormat.parse("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01")

function referencesFor(model: string, count = 1): { references?: AssetId[] } {
  return model === referenceModel
    ? { references: Array.from({ length: count }, () => assetId) }
    : {}
}

function resolutionsAllowed(model: string): readonly string[] {
  const rule = inputRulesOf(definition, { model }).find(
    (one) => one.input.name === "resolution"
  )
  return rule?.allowed ?? []
}

describe("the Image app", () => {
  it("lists the models that make an image from text and opens on the Z-Image Turbo graph", () => {
    expect(appTasksOf(definition)).toEqual(["text-to-image"])
    expect(defaultModelOf(definition)).toBe("z-image-turbo")
    const opened = resolveBinding(definition.engine, {
      prompt: "a",
      resolution: "1k",
    })
    expect(opened.adapter).toBe(comfyWorkflowAdapter)
    const named = resolveBinding(definition.engine, {
      prompt: "a",
      model: "bfl/flux-3-image",
    })
    expect(hostedModelOf(named)).toBe("bfl/flux-3-image")
  })

  it("publishes as its default the model a run with no model runs", () => {
    const published = fieldAt(z.toJSONSchema(body, { io: "input" }), [
      "properties",
      "inputs",
      "properties",
      "model",
      "default",
    ])
    const approved = body.parse({ inputs: { prompt: "a" } }).inputs
    const ran = resolveBinding(definition.engine, approved)
    expect(published).toBe("z-image-turbo")
    expect(approved.model).toBe(published)
    expect(hostedModelOf(ran)).toBeNull()
    expect(ran.adapter).toBe(comfyWorkflowAdapter)
    expect(defaultModelOf(definition)).toBe(published)
  })

  it("keeps three open-weights graphs, Qwen Image Edit 2511 for your references, and no FLUX.2 Klein 4B graph", () => {
    const graphs = modelsForApp(definition, []).map((model) => model.id)
    expect(graphs).toEqual([
      "z-image-turbo",
      "qwen-image-2512",
      "qwen-image-edit-2511",
    ])
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids).toEqual(
      expect.arrayContaining(["image-z-image-turbo", "image-qwen-image-2512"])
    )
    expect(ids).not.toContain("image-flux-2-klein-4b")
  })

  it("is read by the catalog with its id as its folder", () => {
    expect(definition.id).toBe("image")
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "prompt",
      "model",
      "references",
      "resolution",
      "seed",
    ])
  })

  it("takes a prompt of 2,000 characters, a count of 4 and every format", () => {
    for (const aspectRatio of ["1:1", "4:3", "3:4", "16:9", "9:16"]) {
      const parsed = body.safeParse({
        inputs: { prompt: "a".repeat(2000) },
        count: 4,
        aspectRatio,
      })
      expect(parsed.success, aspectRatio).toBe(true)
    }
    const refused = [
      { inputs: { prompt: "a".repeat(2001) } },
      { inputs: { prompt: "" } },
      { inputs: { prompt: "a" }, count: 5 },
      { inputs: { prompt: "a" }, aspectRatio: "2:1" },
      { inputs: { prompt: "a", model: "a-model-not-bound" } },
      { inputs: { prompt: "a", model: "flux-2-klein-4b" } },
      { inputs: { prompt: "a", model: "nano-banana-2" } },
      { inputs: { prompt: "a", model: "gpt-image-2" } },
      { inputs: { prompt: "a", resolution: "4k" } },
      { inputs: { prompt: "a", references: [assetId] } },
      { inputs: { prompt: "a", model: referenceModel } },
      {
        inputs: {
          prompt: "a",
          model: referenceModel,
          references: [assetId, assetId, assetId, assetId],
        },
      },
      { inputs: { prompt: "a", character: [] } },
      { inputs: { prompt: "a", quality: "final" } },
    ]
    for (const one of refused) {
      expect(body.safeParse(one).success, JSON.stringify(one)).toBe(false)
    }
  })

  it("lets each model take only the resolutions it runs", () => {
    expect(resolutionsAllowed("z-image-turbo")).toEqual(["1k", "2k"])
    expect(resolutionsAllowed("qwen-image-2512")).toEqual(["1k"])
    const ask = (model: string, resolution: string) =>
      body.safeParse({ inputs: { prompt: "a", model, resolution } }).success
    expect(ask("z-image-turbo", "2k")).toBe(true)
    expect(ask("qwen-image-2512", "2k")).toBe(false)
  })

  it("fills the resolution a model runs when the run names none", () => {
    for (const model of imageModels) {
      const { inputs } = body.parse({
        inputs: {
          prompt: "a",
          model: model.value,
          ...referencesFor(model.value),
        },
      })
      expect(inputs.resolution).toBe(resolutionsOf(model)[0])
    }
  })

  it("binds a ComfyUI workflow to every model and resolution the contract allows, and none it refuses", () => {
    const workflows = new Set<unknown>()
    for (const model of imageModels) {
      for (const resolution of ["1k", "2k"]) {
        const isAllowed = resolutionsAllowed(model.value).includes(resolution)
        const inputs = {
          prompt: "a",
          model: model.value,
          resolution,
          ...referencesFor(model.value),
        }
        if (!isAllowed) {
          expect(() => resolveBinding(definition.engine, inputs)).toThrow()
          continue
        }
        const binding = resolveBinding(definition.engine, inputs)
        expect(binding.adapter).toBe(comfyWorkflowAdapter)
        workflows.add(JSON.stringify(workflowOf(binding)))
      }
    }
    expect(workflows.size).toBe(3)
  })

  it("edits up to 3 of your images on Qwen Image Edit 2511 with your words alone, each reference in its own slot", () => {
    for (const count of [1, 2, 3]) {
      const binding = resolveBinding(definition.engine, {
        prompt: "a",
        model: referenceModel,
        resolution: "1k",
        references: Array.from({ length: count }, () => assetId),
      })
      expect(binding.adapter).toBe(comfyWorkflowAdapter)
      const graph = workflowOf(binding)
      const loads = [41, 83, 191].filter((node) =>
        Object.hasOwn(Object(graph), String(node))
      )
      expect(loads).toHaveLength(count)
      expect(fieldAt(graph, ["508", "inputs", "string_b"])).toBe("")
      expect(fieldAt(graph, ["9", "inputs", "filename_prefix"])).toBe(
        "rosesfield-image"
      )
    }
  })

  it("asks for a size within 2% of each format, in steps of 16, within each model's pixel area", () => {
    const ratios =
      definition.output.kind === "image"
        ? [...definition.output.aspectRatios.options].sort()
        : []
    for (const model of imageModels) {
      for (const table of Object.values(model.sizes)) {
        expect(Object.keys(table).sort()).toEqual(ratios)
        for (const [ratio, size] of Object.entries(table)) {
          const wanted = AspectRatio.parse(ratio)
          const asked = size.width / size.height
          const target = wanted.width / wanted.height
          expect(Math.abs(asked - target) / target).toBeLessThan(0.02)
          expect(size.width % 16).toBe(0)
          expect(size.height % 16).toBe(0)
          expect(size.width * size.height).toBeLessThanOrEqual(2048 * 2048)
        }
      }
    }
  })

  it("has a string for every key it names", () => {
    const keys = [
      definition.nameKey,
      "image.line",
      "image.keywords",
      "image.input.prompt.placeholder",
      ...definition.inputs.flatMap((input) => [
        input.labelKey,
        ...(input.type === "choice"
          ? input.options.map((option) => option.labelKey)
          : []),
        ...(input.name === "model" && input.type === "choice"
          ? input.options.map((option) => `${option.labelKey}.line`)
          : []),
      ]),
    ]
    const copy: Record<string, string> = {
      ...imageCopy,
      ...adsCopy,
      ...videoCopy,
    }
    for (const key of keys) {
      expect(copy[key], key).toBeTypeOf("string")
    }
  })
})
