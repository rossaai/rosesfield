import { describe, expect, it } from "vitest"
import { InvalidIdError } from "#error/invalid-id.error"
import { appIdFormat } from "#id/app.id"
import { runIdFormat } from "#id/run.id"
import { thrownBy } from "../thrown-by"

const uuid = "0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f"

describe("IdFormat", () => {
  it("returns a lowercase UUID as a run id", () => {
    expect(runIdFormat.parse(uuid)).toBe(uuid)
  })

  it.each([
    "",
    "run-1",
    uuid.toUpperCase(),
    `${uuid} `,
    "0b8f3c2e5a4d4c1b9e7f2d6a8b9c0e1f",
  ])("refuses %j as a run id", (value) => {
    expect(() => runIdFormat.parse(value)).toThrow(InvalidIdError)
  })

  it("refuses with the INVALID_ID code and status 400", () => {
    const error = thrownBy(() => runIdFormat.parse("run-1"))
    expect(error).toBeInstanceOf(InvalidIdError)
    expect(error).toMatchObject({ code: "INVALID_ID", status: 400 })
  })

  it.each(["image", "video-edit", "upscale2"])(
    "accepts %j as an app id",
    (value) => {
      expect(appIdFormat.parse(value)).toBe(value)
    }
  )

  it.each(["Image", "video_edit", "video-", "-video", "video--edit", "2d"])(
    "refuses %j as an app id",
    (value) => {
      expect(() => appIdFormat.parse(value)).toThrow(InvalidIdError)
    }
  )

  it("answers is() when detached from its format", () => {
    const { is } = runIdFormat
    expect(is(uuid)).toBe(true)
    expect(is(42)).toBe(false)
  })
})
