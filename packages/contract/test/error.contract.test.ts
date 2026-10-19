import { NotFoundError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { errorEnvelope, errorEnvelopeOf } from "#error.contract"

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
