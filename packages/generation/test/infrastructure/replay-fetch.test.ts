import { describe, expect, it } from "vitest"
import { ReplayFetch } from "./replay-fetch"

const url =
  "https://cloud.comfy.org/api/v2/jobs/7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"

describe("ReplayFetch", () => {
  it("answers each recording once, in the order it was recorded", async () => {
    const replay = new ReplayFetch([
      { method: "GET", url, status: 200, json: { status: "queued" } },
      { method: "GET", url, status: 200, json: { status: "running" } },
    ])
    const first = await replay.fetch(url)
    const second = await replay.fetch(url, { method: "GET" })
    expect(await first.json()).toEqual({ status: "queued" })
    expect(await second.json()).toEqual({ status: "running" })
    expect(replay.unused()).toEqual([])
  })

  it("throws on a request it has no recording for", async () => {
    const replay = new ReplayFetch([
      { method: "GET", url, status: 200, json: {} },
    ])
    await expect(replay.fetch(url, { method: "POST" })).rejects.toThrow(
      `No recording for POST ${url}`
    )
    await replay.fetch(url)
    await expect(replay.fetch(url)).rejects.toThrow(
      `No recording for GET ${url}`
    )
  })

  it("keeps what each request sent", async () => {
    const replay = new ReplayFetch([
      { method: "POST", url, status: 201, json: {} },
    ])
    await replay.fetch(url, {
      method: "POST",
      headers: { "Idempotency-Key": "key-1" },
      body: "{}",
    })
    expect(replay.sent[0]?.headers.get("Idempotency-Key")).toBe("key-1")
    expect(replay.sent[0]?.body).toBe("{}")
  })
})
