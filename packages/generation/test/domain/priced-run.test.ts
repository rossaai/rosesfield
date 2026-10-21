import { describe, expect, it } from "vitest"
import { pricedRunOf } from "#domain/priced-run"
import { modesApp } from "../sample"

function keyOf(inputs: Record<string, string>) {
  return pricedRunOf({
    app: modesApp,
    inputs,
    form: null,
    count: 1,
    aspectRatio: null,
  })
}

describe("the measured price key of a mode that bounds its model", () => {
  it("keys the two modes apart, so one mode's measured cost never prices the other", () => {
    expect(keyOf({ mode: "views", model: "open-views" })).not.toEqual(
      keyOf({ mode: "portrait", model: "open-portrait" })
    )
    expect(keyOf({ mode: "views", model: "open-views" }).model).toBe(
      "open-views"
    )
  })
})
