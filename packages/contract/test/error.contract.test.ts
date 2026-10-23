import { InvalidArgumentError, NotFoundError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { errorEnvelope, errorEnvelopeOf, inputNamesOf } from "#error.contract"

class SampleNotFoundError extends NotFoundError {
  override readonly code = "SAMPLE_NOT_FOUND"
}

describe("errorEnvelopeOf", () => {
  it("carries the code and status of a project error, and no message", () => {
    const envelope = errorEnvelopeOf(
      new SampleNotFoundError({ message: "sample 7 is not stored" })
    )
    expect(envelope).toEqual({
      error: { code: "SAMPLE_NOT_FOUND", status: 404 },
    })
    expect(errorEnvelope.parse(envelope)).toEqual(envelope)
  })
})

class SampleInputError extends InvalidArgumentError {
  override readonly code = "SAMPLE_INPUT_INVALID"
}

describe("the inputs a refusal names", () => {
  const issues = [
    "mode: the value is not one of the model's choices",
    "inputs.photo: Invalid input: expected array",
    "voiceId: the model needs it",
    'inputs: Unrecognized key: "secretToken"',
    "body: the request is not JSON",
    "aspectRatio: a hosted model sets its own aspect in its inputs",
  ]

  it("names each refused input once, from the part before its colon", () => {
    expect(inputNamesOf([...issues, issues[0] ?? ""])).toEqual([
      "mode",
      "photo",
      "voiceId",
      "aspectRatio",
    ])
  })

  it("puts the names on the wire and never a value or a message", () => {
    const envelope = errorEnvelopeOf(
      new SampleInputError({
        message: "the value photo is not std or pro",
        inputs: inputNamesOf(issues),
      })
    )
    expect(envelope).toEqual({
      error: {
        code: "SAMPLE_INPUT_INVALID",
        status: 400,
        inputs: ["mode", "photo", "voiceId", "aspectRatio"],
      },
    })
    expect(JSON.stringify(envelope)).not.toMatch(/std|secretToken|choices/)
    expect(errorEnvelope.parse(envelope)).toEqual(envelope)
  })

  it("refuses a name that is not an input name", () => {
    const envelope = {
      error: { code: "SAMPLE_INPUT_INVALID", status: 400, inputs: ["a b"] },
    }
    expect(errorEnvelope.safeParse(envelope).success).toBe(false)
  })
})

describe("errorEnvelope", () => {
  it.each(["sample_not_found", "Sample", ""])("refuses the code %j", (code) => {
    const envelope = { error: { code, status: 404 } }
    expect(errorEnvelope.safeParse(envelope).success).toBe(false)
  })

  it("refuses a status that is not an error status", () => {
    const envelope = { error: { code: "SAMPLE_NOT_FOUND", status: 200 } }
    expect(errorEnvelope.safeParse(envelope).success).toBe(false)
  })
})
