import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { workflowBinding } from "#workflow-binding"

export const upscaleAspectRatios = [
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "16:9",
  "9:16",
  "21:9",
  "9:21",
]

type SeedVr2Model = "seedvr2-3b" | "seedvr2-7b"

const seedvr2Files: Readonly<Record<SeedVr2Model, string>> = {
  "seedvr2-3b": "seedvr2_3b_int8_convrot.safetensors",
  "seedvr2-7b": "seedvr2_7b_int8_convrot.safetensors",
}

const seedvr2Vae = "seedvr2_ema_vae_fp16.safetensors"

type Mode = "image" | "video"

function seedvr2(mode: Mode, model: SeedVr2Model): EngineBinding {
  const binding = workflowBinding({
    workflow: `upscale-${mode}-seedvr2`,
    bindings: [
      { from: "input", name: mode, index: 0, to: mode },
      { from: "input", name: "scale", map: { "2x": 2, "4x": 4 }, to: "scale" },
      { from: "seed", to: "seed" },
      {
        from: "input",
        name: "model",
        map: { [model]: seedvr2Files[model] },
        to: "model",
      },
    ],
  })
  return {
    ...binding,
    config: { ...binding.config, models: [seedvr2Files[model], seedvr2Vae] },
  }
}

function realEsrgan(mode: Mode): EngineBinding {
  return workflowBinding({
    workflow: `upscale-${mode}-real-esrgan`,
    bindings: [
      { from: "input", name: mode, index: 0, to: mode },
      {
        from: "input",
        name: "scale",
        map: { "2x": 0.5, "4x": 1 },
        to: "scale",
      },
    ],
  })
}

function byModel(mode: Mode): EngineBinding {
  return selectBinding({
    input: "model",
    options: {
      "seedvr2-3b": seedvr2(mode, "seedvr2-3b"),
      "seedvr2-7b": seedvr2(mode, "seedvr2-7b"),
      "real-esrgan-4x": realEsrgan(mode),
    },
  })
}

export const upscaleEngine: EngineBinding = selectBinding({
  input: "mode",
  options: { image: byModel("image"), video: byModel("video") },
})
