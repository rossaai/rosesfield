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

  it("keeps the seed last and the format settings first", () => {
    expect(settingOf("seed", null).group).toBe("last")
    expect(settingOf("aspect", null).group).toBe("format")
    expect(settingOf("movement", null).group).toBe("content")
  })
})
