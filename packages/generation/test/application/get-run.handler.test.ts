import { describe, expect, it } from "vitest"
import { harnessFor, startImage } from "./harness"

describe("GetRunHandler", () => {
  it("returns the stored run", async () => {
    const harness = harnessFor()
    const runId = await startImage(harness)
    const { run } = await harness.get.execute({ runId })
    expect(run.id).toBe(runId)
    expect(run.inputs.prompt).toBe("a red door in fog")
  })

  it("refuses an id that is not stored", async () => {
    await expect(
      harnessFor().get.execute({
        runId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
      })
    ).rejects.toMatchObject({ code: "RUN_NOT_FOUND", status: 404 })
  })

  it("refuses a text that is not a run id", async () => {
    await expect(
      harnessFor().get.execute({ runId: "run-1" })
    ).rejects.toMatchObject({ code: "INVALID_ID", status: 400 })
  })
})
