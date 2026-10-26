import { heldFilesOf } from "#comfy/cloud-weights"
import { type AppInput, defineApp } from "#define-app"
import { threeDEngine } from "#three-d/comfy/three-d-engine"
import {
  defaultModelOf,
  graphModel,
  heldGraphs,
  textModel,
} from "#three-d/three-d-models"

type Inputs = AppInput["inputs"]

function photoInputs(graphs: readonly string[]): Inputs {
  return graphs.length === 0
    ? []
    : [
        {
          type: "image",
          name: "image",
          labelKey: "threeD.input.image.label",
          presence: "required",
          max: 1,
        },
      ]
}

export function threeDApp(held: ReadonlySet<string>): AppInput {
  const graphs = heldGraphs(held)
  const defaultModel = defaultModelOf(graphs)
  return defineApp({
    id: "three-d",
    nameKey: "threeD.name",
    category: "image",
    inputs: [
      ...photoInputs(graphs),
      {
        type: "choice",
        name: "model",
        labelKey: "threeD.input.model.label",
        options: [
          ...graphs.map((value) => ({
            value,
            labelKey:
              value === graphModel
                ? "threeD.model.pixal3d"
                : "threeD.model.meshy71",
          })),
          { value: textModel, labelKey: "threeD.model.meshy71" },
        ],
        default: defaultModel,
      },
      { type: "seed", name: "seed", labelKey: "threeD.input.seed.label" },
    ],
    output: { kind: "mesh", count: { default: 1, max: 1 } },
    engine: threeDEngine(defaultModel),
    limits: { timeoutSeconds: 600, maxRetries: 0 },
  })
}

export const app = threeDApp(heldFilesOf())
