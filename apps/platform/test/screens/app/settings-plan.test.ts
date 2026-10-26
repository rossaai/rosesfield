import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { formatDuration } from "@/copy/format"
import {
  controlOf,
  fieldOptionsOf,
  fieldSettingsPlan,
  fieldValueText,
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

const named = (name: string) => ({
  name,
  role: null,
  place: name === "seed" ? ("advanced" as const) : ("show" as const),
})

function toggle(name: string): ModelField {
  return { name, path: name, required: false, kind: "toggle", default: false }
}

describe("the settings plan", () => {
  it("files a setting its key places under Advanced there, and leaves a hidden one out of both lists", () => {
    const plan = settingsPlanOf(["seed", "style", "fancyKnob"], (name) => ({
      ...named(name),
      place: name === "fancyKnob" ? "hidden" : named(name).place,
    }))
    expect(plan.main).toEqual(["style"])
    expect(plan.advanced).toEqual(["seed"])
  })

  it("orders the main settings aspect, then count, then style, whatever order the model publishes them in", () => {
    const plan = settingsPlanOf(["style", "count", "aspect"], named)
    expect(plan.main).toEqual(["aspect", "count", "style"])
  })

  it("reads a model's fields through the table: a size ranks as a resolution, the seed sits under Advanced, and a service tier, a watermark and a field nobody knows are never shown", () => {
    const plan = fieldSettingsPlan([
      choice("serviceTier", ["default", "flex"]),
      number("n"),
      choice("size", ["1024x1024", "2048x2048"]),
      choice("aspectRatio", ["1:1", "16:9"]),
      toggle("watermark"),
      number("topK"),
      number("seed"),
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
    expect(plan.advanced.map((field) => field.name)).toEqual(["seed"])
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

  it("draws every choice that is no on or off pair as a dropdown, at any count of options", () => {
    for (const choices of [
      options("Draft", "Final"),
      options("1K", "2K", "4K"),
      options("1K", "2K", "4K", "8K"),
      options("1K", "2K", "4K", "8K", "16K"),
      options("As in the photo", "Plain"),
    ]) {
      expect(controlOf({ kind: "choice", options: choices })).toBe("select")
    }
  })

  it("shows a length as its value with its unit, and any other value as it is", () => {
    const duration: Extract<ModelField, { kind: "choice" }> = {
      name: "duration",
      path: "duration",
      required: false,
      kind: "choice",
      options: ["5", "10"],
      default: null,
    }
    expect(fieldOptionsOf(duration).map((one) => one.label)).toEqual([
      formatDuration(5),
      formatDuration(10),
    ])
    expect(fieldValueText(number("duration"), 4)).toBe(formatDuration(4))
    expect(fieldValueText(number("steps"), 4)).toBe("4")
    expect(fieldValueText(choice("resolution", ["720p"]), "720p")).toBe("720p")
  })
})
