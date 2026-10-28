import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  hostedBody,
  hostedProblems,
  missingDefaultsOf,
} from "@/screens/app/hosted/hosted-form"
import { shownFormOf } from "@/screens/app/hosted/series-count"

const form: ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: 2500,
    default: null,
  },
  {
    kind: "number",
    name: "n",
    path: "n",
    required: false,
    min: 1,
    max: 9,
    integer: true,
    default: 1,
  },
  {
    kind: "choice",
    name: "resultType",
    path: "result_type",
    required: false,
    options: ["single", "series"],
    default: "single",
  },
  {
    kind: "number",
    name: "seriesAmount",
    path: "series_amount",
    required: false,
    min: 2,
    max: 9,
    integer: true,
    default: 4,
  },
]

function bodyAt(count: number) {
  const shown = shownFormOf(form)
  const inputs = {
    prompt: "a rose",
    ...missingDefaultsOf(shown, { prompt: "a rose" }),
    n: count,
  }
  const values = {
    inputs,
    seedMode: "random" as const,
    count: 1,
    aspectRatio: null,
  }
  return {
    inputs: hostedBody("maker/image-1", shown, values, "image").inputs,
    problems: hostedProblems(shown, values),
  }
}

describe("a form with its own count beside a series switch and a series count", () => {
  it("shows one count, the model's own count from one", () => {
    const counts = shownFormOf(form).filter((field) => field.kind === "number")
    expect(counts).toEqual([form[1]])
  })

  it("sends one image as that count at one, with the switch at its single result and no series count", () => {
    expect(bodyAt(1)).toEqual({
      inputs: {
        model: "maker/image-1",
        prompt: "a rose",
        n: 1,
        resultType: "single",
      },
      problems: [],
    })
  })

  it("sends several images as that count, with the switch still at its single result", () => {
    expect(bodyAt(3).inputs).toEqual({
      model: "maker/image-1",
      prompt: "a rose",
      n: 3,
      resultType: "single",
    })
  })
})
