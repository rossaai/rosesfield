import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  controlOf,
  fieldSettingsPlan,
  settingsPlanOf,
} from "@/screens/app/settings-plan"

function choice(name: string, options: string[]): ModelField {
  return {
    name,
    path: name,
    required: false,
    kind: "choice",
    options,
    default: null,
  }
}

function number(name: string): ModelField {
  return {
    name,
    path: name,
    required: false,
    kind: "number",
    min: 1,
    max: 4,
    integer: true,
    default: 1,
  }
}

const named = (name: string) => ({ name, role: null })

describe("the settings plan", () => {
  it("files a seed and a setting the registry does not know under Advanced", () => {
    const plan = settingsPlanOf(["seed", "style", "fancyKnob"], named)
    expect(plan.main).toEqual(["style"])
    expect(plan.advanced).toEqual(["seed", "fancyKnob"])
  })

  it("orders the main settings aspect, then count, then style, whatever order the model publishes them in", () => {
    const plan = settingsPlanOf(["style", "count", "aspect"], named)
    expect(plan.main).toEqual(["aspect", "count", "style"])
  })

  it("reads a model's fields by their role, so a size ranks as a resolution and a service tier sits under Advanced", () => {
    const plan = fieldSettingsPlan([
      choice("serviceTier", ["auto", "flex"]),
      number("n"),
      choice("size", ["1024x1024", "2048x2048"]),
      choice("aspectRatio", ["1:1", "16:9"]),
      {
        name: "prompt",
        path: "prompt",
        required: true,
        kind: "prompt",
        maxLength: null,
        default: null,
      },
    ])
    expect(plan.main.map((field) => field.name)).toEqual([
      "aspectRatio",
      "size",
      "n",
    ])
    expect(plan.advanced.map((field) => field.name)).toEqual(["serviceTier"])
  })
})

const options = (...labels: string[]) =>
  labels.map((label) => ({ value: label.toLowerCase(), label }))

describe("the control rule", () => {
  it("draws a toggle as a switch and a number as a stepper", () => {
    expect(controlOf({ kind: "toggle" })).toBe("switch")
    expect(controlOf({ kind: "number" })).toBe("stepper")
  })

  it("draws a boolean pair as a switch, in either order and either spelling", () => {
    for (const pair of [
      options("True", "False"),
      options("Off", "On"),
      options("Yes", "No"),
      options("Disabled", "Enabled"),
    ]) {
      expect(controlOf({ kind: "choice", options: pair })).toBe("switch")
    }
  })

  it("keeps a two-option quality choice that is no boolean pair segmented", () => {
    expect(
      controlOf({ kind: "choice", options: options("Draft", "Final") })
    ).toBe("segmented")
  })

  it("draws up to four short options as segments and any other choice as a select", () => {
    expect(
      controlOf({ kind: "choice", options: options("1K", "2K", "4K", "8K") })
    ).toBe("segmented")
    expect(
      controlOf({
        kind: "choice",
        options: options("1K", "2K", "4K", "8K", "16K"),
      })
    ).toBe("select")
    expect(
      controlOf({
        kind: "choice",
        options: options("As in the photo", "Plain"),
      })
    ).toBe("select")
  })
})
