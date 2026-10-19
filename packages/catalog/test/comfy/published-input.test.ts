import { appDefinition } from "@rosesfield/contract"
import { type HostedModel, taskBinding } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { publishedInputOf } from "#comfy/published-input"

function appWith(defaultModel: string) {
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
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    },
    engine: taskBinding({
      tasks: ["text-to-video"],
      input: "model",
      default: defaultModel,
      fallback: { adapter: "demo", config: {} },
    }),
    limits: { timeoutSeconds: 60, maxRetries: 0 },
  })
}

const clip: HostedModel = {
  id: "maker/clip-1",
  provider: "maker",
  takes: ["text"],
  makes: ["video"],
  form: {
    model: "maker/clip-1",
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
  },
}

describe("publishedInputOf", () => {
  it("publishes the default model's form for an app that declares a task", () => {
    const schema = publishedInputOf(appWith("maker/clip-1"), [clip])
    expect(
      schema.safeParse({ inputs: { prompt: "a fox", resolution: "480P" } })
        .success
    ).toBe(true)
    expect(
      schema.safeParse({ inputs: { prompt: "a fox", count: 3 } }).success
    ).toBe(false)
    expect(
      schema.safeParse({ inputs: { prompt: "a fox", length: 5 } }).success
    ).toBe(false)
    expect(
      schema.safeParse({ inputs: { prompt: "a fox" }, count: 3 }).success
    ).toBe(true)
  })

  it("publishes the app's own inputs while the default model has no form", () => {
    const schema = publishedInputOf(appWith("maker/clip-1"), [])
    expect(
      schema.safeParse({ inputs: { prompt: "a fox", length: 5 } }).success
    ).toBe(true)
    expect(
      schema.safeParse({ inputs: { prompt: "a fox", resolution: "480P" } })
        .success
    ).toBe(false)
  })
})
