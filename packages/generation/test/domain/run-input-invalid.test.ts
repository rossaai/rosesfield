import { errorEnvelopeOf } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { RunInputInvalidError } from "#domain/error/run-input-invalid.error"

describe("a refused run on the wire", () => {
  it("names the input the gateway refused", () => {
    const error = new RunInputInvalidError({
      appId: "lipsync",
      issues: ["mode: the value is not one of the model's choices"],
    })
    expect(errorEnvelopeOf(error)).toEqual({
      error: { code: "RUN_INPUT_INVALID", status: 400, inputs: ["mode"] },
    })
  })

  it("control: names no input when no issue names one", () => {
    const error = new RunInputInvalidError({
      appId: "lipsync",
      issues: ["body: the request is not JSON"],
    })
    expect(errorEnvelopeOf(error)).toEqual({
      error: { code: "RUN_INPUT_INVALID", status: 400 },
    })
  })
})
