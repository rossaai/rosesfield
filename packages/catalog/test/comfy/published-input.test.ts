import { appDefinition } from "@rosesfield/contract"
import {
  checkModelInputs,
  type HostedModel,
  type ModelForm,
  taskBinding,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { z } from "zod"
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
  takesTools: false,
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

const clipForm: ModelForm = clip.form ?? { model: clip.id, fields: [] }

describe("publishedInputOf", () => {
  it("publishes the default model's form for an app that declares a task", () => {
    const schema = publishedInputOf(appWith("maker/clip-1"), [clipForm])
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

  it("accepts exactly the inputs the run's own check accepts", () => {
    const form: ModelForm = {
      model: "maker/clip-1",
      fields: [
        ...clipForm.fields,
        {
          kind: "choice",
          name: "duration",
          path: "duration",
          required: false,
          options: [5, 10],
          default: 5,
        },
        {
          kind: "number",
          name: "steps",
          path: "steps",
          required: false,
          min: 1,
          max: 50,
          integer: true,
          step: 2,
          default: null,
        },
      ],
    }
    const schema = publishedInputOf(appWith("maker/clip-1"), [form])
    const cases: [Record<string, unknown>, boolean][] = [
      [{ prompt: "a fox", resolution: "480P" }, true],
      [{ prompt: "a fox", resolution: "480p" }, false],
      [{ prompt: "a fox", duration: "10" }, true],
      [{ prompt: "a fox", duration: 10 }, true],
      [{ prompt: "a fox", steps: "3" }, false],
      [{ prompt: "a fox", steps: 3 }, false],
      [{ prompt: "a fox", steps: 4 }, true],
      [{ prompt: "a fox", resolution: "" }, true],
      [{ prompt: "a fox", steps: "" }, true],
      [{ prompt: "" }, false],
    ]
    expect(JSON.stringify(z.toJSONSchema(schema, { io: "input" }))).toContain(
      '"multipleOf":2'
    )
    for (const [inputs, accepted] of cases) {
      const published = schema.safeParse({ inputs }).success
      const checked = checkModelInputs(form, inputs).kind === "valid"
      expect([inputs, published]).toEqual([inputs, accepted])
      expect([inputs, checked]).toEqual([inputs, accepted])
    }
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
