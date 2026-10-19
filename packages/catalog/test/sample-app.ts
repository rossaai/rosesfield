import type { AppInput } from "#define-app"

export function sampleApp(id = "sample"): AppInput {
  return {
    id,
    nameKey: "name",
    category: "image",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 2000,
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "16:9"], default: "1:1" },
    },
    engine: { adapter: "sample-engine", config: {} },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  }
}
