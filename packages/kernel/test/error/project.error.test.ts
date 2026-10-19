import { describe, expect, it } from "vitest"
import { InvalidAspectRatioError } from "#error/invalid-aspect-ratio.error"
import { InvalidIdError } from "#error/invalid-id.error"
import {
  ConflictError,
  DependencyError,
  InvalidArgumentError,
  NotFoundError,
  PreconditionFailedError,
  ProjectError,
  RateLimitedError,
} from "#error/project.error"

class SampleInvalidError extends InvalidArgumentError {
  override readonly code = "SAMPLE_INVALID"
}

class SampleNotFoundError extends NotFoundError {
  override readonly code = "SAMPLE_NOT_FOUND"
}

class SampleConflictError extends ConflictError {
  override readonly code = "SAMPLE_CONFLICT"
}

class SamplePreconditionError extends PreconditionFailedError {
  override readonly code = "SAMPLE_PRECONDITION"
}

class SampleRateLimitedError extends RateLimitedError {
  override readonly code = "SAMPLE_RATE_LIMITED"
}

class SampleDependencyError extends DependencyError {
  override readonly code = "SAMPLE_DEPENDENCY"
}

const message = "the sample failed"

describe("ProjectError", () => {
  it.each([
    { error: new SampleInvalidError({ message }), status: 400 },
    { error: new SampleNotFoundError({ message }), status: 404 },
    { error: new SampleConflictError({ message }), status: 409 },
    { error: new SamplePreconditionError({ message }), status: 412 },
    { error: new SampleRateLimitedError({ message }), status: 429 },
    { error: new SampleDependencyError({ message }), status: 502 },
  ])("gives $error.name the status $status", ({ error, status }) => {
    expect(error.status).toBe(status)
    expect(error).toBeInstanceOf(ProjectError)
  })

  it("keeps the code, the message and the class name", () => {
    const error = new SampleNotFoundError({ message })
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("SAMPLE_NOT_FOUND")
    expect(error.message).toBe(message)
    expect(error.name).toBe("SampleNotFoundError")
  })

  it("keeps the cause it wraps and sets none when there is none", () => {
    const cause = new TypeError("fetch failed")
    expect(new SampleDependencyError({ message, cause }).cause).toBe(cause)
    expect("cause" in new SampleDependencyError({ message })).toBe(false)
  })

  it("carries the seconds to wait when rate limited, and null when unknown", () => {
    const known = new SampleRateLimitedError({ message, retryAfterSeconds: 30 })
    const unknown = new SampleRateLimitedError({ message })
    expect(known.retryAfterSeconds).toBe(30)
    expect(unknown.retryAfterSeconds).toBeNull()
  })

  it("gives each kernel error a SCREAMING_SNAKE code", () => {
    const codes = [
      new InvalidIdError({ name: "run id", value: "x" }).code,
      new InvalidAspectRatioError({ text: "x" }).code,
    ]
    for (const code of codes) {
      expect(code).toMatch(ProjectError.codePattern)
    }
  })

  it.each(["run_not_found", "RUN-NOT-FOUND", "_RUN", "RUN__NOT"])(
    "refuses %j as a code",
    (code) => {
      expect(code).not.toMatch(ProjectError.codePattern)
    }
  )
})
