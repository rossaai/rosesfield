import { describe, expect, it } from "vitest"
import { appDefinition } from "#app.contract"
import { appWith, type Inputs, modeApp } from "./rule-apps"

describe("the definition of a condition", () => {
  const mode = modeApp.inputs[0]

  function problemsOf(inputs: Inputs): string[] {
    const result = appDefinition.safeParse(appWith(inputs))
    return result.success ? [] : result.error.issues.map((one) => one.message)
  }

  it("names an input declared before it", () => {
    expect(
      problemsOf([
        {
          type: "prompt",
          name: "target",
          labelKey: "inputs.target",
          presence: "optional",
          maxLength: 80,
          when: [{ input: "mode", is: ["object"] }],
        },
        ...(mode === undefined ? [] : [mode]),
      ])
    ).toEqual([
      "A condition names mode, which is not an input declared before it",
    ])
  })

  it("names a value the choice offers", () => {
    expect(
      problemsOf([
        ...(mode === undefined ? [] : [mode]),
        {
          type: "prompt",
          name: "target",
          labelKey: "inputs.target",
          presence: "optional",
          maxLength: 80,
          when: [{ input: "mode", is: ["scene"] }],
        },
      ])
    ).toEqual(["A condition names scene, which mode does not offer"])
  })

  it("asks whether an asset input is filled, never a choice", () => {
    expect(
      problemsOf([
        ...(mode === undefined ? [] : [mode]),
        {
          type: "prompt",
          name: "target",
          labelKey: "inputs.target",
          presence: "optional",
          maxLength: 80,
          when: [{ input: "mode", state: "filled" }],
        },
      ])
    ).toEqual([
      "A condition on whether mode is filled needs an asset or character input",
    ])
  })

  it("keeps bounds inside the input's own options and steps", () => {
    const onSecond = [{ input: "model", is: ["second-model"] }]
    const problems = problemsOf([
      {
        type: "choice",
        name: "model",
        labelKey: "inputs.model",
        options: [
          { value: "first-model", labelKey: "model.first" },
          { value: "second-model", labelKey: "model.second" },
        ],
        default: "first-model",
      },
      {
        type: "number",
        name: "length",
        labelKey: "inputs.length",
        min: 2,
        max: 10,
        step: 1,
        default: 5,
        bounds: [{ when: onSecond, min: 2.5, max: 5 }],
      },
      {
        type: "choice",
        name: "resolution",
        labelKey: "inputs.resolution",
        options: [
          { value: "480p", labelKey: "resolution.p480" },
          { value: "720p", labelKey: "resolution.p720" },
        ],
        default: "720p",
        bounds: [{ when: onSecond, values: ["1080p"] }],
      },
    ])
    expect(problems).toEqual([
      "A bound sits between min and max, on multiples of step",
      "A bound offers only the input's options",
    ])
  })

  it("keeps a choice that fixes the count out of every condition", () => {
    expect(
      problemsOf([
        ...(mode === undefined ? [] : [mode]),
        {
          type: "choice",
          name: "views",
          labelKey: "inputs.views",
          options: [
            { value: "one", labelKey: "views.one", count: 1 },
            { value: "four", labelKey: "views.four", count: 4 },
          ],
          default: "one",
          when: [{ input: "mode", is: ["object"] }],
        },
      ])
    ).toEqual(["A choice that fixes the count applies in every case"])
  })
})
