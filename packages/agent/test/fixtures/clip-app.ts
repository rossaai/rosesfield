import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { type ModelForm, taskBinding } from "@rosesfield/generation/bindings"

export const clipModel = "maker/clip-1"

export const clipForm: ModelForm = {
  model: clipModel,
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["480P", "768P"],
      default: "768P",
    },
  ],
}

export function clipApp(): AppDefinition {
  return appDefinition.parse({
    id: "clips",
    nameKey: "name",
    category: "video",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 100,
      },
      {
        type: "number",
        name: "length",
        labelKey: "inputs.length",
        min: 2,
        max: 5,
        step: 1,
        default: 5,
      },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    },
    engine: taskBinding({
      tasks: ["text-to-video"],
      input: "model",
      default: clipModel,
      fallback: { adapter: "demo", config: {} },
    }),
    limits: { timeoutSeconds: 60, maxRetries: 0 },
  })
}
