import { describe, expect, it } from "vitest"
import { ListRunsHandler } from "#application/list-runs/list-runs.handler"
import { audioApp, imageApp } from "../sample"
import { harnessFor, startImage } from "./harness"

describe("ListRunsHandler", () => {
  it("lists runs newest first and pages with the cursor it returns", async () => {
    const harness = harnessFor()
    const total = ListRunsHandler.pageSize + 2
    const started = []
    for (let index = 0; index < total; index += 1) {
      started.push(await startImage(harness))
      harness.clock.advance(1000)
    }
    const first = await harness.list.execute({ appId: null, cursor: null })
    expect(first.runs).toHaveLength(ListRunsHandler.pageSize)
    expect(first.runs[0]?.id).toBe(started.at(-1))
    expect(first.next).not.toBeNull()
    const second = await harness.list.execute({
      appId: null,
      cursor: first.next,
    })
    expect(second.runs.map((run) => run.id)).toEqual([started[1], started[0]])
    expect(second.next).toBeNull()
  })

  it("lists only the runs of one app when asked", async () => {
    const harness = harnessFor({ apps: [imageApp(), audioApp()] })
    await startImage(harness)
    await harness.start.execute({
      appId: "sample-audio",
      body: { inputs: { script: "hello" } },
      idempotencyKey: null,
      seed: null,
    })
    const { runs } = await harness.list.execute({
      appId: "sample-audio",
      cursor: null,
    })
    expect(runs.map((run) => run.appId)).toEqual(["sample-audio"])
  })

  it.each(["", "12", "abc-1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f", "12-run"])(
    "refuses the cursor %j",
    async (cursor) => {
      await expect(
        harnessFor().list.execute({ appId: null, cursor })
      ).rejects.toMatchObject({ code: "RUN_CURSOR_INVALID", status: 400 })
    }
  )
})
