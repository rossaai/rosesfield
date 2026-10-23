import type { HostedModel } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { cloudWeightsFile, heldFilesOf } from "#comfy/cloud-weights"
import { defaultModelOf, modelsForApp } from "#comfy/list-models"
import { readApps } from "#list-apps"
import { app, threeDApp } from "#three-d/app"
import { pixal3dModels } from "#three-d/comfy/three-d-engine"
import {
  graphModel,
  pixal3dTemplateFiles,
  textModel,
} from "#three-d/three-d-models"

const otherFile = "z_image_turbo_bf16.safetensors"

function recordWith(files: readonly string[]) {
  const has = (file: string): boolean => files.includes(file)
  const keep = (list: readonly string[]): string[] => list.filter(has)
  return cloudWeightsFile.parse({
    source: "GET /api/object_info on Comfy Cloud",
    readOn: "2026-10-22",
    recipe: "the options of each loader's weight input",
    loaders: {
      UNETLoader: {
        input: "unet_name",
        files: [
          otherFile,
          ...keep([
            "pixal3d_int8_convrot.safetensors",
            "trellis_2_int8_convrot.safetensors",
          ]),
        ],
      },
      VAELoader: {
        input: "vae_name",
        files: keep([
          "trellis_2_shape_vae_bf16.safetensors",
          "trellis_2_texture_vae_bf16.safetensors",
        ]),
      },
      CLIPVisionLoader: {
        input: "clip_name",
        files: keep(["dino_v3_L_naf_fp32.safetensors"]),
      },
      LoadMoGeModel: {
        input: "model_name",
        files: keep(["moge_2_vitl_normal_fp16.safetensors"]),
      },
      LoadBackgroundRemovalModel: {
        input: "bg_removal_name",
        files: keep(["birefnet.safetensors"]),
      },
    },
  })
}

const meshy: HostedModel = {
  id: textModel,
  provider: "meshy",
  takes: ["text"],
  makes: ["3d"],
  takesTools: false,
  form: {
    model: textModel,
    fields: [
      {
        kind: "prompt",
        name: "prompt",
        path: "prompt",
        required: true,
        maxLength: 800,
        default: null,
      },
    ],
  },
}

function appFrom(files: readonly string[]) {
  const [listed] = readApps([
    { folder: "three-d", app: threeDApp(heldFilesOf(recordWith(files))) },
  ])
  if (listed === undefined) {
    throw new Error("the record made no 3D app")
  }
  return listed
}

function takesAPhoto(three: ReturnType<typeof appFrom>): boolean {
  const models = modelsForApp(three, [meshy])
  return (
    models.some((model) => model.kind === "graph") ||
    models.some((model) =>
      (model.form ?? []).some(
        (field) => field.kind === "media" && field.media === "image"
      )
    )
  )
}

describe("3D's list of models, from the record of Comfy Cloud's weights", () => {
  it("names the seven files of the template, and the graph loads only files among them", () => {
    expect(pixal3dTemplateFiles).toHaveLength(7)
    expect(new Set(pixal3dTemplateFiles).size).toBe(7)
    for (const file of pixal3dModels) {
      expect(pixal3dTemplateFiles).toContain(file)
    }
  })

  it("lists the Pixal3D graph first and opens on it once a record holds all seven files", () => {
    const three = appFrom(pixal3dTemplateFiles)
    const models = modelsForApp(three, [meshy])
    expect(models[0]).toMatchObject({ id: graphModel, kind: "graph" })
    expect(models.map((model) => model.id)).toContain(textModel)
    expect(three.inputs.map((input) => input.type)).toContain("image")
    expect(defaultModelOf(three)).toBe(graphModel)
    expect(takesAPhoto(three)).toBe(true)
  })

  it.each(pixal3dTemplateFiles.map((missing) => ({ missing })))(
    "lists no graph and takes no photo when the record lacks $missing, and opens on Meshy 7.1",
    ({ missing }) => {
      const three = appFrom(
        pixal3dTemplateFiles.filter((file) => file !== missing)
      )
      expect(modelsForApp(three, [meshy]).map((model) => model.id)).toEqual([
        textModel,
      ])
      expect(three.inputs.map((input) => input.type)).not.toContain("image")
      expect(defaultModelOf(three)).toBe(textModel)
      expect(takesAPhoto(three)).toBe(false)
    }
  )

  it("ships the app the catalog's own record makes, so the graph joins with no change to 3D's code", () => {
    expect(app).toEqual(threeDApp(heldFilesOf()))
    const [listed] = readApps([{ folder: "three-d", app }])
    expect(listed?.id).toBe("three-d")
  })
})

describe("what 3D makes", () => {
  it("makes one mesh, so the run keeps the GLB the model returns", () => {
    expect(appFrom(pixal3dTemplateFiles).output).toEqual({
      kind: "mesh",
      count: { default: 1, max: 1 },
    })
    expect(appFrom([]).output.kind).toBe("mesh")
  })
})
