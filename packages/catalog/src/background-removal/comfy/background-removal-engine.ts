import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Model = "birefnet" | "lucida"

type FlatColor = "white" | "black"

export const backgroundRemovalAspectRatios = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]

const modelFiles: Readonly<Record<Model, string>> = {
  birefnet: "birefnet.safetensors",
  lucida: "lucida.safetensors",
}

const colors: Readonly<Record<FlatColor, number>> = {
  white: 16_777_215,
  black: 0,
}

function shared(model: Model): WorkflowValueBinding[] {
  return [
    { from: "input", name: "image", index: 0, to: "image" },
    {
      from: "input",
      name: "model",
      map: { [model]: modelFiles[model] },
      to: "model",
    },
  ]
}

function withModel(binding: EngineBinding, model: Model): EngineBinding {
  return {
    ...binding,
    config: { ...binding.config, models: [modelFiles[model]] },
  }
}

function transparent(model: Model): EngineBinding {
  return withModel(
    workflowBinding({
      workflow: "background-removal-transparent",
      bindings: shared(model),
    }),
    model
  )
}

function flat(color: FlatColor, model: Model): EngineBinding {
  return withModel(
    workflowBinding({
      workflow: "background-removal-solid-color",
      bindings: [
        ...shared(model),
        {
          from: "input",
          name: "background",
          map: { [color]: colors[color] },
          to: "color",
        },
      ],
    }),
    model
  )
}

function byModel(make: (model: Model) => EngineBinding): EngineBinding {
  return selectBinding({
    input: "model",
    options: { birefnet: make("birefnet"), lucida: make("lucida") },
  })
}

export const backgroundRemovalEngine: EngineBinding = selectBinding({
  input: "background",
  options: {
    transparent: byModel(transparent),
    white: byModel((model) => flat("white", model)),
    black: byModel((model) => flat("black", model)),
  },
})
