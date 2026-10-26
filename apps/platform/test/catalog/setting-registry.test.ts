import { listApps } from "@rosesfield/catalog"
import { inputRoleOf } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  isKnownSetting,
  optionIconOf,
  settingOf,
} from "@/catalog/setting-registry"

const settingTypes = new Set(["choice", "number", "toggle", "seed"])

const inputs = listApps().flatMap((app) =>
  app.inputs
    .filter((input) => settingTypes.has(input.type) && input.name !== "model")
    .map((input) => ({ app, input }))
)

describe("the setting registry", () => {
  it("names every setting of every app, so no chip falls back to a glyph with no meaning", () => {
    const unknown = inputs
      .filter(
        ({ app, input }) =>
          !isKnownSetting(input.name, inputRoleOf(input.name, app.output.kind))
      )
      .map(({ app, input }) => `${app.id}.${input.name}`)
    expect(unknown).toEqual([])
  })

  it("pictures every option of a setting whose options are pictured", () => {
    const missing = inputs.flatMap(({ app, input }) =>
      input.type !== "choice" ||
      optionIconOf(input.name, input.options[0]?.value ?? "") === undefined
        ? []
        : input.options
            .filter(
              (option) => optionIconOf(input.name, option.value) === undefined
            )
            .map((option) => `${app.id}.${input.name}.${option.value}`)
    )
    expect(missing).toEqual([])
  })

  it("puts the seed and every unknown setting under Advanced and the format settings first", () => {
    expect(settingOf("seed", null).group).toBe("advanced")
    expect(settingOf("someNewKnob", null).group).toBe("advanced")
    expect(settingOf("aspect", null).group).toBe("format")
    expect(settingOf("movement", null).group).toBe("content")
  })

  it("ranks aspect before resolution and quality, then length, then count, then the content settings", () => {
    const ranks = [
      "aspect",
      "resolution",
      "quality",
      "length",
      "count",
      "style",
    ].map((name) => settingOf(name, null).rank)
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it("files service tier under Advanced in every spelling the catalog uses", () => {
    for (const name of ["serviceTier", "service_tier", "ServiceTier"]) {
      expect(settingOf(name, null).group, name).toBe("advanced")
      expect(isKnownSetting(name, null), name).toBe(true)
    }
  })
})
